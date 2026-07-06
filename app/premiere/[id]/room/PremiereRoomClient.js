"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { db } from "@/firebase";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  setDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  where,
  getDocs,
} from "firebase/firestore";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

const REACTION_OPTIONS = [
  { key: "fire", emoji: "🔥", label: "Fire" },
  { key: "clap", emoji: "👏", label: "Clap" },
  { key: "heart", emoji: "❤️", label: "Heart" },
  { key: "wow", emoji: "😮", label: "Wow" },
  { key: "party", emoji: "🎉", label: "Party" },
];

function getViewerLabel(viewerId, currentUserId) {
  if (!viewerId) return "Guest";
  if (viewerId === currentUserId) return "You";
  return viewerId.slice(0, 8);
}

function getInitials(name = "G") {
  const normalized = String(name).trim();
  if (!normalized) return "GU";
  const parts = normalized.split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export default function PremiereRoomClient() {
  const params = useParams();
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const { user } = useAuth();

  const [premiere, setPremiere] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [lastSent, setLastSent] = useState(0);
  const [pinned, setPinned] = useState(null);

  const [viewerCount, setViewerCount] = useState(0);
  const [viewers, setViewers] = useState([]);
  const [showViewers, setShowViewers] = useState(false);
  const [reactionCounts, setReactionCounts] = useState({});
  const [reactionBurst, setReactionBurst] = useState([]);

  const [isLive, setIsLive] = useState(false);
  const [countdown, setCountdown] = useState("");
  const [postingReaction, setPostingReaction] = useState(false);

  const [hasTicket, setHasTicket] = useState(false);
  const [ticketChecking, setTicketChecking] = useState(true);

  const messageListRef = useRef(null);

  /* FETCH & SUBSCRIBE TO PREMIERE */
  useEffect(() => {
    if (!id) return;

    const docRef = doc(db, "premieres", id);

    const unsubscribe = onSnapshot(docRef, async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setPremiere({ id: snap.id, ...data });
        setNotFound(false);

        // Verify ticket requirements
        if (data.ticketRequired) {
          if (user?.uid) {
            const ticketQuery = query(
              collection(db, "users", user.uid, "tickets"),
              where("premiereId", "==", String(id))
            );
            const ticketSnap = await getDocs(ticketQuery);
            setHasTicket(!ticketSnap.empty);
          } else {
            setHasTicket(false);
          }
        } else {
          setHasTicket(true);
        }
      } else {
        setNotFound(true);
      }
      setTicketChecking(false);
      setLoading(false);
    }, (err) => {
      console.error("Error subscribing to premiere in room:", err);
      setNotFound(true);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id, user?.uid]);

  /* CHECK IF PREMIERE IS LIVE */
  useEffect(() => {
    if (!premiere) return;

    const updateLiveStatus = () => {
      const scheduledTime = premiere.startTime?.toDate?.() || new Date(premiere.startTime);
      const now = new Date();
      const isStatusLive = premiere.status === "live";
      const hasValidSchedule = scheduledTime instanceof Date && !Number.isNaN(scheduledTime.getTime());
      const diff = hasValidSchedule ? scheduledTime - now : null;

      if (isStatusLive || (typeof diff === "number" && diff <= 0)) {
        setIsLive(true);
        setCountdown("");
      } else if (!hasValidSchedule) {
        setIsLive(false);
        setCountdown("TBA");
      } else {
        setIsLive(false);
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        const pad = (num) => String(num).padStart(2, "0");
        setCountdown(`${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`);
      }
    };

    updateLiveStatus();
    const interval = setInterval(updateLiveStatus, 1000);
    return () => clearInterval(interval);
  }, [premiere]);

  /* REGISTER & HEARTBEAT VIEWER */
  useEffect(() => {
    if (!user || !id) return;

    const viewerRef = doc(db, "premiere_viewers", `${id}_${user.uid}`);

    const updateHeartbeat = async () => {
      try {
        await setDoc(viewerRef, {
          premiereId: id,
          userId: user.uid,
          name: user.displayName || user.email || "Viewer",
          photoURL: user.photoURL || "",
          lastActive: new Date(),
        }, { merge: true });
      } catch (err) {
        console.warn("Viewer heartbeat write failed:", err);
      }
    };

    updateHeartbeat();
    const interval = setInterval(updateHeartbeat, 30000);

    return () => {
      clearInterval(interval);
      deleteDoc(viewerRef).catch(() => {});
    };
  }, [user, id]);

  /* TRACK VIEWERS COUNT */
  useEffect(() => {
    if (!id || !user) return;

    const ref = collection(db, "premiere_viewers");

    const unsub = onSnapshot(
      query(ref, where("premiereId", "==", id)),
      (snap) => {
        const now = Date.now();
        const activeViewers = snap.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((v) => {
            const lastActiveTime = v.lastActive?.toDate?.() || new Date(v.lastActive || 0);
            return now - lastActiveTime.getTime() < 90000;
          });

        setViewerCount(activeViewers.length);
        setViewers(activeViewers);
      },
      (err) => {
        console.warn("Viewers listener blocked:", err?.message || err);
      }
    );

    return () => unsub();
  }, [id, user]);

  /* LOAD REACTIONS */
  useEffect(() => {
    if (!id || !user) return;

    const ref = collection(db, "premiere_reactions");
    const unsub = onSnapshot(
      query(ref, where("premiereId", "==", id)),
      (snap) => {
        const counts = {};
        const fresh = [];
        const now = Date.now();

        snap.docs.forEach((d) => {
          const data = d.data();
          const key = data?.type;
          if (!key) return;

          counts[key] = (counts[key] || 0) + 1;

          const created = data?.createdAt?.toDate?.();
          if (created && now - created.getTime() < 4000) {
            fresh.push({
              id: d.id,
              type: key,
              emoji: data.emoji,
            });
          }
        });

        setReactionCounts(counts);
        setReactionBurst(fresh.slice(-10));
      },
      (err) => {
        console.warn("Reactions listener blocked:", err?.message || err);
      }
    );

    return () => unsub();
  }, [id, user]);

  /* LOAD MESSAGES */
  useEffect(() => {
    if (!id || !user) return;

    const ref = collection(db, "premiere_messages");

    const unsub = onSnapshot(
      query(ref, where("premiereId", "==", id)),
      (snap) => {
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        // Sort messages client-side to prevent index errors
        const sorted = data.sort((a, b) => {
          const timeA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
          const timeB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
          return timeA - timeB;
        });

        setMessages(sorted);
        setPinned(sorted.find((m) => m.pinned));
      },
      (err) => {
        console.warn("Messages listener blocked:", err?.message || err);
      }
    );

    return () => unsub();
  }, [id, user]);

  /* SEND MESSAGE */
  const sendMessage = async () => {
    if (!input.trim()) return;
    if (!user) {
      alert("Please login to send messages");
      return;
    }

    const now = Date.now();
    if (now - lastSent < 2000) {
      alert("Slow down…");
      return;
    }

    setLastSent(now);

    try {
      await addDoc(collection(db, "premiere_messages"), {
        premiereId: id,
        text: input,
        name: user.displayName || "User",
        userId: user.uid,
        createdAt: serverTimestamp(),
        pinned: false,
      });

      setInput("");
    } catch (err) {
      console.error("Error sending message:", err);
      alert("Failed to send message");
    }
  };

  /* HANDLE KEY PRESS */
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const sendReaction = async (item) => {
    if (!id || !user || postingReaction) return;
    try {
      setPostingReaction(true);
      await addDoc(collection(db, "premiere_reactions"), {
        premiereId: id,
        type: item.key,
        emoji: item.emoji,
        userId: user.uid,
        name: user.displayName || user.email || "Viewer",
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Error sending reaction:", err);
    } finally {
      setPostingReaction(false);
    }
  };

  useEffect(() => {
    const list = messageListRef.current;
    if (!list) return;

    const distanceFromBottom = list.scrollHeight - list.scrollTop - list.clientHeight;
    if (distanceFromBottom < 120) {
      list.scrollTop = list.scrollHeight;
    }
  }, [messages]);

  const topViewers = useMemo(() => viewers.slice(0, 4), [viewers]);

  /* LOADING STATE */
  if (loading) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center px-4">
        <div className="admin-empty">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            <p>Loading premiere...</p>
          </div>
        </div>
      </div>
    );
  }

  /* NOT FOUND STATE */
  if (notFound || !premiere) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center px-4">
        <div className="admin-surface max-w-md text-center">
          <h1 className="text-4xl font-bold mb-4">404</h1>
          <p className="text-gray-400 mb-6">Premiere not found</p>
          <Link href="/" className="admin-button admin-button-primary">
            Back to Premieres
          </Link>
        </div>
      </div>
    );
  }

  /* LOGIN REQUIRED STATE */
  if (!user) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center px-4">
        <div className="admin-surface max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4">Login Required</h1>
          <p className="text-gray-400 mb-6">Please login to view this premiere</p>
          <Link href="/login" className="admin-button admin-button-primary">
            Login
          </Link>
        </div>
      </div>
    );
  }

  /* TICKET REQUIRED STATE */
  if (premiere.ticketRequired && !hasTicket && !ticketChecking) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center px-4">
        <div className="admin-surface max-w-md text-center p-8 rounded-[2rem] border border-red-500/30 bg-red-950/20 shadow-2xl">
          <h1 className="text-2xl font-black mb-4">Ticket Required</h1>
          <p className="text-gray-300 text-sm mb-6">
            A valid ticket or complimentary code is required to view <strong>{premiere.title}</strong>.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href={`/premiere/${id}/tickets`} className="admin-button admin-button-primary px-6 py-2.5">
              Get Ticket / Redeem
            </Link>
            <Link href="/" className="admin-button admin-button-secondary px-6 py-2.5">
              Go Back
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white relative overflow-hidden px-4 md:px-6 py-4 md:py-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(0,212,255,0.14),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(255,77,141,0.1),_transparent_24%)]" />

      {/* HERO */}
      <div className="relative z-10 rounded-[2rem] border border-white/10 overflow-hidden shadow-[0_14px_90px_rgba(0,0,0,0.35)] mb-6">
        {premiere.bannerImage ? (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${premiere.bannerImage})` }}
            aria-hidden="true"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-r from-[#04070f] via-[#04070f]/85 to-[#04070f]/45" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(0,212,255,0.18),_transparent_30%)]" />

        <div className="relative p-5 md:p-7 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <p className="admin-kicker mb-2">Premiere Room</p>
            <h1 className="text-2xl md:text-4xl font-black tracking-tight">{premiere.title}</h1>
            {premiere.description && (
              <p className="text-sm md:text-base text-gray-200/90 mt-2 max-w-3xl line-clamp-2">{premiere.description}</p>
            )}

            <div className="mt-4 flex items-center gap-3 flex-wrap">
              {isLive ? (
                <span className="admin-chip bg-gradient-to-r from-red-500 to-pink-600 text-white border-0 animate-softPulse">LIVE NOW</span>
              ) : (
                <span className="admin-chip">Starts in {countdown}</span>
              )}
              <span className="admin-chip">{viewerCount} watching</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {topViewers.map((viewer) => (
                <div
                  key={viewer.id}
                  className="w-9 h-9 rounded-full border border-white/30 overflow-hidden bg-white/10"
                  title={getViewerLabel(viewer.id, user?.uid)}
                >
                  {viewer.photoURL ? (
                    <div
                      className="w-full h-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${viewer.photoURL})` }}
                      aria-hidden="true"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white">
                      {getInitials(viewer.name || viewer.id)}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowViewers(!showViewers)}
              className="admin-button admin-button-secondary text-xs cursor-pointer"
            >
              Viewers {viewerCount}
            </button>
          </div>
        </div>
      </div>

      <div className="relative z-10 grid lg:grid-cols-[1.4fr_0.9fr] gap-6">

        {/* VIDEO PLAYER */}
        <div className="relative">
          <div className="glass-card rounded-[2rem] overflow-hidden border border-white/10 aspect-video relative">
            {!isLive ? (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-cover bg-center"
                style={premiere.bannerImage ? { backgroundImage: `url(${premiere.bannerImage})` } : {}}
              >
                <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
                <div className="relative z-10 space-y-4">
                  <span className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-cyan-500/25 border border-cyan-400/30 text-cyan-200 animate-pulse">
                    Upcoming Live Event
                  </span>
                  <h3 className="text-xl md:text-2xl font-black max-w-md">{premiere.title}</h3>
                  <p className="text-sm text-gray-300">This stream will unlock automatically at showtime.</p>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-400 uppercase tracking-widest">Countdown</p>
                    <p className="text-3xl font-black text-cyan-300 font-mono tracking-widest">{countdown || "TBA"}</p>
                  </div>
                </div>
              </div>
            ) : premiere.embedLink ? (
              <iframe
                src={premiere.embedLink}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                No video available
              </div>
            )}

            {reactionBurst.length > 0 && (
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                {reactionBurst.map((item, idx) => (
                  <span
                    key={`${item.id}-${idx}`}
                    className="absolute text-2xl"
                    style={{
                      left: `${12 + (idx % 5) * 16}%`,
                      bottom: `${8 + (idx % 3) * 8}%`,
                    }}
                  >
                    {item.emoji}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 glass-card border border-white/10 rounded-2xl p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-gray-400 mb-3">Live Reactions</p>
            <div className="flex flex-wrap gap-2">
              {REACTION_OPTIONS.map((item) => (
                <button
                  key={item.key}
                  onClick={() => sendReaction(item)}
                  disabled={postingReaction}
                  className="admin-button admin-button-secondary px-3 py-2 text-xs flex items-center gap-2 disabled:opacity-60"
                >
                  <span>{item.emoji}</span>
                  <span>{reactionCounts[item.key] || 0}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* CHAT SECTION */}
        <div className="glass-card border border-white/10 p-4 rounded-[2rem] flex flex-col h-[calc(100vh-11rem)] min-h-[560px] lg:sticky lg:top-4 shadow-[0_12px_60px_rgba(0,0,0,0.22)]">
          <div className="pb-3 mb-3 border-b border-white/10 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Live Chat</p>
              <p className="text-sm text-gray-300">Realtime audience discussion</p>
            </div>
            <span className="admin-chip text-[10px]">{viewerCount} online</span>
          </div>

          {/* PINNED MESSAGE */}
          {pinned && (
            <div className="bg-yellow-600/20 border border-yellow-600/50 p-3 mb-3 rounded-2xl text-sm">
              <p className="text-xs text-yellow-300 font-semibold mb-1">Pinned Message</p>
              <p className="text-yellow-100">{pinned.text}</p>
              <p className="text-xs text-yellow-400 mt-1">— {pinned.name}</p>
            </div>
          )}

          {/* MESSAGES */}
          <div ref={messageListRef} className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2 hide-scrollbar">

            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <p className="text-sm">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className="bg-white/5 p-3 rounded-2xl border border-white/10">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-gray-400 font-semibold">{m.name}</p>
                        {m.isOfficial && (
                          <span className="admin-chip text-[10px] py-0.5">Official</span>
                        )}
                      </div>
                      <p className="text-sm break-words text-gray-100">{m.text}</p>
                    </div>
                    {m.userId === user?.uid && (
                      <span className="text-xs text-gray-500 whitespace-nowrap">(you)</span>
                    )}
                  </div>
                </div>
              ))
            )}

          </div>

          {/* MESSAGE INPUT */}
          <div className="flex gap-2 border-t border-white/10 pt-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message... (Enter to send)"
              className="flex-1 admin-textarea text-sm resize-none h-10"
              rows="1"
            />
            <button onClick={sendMessage} className="admin-button admin-button-primary whitespace-nowrap">
              Send
            </button>
          </div>

        </div>

      </div>

      {/* ACTIVE VIEWERS SIDEBAR */}
      {showViewers && (
        <div className="fixed right-0 top-0 bottom-0 w-80 bg-[#050a18]/95 backdrop-blur-xl border-l border-white/10 p-4 space-y-4 overflow-y-auto z-40 shadow-[0_0_60px_rgba(0,0,0,0.35)]">

          <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-4">
            <h2 className="text-lg font-bold">Active Viewers</h2>
            <button
              onClick={() => setShowViewers(false)}
              className="text-gray-400 hover:text-white text-2xl transition"
            >
              ✕
            </button>
          </div>

          <div className="bg-white/10 border border-white/10 p-3 rounded-2xl mb-4">
            <p className="text-sm font-semibold">Total Viewers: {viewers.length}</p>
          </div>

          {viewers.length === 0 ? (
            <p className="text-gray-400 text-sm">No active viewers</p>
          ) : (
            <div className="space-y-2">
              {viewers.map((viewer) => (
                <div
                  key={viewer.id}
                  className="bg-white/5 border border-white/10 rounded-2xl p-3"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20 bg-white/10">
                      {viewer.photoURL ? (
                        <div
                          className="w-full h-full bg-cover bg-center"
                          style={{ backgroundImage: `url(${viewer.photoURL})` }}
                          aria-hidden="true"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] font-bold">
                          {getInitials(viewer.name || viewer.id)}
                        </div>
                      )}
                    </div>
                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                    <p className="text-xs text-gray-300 break-all flex-1">
                      {viewer.name || getViewerLabel(viewer.id, user?.uid)}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Joined {viewer.joinedAt?.toDate?.().toLocaleTimeString?.() || "just now"}
                  </p>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* OVERLAY WHEN VIEWERS SIDEBAR IS OPEN */}
      {showViewers && (
        <div
          className="fixed inset-0 bg-black/40 z-30"
          onClick={() => setShowViewers(false)}
        />
      )}

    </div>
  );
}
