"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { db } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
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
  const [messages, setMessages] = useState([
    { id: "1", sender: "System", text: `Watch Party room ${roomId} created. Invite friends!`, time: "Just now" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [activeTab, setActiveTab] = useState("chat"); // chat, members
  
  // Simulated WebRTC participants
  const [participants, setParticipants] = useState([
    { name: "You", initial: "Y", isMuted: false, isCameraOff: false, isYou: true, photo: null }
  ]);

  // Load movie data
  useEffect(() => {
    if (!movieParam) {
      setLoading(false);
      return;
    }

    const fetchMovie = async () => {
      try {
        const movieRef = doc(db, "movies", movieParam);
        const movieSnap = await getDoc(movieRef);
        if (movieSnap.exists()) {
          setMovie({ id: movieSnap.id, ...movieSnap.data() });
        }
      } catch (err) {
        console.error("Watch party room movie fetch failed:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMovie();
  }, [movieParam]);

  // Seed mock friends entering after 3s and 7s to make it feel alive!
  useEffect(() => {
    const t1 = setTimeout(() => {
      setParticipants((prev) => [
        ...prev,
        { name: "Rahul C.", initial: "RC", isMuted: true, isCameraOff: false, photo: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde" }
      ]);
      setMessages((prev) => [
        ...prev,
        { id: Math.random().toString(), sender: "System", text: "Rahul C. joined the Watch Party", time: "Now" }
      ]);
    }, 3000);

    const t2 = setTimeout(() => {
      setParticipants((prev) => [
        ...prev,
        { name: "Cinephile Lily", initial: "CL", isMuted: false, isCameraOff: false, photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330" }
      ]);
      setMessages((prev) => [
        ...prev,
        { id: Math.random().toString(), sender: "System", text: "Cinephile Lily joined the Watch Party", time: "Now" }
      ]);
    }, 7000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userLabel = user?.displayName || user?.email?.split("@")[0] || "Critic";
    const newMsg = {
      id: Math.random().toString(),
      sender: userLabel,
      text: chatInput,
      time: "Just now"
    };

    setMessages((prev) => [...prev, newMsg]);
    setChatInput("");

    // Simulate reply from friends
    setTimeout(() => {
      const replies = [
        "Oh I love this scene! 🍿",
        "The sound quality is incredible on this stream.",
        "Wait, did he actually do that stunt?",
        "Yes, the music composing here is top tier!",
        "Who is playing that character?"
      ];
      const randomReply = replies[Math.floor(Math.random() * replies.length)];
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: Math.random() > 0.5 ? "Rahul C." : "Cinephile Lily",
          text: randomReply,
          time: "Just now"
        }
      ]);
    }, 2000);
  };

  const toggleMute = () => {
    setParticipants((prev) =>
      prev.map((p) => (p.isYou ? { ...p, isMuted: !p.isMuted } : p))
    );
  };

  const toggleCamera = () => {
    setParticipants((prev) =>
      prev.map((p) => (p.isYou ? { ...p, isCameraOff: !p.isCameraOff } : p))
    );
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
        <h2 className="text-2xl font-black mb-2">Watch Party Session Expired</h2>
        <p className="text-gray-400 max-w-sm text-sm mb-6">
          This watch party room or movie reference could not be found. Start a new co-watching room below.
        </p>
        <Link href="/watch-party" className="admin-btn text-xs">
          Go back to Lobby
        </Link>
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
              navigator.clipboard.writeText(window.location.href);
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
            <VideoPlayer
              src={movie.videoUrl || "https://assets.mixkit.co/videos/preview/mixkit-cyberpunk-city-street-with-neon-lights-at-night-40156-large.mp4"}
              poster={movie.bannerImage || movie.posterImage}
              title={movie.title}
              movieId={movie.id}
            />
            
            {/* Sync Overlay Warning for non-hosts */}
            {!isHost && (
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] text-cyan-300 font-bold border border-cyan-400/20">
                🔒 Playback Synced with Host
              </div>
            )}
          </div>

          {/* WebRTC Video Feeds Bar */}
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
