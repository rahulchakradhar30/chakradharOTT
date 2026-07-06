"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebase";
import { collection, getDocs, doc, getDoc, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

export default function TriviaClient() {
  const { user } = useAuth();
  const [movies, setMovies] = useState([]);
  const [currentUserXP, setCurrentUserXP] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch catalog movies and subscribe to realtime rankings
  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const moviesSnap = await getDocs(collection(db, "movies"));
        const now = Date.now();
        const moviesList = moviesSnap.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((m) => {
            if (!m.scheduledRelease) return true;
            const releaseTime = m.scheduledRelease.toDate 
              ? m.scheduledRelease.toDate().getTime() 
              : new Date(m.scheduledRelease).getTime();
            return now >= releaseTime;
          });
        setMovies(moviesList);
      } catch (err) {
        console.error("Error loading movies for trivia:", err);
      }
    };
    fetchMovies();

    // Subscribe to users leaderboard list in realtime
    const leaderboardQuery = query(
      collection(db, "users"),
      orderBy("totalXP", "desc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(leaderboardQuery, (snapshot) => {
      const realUsers = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          name: doc.data().displayName || doc.data().email?.split("@")[0] || "Critic",
          xp: doc.data().totalXP || 0,
          photo: doc.data().photoURL || null,
        }))
        .filter((u) => u.xp > 0);

      // Seed mock users to make it feel alive and highly competitive
      const mockUsers = [
        { id: "mock1", name: "CinephileSupreme", xp: 5200, photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb" },
        { id: "mock2", name: "KubrickScorsese", xp: 4800, photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d" },
        { id: "mock3", name: "MarvelGeek", xp: 3900, photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e" },
        { id: "mock4", name: "NolanFanboy", xp: 2600, photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80" },
      ];

      const combined = [...realUsers];

      // Merge mock users
      mockUsers.forEach((mock) => {
        if (!combined.some((u) => u.name === mock.name)) {
          combined.push(mock);
        }
      });

      // Sort descending
      combined.sort((a, b) => b.xp - a.xp);
      setLeaderboard(combined);
      setLoading(false);
    }, (err) => {
      console.error("Leaderboard subscription error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch and subscribe to current user's profile XP in realtime
  useEffect(() => {
    if (!user) {
      setCurrentUserXP((prev) => (prev !== 0 ? 0 : prev));
      return;
    }
    const userRef = doc(db, "users", user.uid);
    const unsubscribeUser = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        setCurrentUserXP(docSnap.data().totalXP || 0);
      }
    });
    return () => unsubscribeUser();
  }, [user]);

  // Determine user rank tier badge
  const getBadgeName = (xp) => {
    if (xp >= 4000) return { title: "Cinephile Grandmaster", color: "from-purple-500 to-indigo-600" };
    if (xp >= 2500) return { title: "Screen Master", color: "from-pink-500 to-rose-600" };
    if (xp >= 1000) return { title: "Trivia Buff", color: "from-cyan-500 to-blue-600" };
    return { title: "Cinema Intern", color: "from-gray-500 to-slate-600" };
  };

  const currentBadge = getBadgeName(currentUserXP);

  if (loading) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center pt-20">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 text-sm">Synchronizing leaderboard arena...</p>
        </div>
      </div>
    );
  }

  // Get podium ranks (1st, 2nd, 3rd)
  const podium = leaderboard.slice(0, 3);
  const scrollBoard = leaderboard.slice(3);

  return (
    <div className="min-h-screen text-white relative pt-24 pb-12 px-4 md:px-8">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-[#04070f] z-0 overflow-hidden">
        <div className="absolute top-10 left-10 w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[130px] animate-pulse" />
        <div className="absolute bottom-10 right-10 w-[600px] h-[600px] rounded-full bg-pink-500/10 blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-12">
        {/* Header summary */}
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="admin-kicker">Gamified Trivia Hub</span>
          <h1 className="text-3xl md:text-5xl font-black bg-gradient-to-r from-yellow-400 via-orange-300 to-pink-400 bg-clip-text text-transparent">
            Trivia Arena & Ranks
          </h1>
          <p className="text-sm text-gray-400">
            Play trivia quizzes on your favorite films, climb global standings, and show off custom credentials.
          </p>
        </div>

        {/* Current user card (if logged in) */}
        {user && (
          <div className="glass-card border border-cyan-500/30 p-6 rounded-[2rem] bg-gradient-to-r from-cyan-900/15 via-[#080d1a] to-[#04070f] max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white font-bold border-2 border-cyan-400/40">
                User
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-cyan-300 font-bold">Your Standings Profile</p>
                <h3 className="text-xl font-black mt-0.5">{user.displayName || user.email?.split("@")[0]}</h3>
                <div className="flex gap-2 items-center mt-1.5">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-gradient-to-r ${currentBadge.color}`}>
                    {currentBadge.title}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-8 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 pl-0 md:pl-8 text-center md:text-left">
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Total XP Score</p>
                <p className="text-3xl font-black text-yellow-400 mt-1">{currentUserXP} XP</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Global Rank</p>
                <p className="text-3xl font-black text-cyan-300 mt-1">
                  #{leaderboard.findIndex((u) => u.id === user.uid) + 1 || "N/A"}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_1.3fr] gap-8">
          {/* Left: Global Leaderboard Podiums & List */}
          <div className="glass-card border border-white/10 rounded-[2.5rem] p-6 flex flex-col">
            <h3 className="text-xl font-black mb-6">Global Standings</h3>

            {/* Top 3 Podium Displays */}
            {podium.length > 0 && (
              <div className="flex justify-center items-end gap-5 mb-8 pt-8 border-b border-white/5 pb-6">
                {/* 2nd Place */}
                {podium[1] && (
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-slate-400 bg-white/10">
                        <img src={podium[1].photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde"} alt="" className="object-cover w-full h-full" />
                      </div>
                      <span className="absolute -top-3 -left-2 text-[10px] bg-slate-500 text-white px-1.5 py-0.5 rounded-full font-black">2</span>
                    </div>
                    <p className="text-xs font-bold text-gray-300 mt-2 truncate max-w-[80px]">{podium[1].name}</p>
                    <span className="text-[10px] text-slate-400 font-extrabold">{podium[1].xp} XP</span>
                    <div className="w-12 h-14 bg-slate-500/10 rounded-t-lg mt-2 flex items-center justify-center font-bold text-xs border-t border-slate-400/40">2nd</div>
                  </div>
                )}

                {/* 1st Place */}
                {podium[0] && (
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <div className="w-18 h-18 rounded-full overflow-hidden border-4 border-yellow-400 bg-white/10 shadow-lg shadow-yellow-500/20">
                        <img src={podium[0].photo || "https://images.unsplash.com/photo-1544005313-94ddf0286df2"} alt="" className="object-cover w-full h-full" />
                      </div>
                      <span className="absolute -top-3 -left-2 text-[10px] bg-yellow-500 text-black px-1.5 py-0.5 rounded-full font-black">1</span>
                    </div>
                    <p className="text-sm font-black text-white mt-2 truncate max-w-[90px]">{podium[0].name}</p>
                    <span className="text-xs text-yellow-400 font-black">{podium[0].xp} XP</span>
                    <div className="w-16 h-20 bg-yellow-500/10 rounded-t-lg mt-2 flex items-center justify-center font-black text-sm border-t border-yellow-400/50">1st</div>
                  </div>
                )}

                {/* 3rd Place */}
                {podium[2] && (
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-amber-600 bg-white/10">
                        <img src={podium[2].photo || "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61"} alt="" className="object-cover w-full h-full" />
                      </div>
                      <span className="absolute -top-3 -left-2 text-[10px] bg-amber-600 text-white px-1.5 py-0.5 rounded-full font-black">3</span>
                    </div>
                    <p className="text-xs font-bold text-gray-300 mt-2 truncate max-w-[80px]">{podium[2].name}</p>
                    <span className="text-[10px] text-amber-500 font-extrabold">{podium[2].xp} XP</span>
                    <div className="w-10 h-10 bg-amber-600/10 rounded-t-lg mt-2 flex items-center justify-center font-bold text-[10px] border-t border-amber-600/40">3rd</div>
                  </div>
                )}
              </div>
            )}

            {/* Scroll list rankings */}
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 hide-scrollbar">
              {scrollBoard.map((runner, index) => {
                const globalRankIdx = index + 4;
                const isUser = runner.id === user?.uid;
                
                return (
                  <div
                    key={runner.id}
                    className={`flex items-center justify-between p-3 rounded-2xl border text-sm transition ${
                      isUser
                        ? "bg-cyan-500/10 border-cyan-400/40"
                        : "bg-white/5 border-white/10 hover:border-white/15"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-gray-400 w-5 text-center">
                        #{globalRankIdx}
                      </span>
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 bg-white/10">
                        <img
                          src={runner.photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde"}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <p className={`font-medium ${isUser ? "text-cyan-300 font-black" : "text-gray-200"}`}>
                        {runner.name} {isUser && <span className="text-[10px] text-cyan-400">(you)</span>}
                      </p>
                    </div>
                    <span className="text-xs font-black text-gray-400">{runner.xp} XP</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Available Movie Quiz Challenges list */}
          <div className="glass-card border border-white/10 rounded-[2.5rem] p-6 space-y-6">
            <div>
              <h3 className="text-xl font-black">Active Trivia Challenges</h3>
              <p className="text-xs text-gray-400 mt-1">Select a title from our library to trigger its quiz board.</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1 hide-scrollbar">
              {movies.length === 0 ? (
                <div className="col-span-2 text-center py-10 text-gray-500 text-sm">
                  No trivia challenges loaded. Add movies in admin panel first!
                </div>
              ) : (
                movies.map((movie) => (
                  <div
                    key={movie.id}
                    className="bg-[#0b0e1a]/95 border border-white/10 rounded-3xl p-4 flex flex-col justify-between hover:border-yellow-400/40 transition duration-300 group"
                  >
                    <div className="space-y-3">
                      <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden border border-white/10 bg-white/5">
                        <Image
                          src={movie.bannerImage || movie.posterImage || "https://images.unsplash.com/photo-1524985069026-dd778a71c7b4"}
                          alt={movie.title}
                          fill
                          className="object-cover group-hover:scale-105 transition duration-500"
                          sizes="(max-width: 768px) 100vw, 300px"
                        />
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-white line-clamp-1">
                          {movie.title}
                        </h4>
                        <p className="text-[10px] text-gray-400 mt-1">
                          {movie.genre || "Action"} • {movie.year || "2026"}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/movie/${movie.id}/quiz`}
                      className="mt-4 block w-full text-center bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-extrabold py-2 rounded-xl transition"
                    >
                      Start Quiz
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
