"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { db } from "@/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import Link from "next/link";

export default function WatchPartyLobby() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const movieParam = searchParams?.get("movie") || "";

  const [movies, setMovies] = useState([]);
  const [selectedMovieId, setSelectedMovieId] = useState(movieParam);
  const [loading, setLoading] = useState(true);
  const [partyCode, setPartyCode] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const snap = await getDocs(collection(db, "movies"));
        const list = snap.docs.map((doc) => ({
          id: doc.id,
          title: doc.data().title || "Untitled",
        }));
        setMovies(list);
        if (!selectedMovieId && list.length > 0) {
          setSelectedMovieId(list[0].id);
        }
      } catch (err) {
        console.error("Failed to load movies for watch party lobby:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMovies();
  }, [selectedMovieId]);

  const handleCreateParty = () => {
    if (!selectedMovieId) return;
    setCreating(true);
    // Generate a random room code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    router.push(`/watch-party/${code}?movie=${selectedMovieId}&host=true`);
  };

  const handleJoinParty = (e) => {
    e.preventDefault();
    if (!partyCode.trim()) return;
    router.push(`/watch-party/${partyCode.trim().toUpperCase()}`);
  };

  return (
    <div className="min-h-screen text-white relative pt-24 pb-12 flex flex-col items-center justify-center px-4 md:px-8">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-[#04070f] z-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-blue-500/10 blur-[160px] animate-pulse" />
        <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[180px]" />
      </div>

      <div className="relative z-10 w-full max-w-4xl grid md:grid-cols-2 gap-8 md:gap-12">
        {/* Left Intro Card */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col justify-center space-y-6"
        >
          <p className="admin-kicker text-cyan-300 text-sm tracking-widest">✦ Version 3.0 Co-Watching</p>
          <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-white via-blue-200 to-cyan-300 bg-clip-text text-transparent leading-[1.1]">
            Watch Parties with Friends
          </h1>
          <p className="text-gray-300 text-sm leading-relaxed">
            Synchronize movies with friends in real time, chat dynamically, and connect via low-latency audio/video feeds directly in the browser. Outperform ordinary streaming feeds.
          </p>
          <div className="flex flex-wrap gap-4 text-xs text-cyan-200 font-semibold">
            <span className="flex items-center gap-1">⚡ Instant Sync</span>
            <span className="flex items-center gap-1">💬 Real-time Chat</span>
            <span className="flex items-center gap-1">🎥 WebRTC Lobbies</span>
          </div>
        </motion.div>

        {/* Right Action Box */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card rounded-[2.5rem] border border-white/10 p-6 md:p-8 bg-[#0b0f1a]/80 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col justify-between"
        >
          {/* Create Party */}
          <div className="space-y-4 pb-6 border-b border-white/10">
            <h3 className="text-xl font-bold">Start a Watch Party</h3>
            <p className="text-xs text-gray-400">Choose a movie and create a synced screening room link for others.</p>
            {loading ? (
              <div className="h-10 bg-white/5 rounded-xl animate-pulse" />
            ) : (
              <select
                value={selectedMovieId}
                onChange={(e) => setSelectedMovieId(e.target.value)}
                className="admin-input focus-ring text-sm w-full"
              >
                {movies.map((m) => (
                  <option key={m.id} value={m.id} className="bg-[#0b0f1a] text-white">
                    {m.title}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={handleCreateParty}
              disabled={creating || loading || movies.length === 0}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-3 px-4 rounded-xl transition duration-300 shadow-lg shadow-cyan-500/20 text-sm flex items-center justify-center gap-2"
            >
              {creating ? "Spinning up Room..." : "Create watch room"}
            </button>
          </div>

          {/* Join Party */}
          <form onSubmit={handleJoinParty} className="space-y-4 pt-6">
            <h3 className="text-xl font-bold">Join an Existing Party</h3>
            <p className="text-xs text-gray-400">Enter the 6-character room code from your friend to jump inside.</p>
            <input
              type="text"
              maxLength={6}
              placeholder="E.g. AX7B9R"
              value={partyCode}
              onChange={(e) => setPartyCode(e.target.value)}
              className="admin-input focus-ring text-sm w-full text-center uppercase tracking-widest text-lg font-bold"
            />
            <button
              type="submit"
              disabled={!partyCode.trim()}
              className="w-full bg-white/10 hover:bg-white/15 text-white font-bold py-3 px-4 rounded-xl transition text-sm flex items-center justify-center"
            >
              Join Watch Party
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
