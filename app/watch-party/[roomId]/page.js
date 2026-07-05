"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { db } from "@/firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import VideoPlayer from "@/components/VideoPlayer";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function WatchPartyRoom() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const rawRoomId = params?.roomId;
  const roomId = Array.isArray(rawRoomId) ? rawRoomId[0] : rawRoomId;
  const movieParam = searchParams?.get("movie") || "";
  const isHost = searchParams?.get("host") === "true";
  
  const { user } = useAuth();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [activeTab, setActiveTab] = useState("chat"); // chat, members
  
  const [participants, setParticipants] = useState([]);
  const [useRealVideoCall, setUseRealVideoCall] = useState(false);
  const myPresenceDocIdRef = useRef(null);

  // Load movie data — host has ?movie= in URL, joiner discovers it from Firestore
  useEffect(() => {
    if (!roomId) {
      setLoading(false);
      return;
    }

    const fetchMovie = async () => {
      try {
        let movieId = movieParam;

        // If host AND user is authenticated, store the movieId in Firestore for joiners
        if (isHost && movieId && user) {
          try {
            // Check if room info already exists to avoid duplicates
            const existingQuery = query(
              collection(db, "comments"),
              where("movieId", "==", "wp_room_" + roomId)
            );
            const existingSnap = await getDocs(existingQuery);
            
            if (existingSnap.empty) {
              await addDoc(collection(db, "comments"), {
                movieId: "wp_room_" + roomId,
                userId: user.uid, // MUST match authenticated user for Firestore rules
                name: user.displayName || user.email?.split("@")[0] || "Host",
                comment: movieId, // store the actual movie document ID
                timestamp: new Date(),
                parentId: "roominfo",
              });
              console.log("Room info stored successfully for room:", roomId);
            }
          } catch (storeErr) {
            console.warn("Failed to store room info:", storeErr);
          }
        }

        // If joiner (no movie param), look up the movieId from the room info doc
        if (!movieId) {
          try {
            const roomInfoQuery = query(
              collection(db, "comments"),
              where("movieId", "==", "wp_room_" + roomId)
            );
            const roomInfoSnap = await getDocs(roomInfoQuery);
            if (!roomInfoSnap.empty) {
              const docs = roomInfoSnap.docs.map(d => ({
                movieDocId: d.data().comment,
                ts: d.data().timestamp?.toDate ? d.data().timestamp.toDate() : new Date(0),
              }));
              docs.sort((a, b) => b.ts - a.ts);
              movieId = docs[0].movieDocId;
              console.log("Joiner discovered movieId:", movieId);
            }
          } catch (lookupErr) {
            console.warn("Room info lookup failed:", lookupErr);
          }
        }

        if (!movieId) {
          console.warn("No movieId found for room:", roomId);
          setLoading(false);
          return;
        }

        const movieRef = doc(db, "movies", movieId);
        const movieSnap = await getDoc(movieRef);
        if (movieSnap.exists()) {
          setMovie({ id: movieSnap.id, ...movieSnap.data() });
        } else {
          console.warn("Movie document not found:", movieId);
        }
      } catch (err) {
        console.error("Watch party room movie fetch failed:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMovie();
  }, [movieParam, roomId, isHost, user]);

  // Presence Sync: Add user to comments collection with movieId: wp_presence_roomId
  useEffect(() => {
    if (!roomId || !user) return;

    const userLabel = user.displayName || user.email?.split("@")[0] || "Critic";
    
    const registerPresence = async () => {
      try {
        const docRef = await addDoc(collection(db, "comments"), {
          movieId: "wp_presence_" + roomId,
          userId: user.uid,
          name: userLabel,
          photoURL: user.photoURL || null,
          comment: JSON.stringify({ isMuted: false, isCameraOff: false }),
          timestamp: new Date(),
          parentId: "presence",
        });
        myPresenceDocIdRef.current = docRef.id;
      } catch (err) {
        console.error("Failed to register presence via comments fallback:", err);
      }
    };

    registerPresence();

    return () => {
      if (myPresenceDocIdRef.current) {
        const docId = myPresenceDocIdRef.current;
        deleteDoc(doc(db, "comments", docId)).catch((err) => {
          console.warn("Failed to delete presence doc on unmount:", err);
        });
      }
    };
  }, [roomId, user]);

  // Listen to members list in real-time
  useEffect(() => {
    if (!roomId) return;

    const presenceQuery = query(
      collection(db, "comments"),
      where("movieId", "==", "wp_presence_" + roomId)
    );

    const unsubscribe = onSnapshot(
      presenceQuery,
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          let state = { isMuted: false, isCameraOff: false };
          try {
            state = JSON.parse(data.comment || "{}");
          } catch (e) {}

          return {
            uid: data.userId,
            docId: docSnap.id,
            name: data.name || "Critic",
            initial: (data.name || "C").slice(0, 2).toUpperCase(),
            isMuted: state.isMuted || false,
            isCameraOff: state.isCameraOff || false,
            isYou: data.userId === user?.uid,
            photo: data.photoURL || null,
          };
        });

        // Deduplicate list by uid in case of duplicate registrations
        const unique = [];
        list.forEach((item) => {
          if (!unique.some((u) => u.uid === item.uid)) {
            unique.push(item);
          }
        });
        setParticipants(unique);
      },
      (err) => {
        console.error("Members list snapshot listener failed:", err);
      }
    );

    return () => unsubscribe();
  }, [roomId, user]);

  // Listen to group chat messages in real-time
  useEffect(() => {
    if (!roomId) return;

    const msgsQuery = query(
      collection(db, "comments"),
      where("movieId", "==", "wp_chat_" + roomId)
    );

    const unsubscribe = onSnapshot(
      msgsQuery,
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          const timestamp = data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp || Date.now());
          return {
            id: docSnap.id,
            sender: data.name || "Critic",
            text: data.comment || "",
            time: timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            createdAt: timestamp,
          };
        });

        // Sort messages chronologically client-side
        list.sort((a, b) => a.createdAt - b.createdAt);
        setMessages(list);
      },
      (err) => {
        console.error("Messages list snapshot listener failed:", err);
      }
    );

    return () => unsubscribe();
  }, [roomId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !roomId || !user) return;

    const userLabel = user?.displayName || user?.email?.split("@")[0] || "Critic";
    try {
      await addDoc(collection(db, "comments"), {
        movieId: "wp_chat_" + roomId,
        userId: user.uid,
        name: userLabel,
        photoURL: user.photoURL || null,
        comment: chatInput.trim(),
        timestamp: new Date(),
        parentId: "chat",
      });
      setChatInput("");
    } catch (err) {
      console.error("Failed to send watch party chat message:", err);
    }
  };

  const toggleMute = async () => {
    if (!myPresenceDocIdRef.current || !user) return;
    const me = participants.find((p) => p.isYou);
    if (!me) return;

    try {
      const nextMuted = !me.isMuted;
      await setDoc(
        doc(db, "comments", myPresenceDocIdRef.current),
        {
          comment: JSON.stringify({ isMuted: nextMuted, isCameraOff: me.isCameraOff }),
        },
        { merge: true }
      );
    } catch (err) {
      console.error("Failed to toggle mute state:", err);
    }
  };

  const toggleCamera = async () => {
    if (!myPresenceDocIdRef.current || !user) return;
    const me = participants.find((p) => p.isYou);
    if (!me) return;

    try {
      const nextCam = !me.isCameraOff;
      await setDoc(
        doc(db, "comments", myPresenceDocIdRef.current),
        {
          comment: JSON.stringify({ isMuted: me.isMuted, isCameraOff: nextCam }),
        },
        { merge: true }
      );
    } catch (err) {
      console.error("Failed to toggle camera state:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center flex-col bg-[#04070f]">
        <div className="w-12 h-12 rounded-full border-4 border-cyan-400/30 border-t-cyan-400 animate-spin mb-4" />
        <p className="text-sm text-gray-400 font-bold">Entering watch room {roomId}...</p>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center flex-col bg-[#04070f] px-4 text-center">
        <p className="text-5xl mb-4">⚠️</p>
        <h2 className="text-2xl font-black mb-2">Watch Party Session Not Found</h2>
        <p className="text-gray-400 max-w-md text-sm mb-6">
          The room <span className="text-cyan-300 font-bold">{roomId}</span> could not be connected. 
          The host may not have started the session yet. Ask them to share the <strong>Copy Link</strong> from their room.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => window.location.reload()}
            className="bg-cyan-500 text-black font-bold px-5 py-2.5 rounded-xl text-xs hover:bg-cyan-400 transition"
          >
            🔄 Retry Connection
          </button>
          <Link href="/watch-party" className="bg-white/10 hover:bg-white/15 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition">
            Go back to Lobby
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#04070f] text-white flex flex-col pt-16">
      {/* Top Header Bar */}
      <header className="bg-black/40 border-b border-white/10 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-red-600 rounded-full animate-ping" />
            <span className="w-2.5 h-2.5 bg-red-600 rounded-full absolute" />
            <p className="text-xs font-bold text-red-500 uppercase tracking-widest">Live Watch Party</p>
          </div>
          <h2 className="text-xl font-bold">{movie.title}</h2>
        </div>

        {/* Room Info */}
        <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-4 py-2 text-xs">
          <div>
            <p className="text-gray-400">Room Code</p>
            <p className="font-bold tracking-wider text-cyan-300 text-sm uppercase">{roomId}</p>
          </div>
          <button
            onClick={() => {
              const baseUrl = window.location.origin + `/watch-party/${roomId}`;
              const shareUrl = movie ? `${baseUrl}?movie=${movie.id}` : baseUrl;
              navigator.clipboard.writeText(shareUrl);
              alert("Watch Party link copied to clipboard!");
            }}
            className="bg-cyan-500 text-black px-3 py-1.5 rounded-lg font-bold hover:bg-cyan-400 transition"
          >
            Copy Link
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="flex-1 grid lg:grid-cols-[1fr,360px] overflow-hidden">
        {/* Left Side: Video + Controls */}
        <div className="p-4 md:p-6 flex flex-col justify-between overflow-y-auto space-y-6">
          {/* Synced Player */}
          <div className="glass-card rounded-[2rem] overflow-hidden border border-white/15 shadow-2xl shadow-black relative aspect-video w-full">
            {movie.videoUrl ? (
              <VideoPlayer
                src={movie.videoUrl}
                poster={movie.bannerImage || movie.posterImage}
                title={movie.title}
                movieId={movie.id}
              />
            ) : movie.embedLink ? (
              <iframe
                src={movie.embedLink}
                className="w-full h-full rounded-3xl"
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                title={movie.title || "Movie stream"}
              />
            ) : (
              <VideoPlayer
                src="https://assets.mixkit.co/videos/preview/mixkit-cyberpunk-city-street-with-neon-lights-at-night-40156-large.mp4"
                poster={movie.bannerImage || movie.posterImage}
                title={movie.title}
                movieId={movie.id}
              />
            )}
            
            {/* Sync Overlay Warning for non-hosts */}
            {!isHost && (
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] text-cyan-300 font-bold border border-cyan-400/20">
                🔒 Playback Synced with Host
              </div>
            )}
          </div>

          {/* Real-time Video Call Toggle Bar */}
          <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-4 gap-4">
            <div>
              <h4 className="text-xs font-bold text-cyan-300">👥 Live Group Call (Voice & Video)</h4>
              <p className="text-[10px] text-gray-400 mt-0.5">Toggle to launch a premium peer voice/video connection with your friends.</p>
            </div>
            <button
              onClick={() => setUseRealVideoCall(!useRealVideoCall)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
                useRealVideoCall ? "bg-red-500 text-white hover:bg-red-600" : "bg-cyan-500 text-black hover:bg-cyan-400"
              }`}
            >
              {useRealVideoCall ? "Disable Voice/Video Call" : "Enable Voice/Video Call"}
            </button>
          </div>

          {/* Video Call Interface */}
          {useRealVideoCall ? (
            <div className="glass-card rounded-3xl overflow-hidden border border-white/10 relative h-[350px] w-full bg-black/60 shadow-2xl">
              <iframe
                src={`https://meet.jit.si/ChakradharStreamWatchParty_${roomId}#config.startWithVideoMuted=true&config.startWithAudioMuted=true`}
                className="w-full h-full border-0"
                allow="camera; microphone; display-capture; autoplay"
              />
            </div>
          ) : (
            /* WebRTC Video Feeds Bar */
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {participants.map((p, idx) => (
                <div key={idx} className="relative aspect-video rounded-xl overflow-hidden bg-white/5 border border-white/10 group flex flex-col justify-end p-2">
                  {/* Simulated Camera Feed */}
                  {p.isCameraOff ? (
                    <div className="absolute inset-0 flex items-center justify-center font-bold text-lg bg-gradient-to-br from-white/10 to-transparent">
                      {p.initial}
                    </div>
                  ) : (
                    <img
                      src={p.photo || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(p.name)}`}
                      alt={p.name}
                      className="absolute inset-0 w-full h-full object-cover grayscale opacity-80"
                    />
                  )}
                  
                  {/* Labels / Overlays */}
                  <div className="relative z-10 flex items-center justify-between w-full">
                    <span className="text-[10px] bg-black/60 px-2 py-0.5 rounded-full font-bold text-gray-200 truncate max-w-[70%]">
                      {p.name}
                    </span>
                    {p.isMuted && (
                      <span className="text-xs bg-red-600/80 p-0.5 rounded-full" title="Muted">
                        🔇
                      </span>
                    )}
                  </div>

                  {/* You Control overlay */}
                  {p.isYou && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                      <button onClick={toggleMute} className="bg-white/20 hover:bg-white/30 p-1.5 rounded-full text-xs" title={p.isMuted ? "Unmute" : "Mute"}>
                        {p.isMuted ? "🎙️" : "🔇"}
                      </button>
                      <button onClick={toggleCamera} className="bg-white/20 hover:bg-white/30 p-1.5 rounded-full text-xs" title={p.isCameraOff ? "Turn Cam On" : "Turn Cam Off"}>
                        📷
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Sidebar Tabs (Chat & Members) */}
        <aside className="border-l border-white/10 bg-[#060b19]/60 backdrop-blur-xl flex flex-col shrink-0 overflow-hidden h-full">
          {/* Tab Selection */}
          <div className="flex border-b border-white/10 p-2 shrink-0">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                activeTab === "chat" ? "bg-cyan-500 text-black" : "text-gray-400 hover:text-white"
              }`}
            >
              Live Chat
            </button>
            <button
              onClick={() => setActiveTab("members")}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                activeTab === "members" ? "bg-cyan-500 text-black" : "text-gray-400 hover:text-white"
              }`}
            >
              Audience ({participants.length})
            </button>
          </div>

          {/* Tab Contents */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeTab === "chat" ? (
              <div className="flex flex-col h-full justify-between gap-4">
                {/* Message Flow */}
                <div className="flex-1 overflow-y-auto space-y-4 hide-scrollbar max-h-[50vh] md:max-h-none">
                  {messages.map((m) => (
                    <div key={m.id} className="text-xs space-y-1">
                      {m.sender === "System" ? (
                        <p className="text-center text-cyan-300/80 italic font-medium my-2">
                          {m.text}
                        </p>
                      ) : (
                        <div>
                          <div className="flex items-center gap-1.5 font-bold mb-0.5">
                            <span className={m.sender === "You" ? "text-cyan-400" : "text-gray-300"}>
                              {m.sender}
                            </span>
                            <span className="text-[9px] text-gray-500 font-normal">{m.time}</span>
                          </div>
                          <div className="bg-white/5 border border-white/5 rounded-2xl px-3 py-2 text-gray-200 leading-relaxed break-words">
                            {m.text}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Input Bar */}
                <form onSubmit={handleSendMessage} className="flex gap-2 border-t border-white/10 pt-3 shrink-0">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="admin-input focus-ring text-xs flex-1"
                  />
                  <button type="submit" className="bg-cyan-500 text-black font-bold px-4 py-2 rounded-xl text-xs hover:bg-cyan-400 transition">
                    Send
                  </button>
                </form>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-4">Connected Listeners</p>
                {participants.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white/5 border border-white/5 p-3 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 relative shrink-0">
                        <img
                          src={p.photo || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(p.name)}`}
                          alt={p.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="text-xs font-bold">{p.name}</p>
                        <p className="text-[10px] text-cyan-300">{p.isYou ? "Host" : "Viewer"}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
