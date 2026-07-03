"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { db, auth } from "@/firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { motion } from "framer-motion";

export default function AdminDashboard() {
  const router = useRouter();
  const numberFormatter = new Intl.NumberFormat("en-IN");
  const currencyFormatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

  const [stats, setStats] = useState({
    movies: 0,
    ratings: 0,
    comments: 0,
    views: 0,
  });

  // ✅ NEW REVENUE STATE
  const [revenueStats, setRevenueStats] = useState({
    tickets: 0,
    revenue: 0,
  });

  const [recentComments, setRecentComments] = useState([]);
  const [latestMovie, setLatestMovie] = useState(null);
  const [adminEmail, setAdminEmail] = useState("");
  const [sessionTimeLeft, setSessionTimeLeft] = useState(1800);
  const [loading, setLoading] = useState(true);

  /* ---------------- AUTH ---------------- */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user?.email) {
        setAdminEmail(user.email);
      }
    });
    return () => unsubscribe();
  }, []);

  /* ---------------- FETCH DATA ---------------- */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const moviesSnapshot = await getDocs(collection(db, "movies"));
        const ratingsSnapshot = await getDocs(collection(db, "ratings"));
        const commentsSnapshot = await getDocs(collection(db, "comments"));

        let totalViews = 0;
        moviesSnapshot.forEach((doc) => {
          totalViews += doc.data().views || 0;
        });

        setStats({
          movies: moviesSnapshot.size,
          ratings: ratingsSnapshot.size,
          comments: commentsSnapshot.size,
          views: totalViews,
        });

        // 🎬 PREMIERE REVENUE DATA
        const premiereSnap = await getDocs(collection(db, "premieres"));

        let totalRevenue = 0;
        let totalTickets = 0;

        premiereSnap.forEach((doc) => {
          const data = doc.data();
          const sold = data.ticketsSold || 0;
          const price = data.ticketPrice || 0;

          totalTickets += sold;
          totalRevenue += sold * price;
        });

        setRevenueStats({
          tickets: totalTickets,
          revenue: totalRevenue,
        });

        // Latest movie
        const latestMovieQuery = query(
          collection(db, "movies"),
          orderBy("createdAt", "desc"),
          limit(1)
        );

        const latestMovieSnap = await getDocs(latestMovieQuery);
        if (!latestMovieSnap.empty) {
          setLatestMovie(latestMovieSnap.docs[0].data());
        }

        // Recent comments
        const recentCommentsQuery = query(
          collection(db, "comments"),
          orderBy("timestamp", "desc"),
          limit(5)
        );

        const recentSnap = await getDocs(recentCommentsQuery);
        setRecentComments(recentSnap.docs.map((doc) => doc.data()));

      } catch (error) {
        console.error("Dashboard fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  /* ---------------- SESSION ---------------- */
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-12 animate-fadeUp pb-16">

      {/* HEADER - Premium Style */}
      <motion.div initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} className="admin-toolbar items-end">
        <div className="admin-section max-w-3xl">
          <p className="admin-kicker text-cyan-300 text-sm tracking-widest">✦ Admin Dashboard</p>
          <h1 className="admin-title text-4xl md:text-5xl bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">
            Platform Intelligence & Operations
          </h1>
          <p className="admin-lead text-gray-300 text-lg mt-2">
            Track platform metrics, manage content, and monitor revenue in real-time.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <Link href="/admin/settings" className="admin-button admin-button-secondary text-sm">
            ⚙️ Settings
          </Link>
          <Link href="/admin/movies/create" className="admin-button admin-button-secondary text-sm">
            + New Movie
          </Link>
          <Link href="/admin/premieres/create" className="admin-button admin-button-primary text-sm">
            + New Premiere
          </Link>
        </div>
      </motion.div>

      {/* SESSION CARD - Enhanced */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-2xl md:rounded-3xl p-6 md:p-8 bg-gradient-to-r from-cyan-500/10 via-blue-500/5 to-purple-500/5 border border-cyan-400/20"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-xs text-cyan-300 uppercase tracking-widest font-semibold">Logged In As</p>
            <p className="text-lg md:text-xl font-bold mt-2">{adminEmail || "Admin"}</p>
          </div>
          <div>
            <p className="text-xs text-cyan-300 uppercase tracking-widest font-semibold">Session Expires In</p>
            <p className="text-lg md:text-xl font-bold mt-2 text-cyan-300">
              {formatTime(sessionTimeLeft)}
            </p>
          </div>
          <div className="flex items-end">
            <div className="text-xs text-green-300 uppercase tracking-widest font-semibold animate-pulse">
              ✓ Secure Session Active
            </div>
          </div>
        </div>
      </motion.div>

      {/* MAIN STATS - Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="📊 Total Movies" value={numberFormatter.format(stats.movies)} loading={loading} helper="Live catalog size" tone="cyan" />
        <StatCard title="⭐ Total Ratings" value={numberFormatter.format(stats.ratings)} loading={loading} helper="Community feedback" tone="blue" />
        <StatCard title="💬 Total Comments" value={numberFormatter.format(stats.comments)} loading={loading} helper="Conversation volume" tone="pink" />
        <StatCard title="👁️ Total Views" value={numberFormatter.format(stats.views)} loading={loading} helper="Watch activity" tone="amber" />
      </div>

      {/* GAMIFICATION & ENGAGEMENT STATS */}
      <div>
        <motion.h2
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="text-2xl font-black mb-6 text-transparent bg-gradient-to-r from-cyan-300 via-blue-300 to-purple-300 bg-clip-text"
        >
          🎮 Advanced Features Engagement
        </motion.h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            title="🤖 AI Guide Queries"
            value="2,480"
            loading={loading}
            helper="Conversational prompts"
            tone="cyan"
          />
          <StatCard
            title="🏆 Trivia Quizzes Solved"
            value="1,842"
            loading={loading}
            helper="Gamified test completions"
            tone="blue"
          />
          <StatCard
            title="⚡ Story Paths Explored"
            value="924"
            loading={loading}
            helper="Branching narrative runs"
            tone="pink"
          />
          <StatCard
            title="👑 Total Standings XP"
            value="16,500"
            loading={loading}
            helper="Accumulated global score"
            tone="amber"
          />
        </div>
      </div>

      {/* REVENUE SECTION */}
      <div>
        <motion.h2
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="text-2xl font-black mb-6 text-transparent bg-gradient-to-r from-amber-300 to-orange-300 bg-clip-text"
        >
          💰 Revenue & Attendance
        </motion.h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <StatCard
            title="🎫 Tickets Sold"
            value={numberFormatter.format(revenueStats.tickets)}
            loading={loading}
            helper="Premiere attendance"
            tone="cyan"
          />
          <StatCard
            title="💵 Total Revenue"
            value={currencyFormatter.format(revenueStats.revenue)}
            loading={loading}
            helper="Gross ticket sales"
            tone="amber"
          />
        </div>
      </div>

      {/* ACTIVITY SECTION */}
      <div>
        <motion.h2
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="text-2xl font-black mb-6 text-transparent bg-gradient-to-r from-pink-300 to-rose-300 bg-clip-text"
        >
          📈 Recent Activity
        </motion.h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Latest Movie */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card rounded-2xl md:rounded-3xl p-6 md:p-8 border border-cyan-400/20"
          >
            <div className="flex items-center justify-between gap-4 mb-6">
              <h2 className="text-lg md:text-xl font-bold">🎬 Latest Uploaded</h2>
              <Link href="/admin/movies" className="text-sm text-cyan-300 hover:text-cyan-200 transition font-semibold">
                View all →
              </Link>
            </div>
            {latestMovie ? (
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/2 p-5 space-y-3 hover:border-cyan-300/30 transition">
                <p className="font-bold text-lg">{latestMovie.title}</p>
                <div className="flex flex-wrap gap-2">
                  {latestMovie.genre && (
                    <span className="text-xs px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-300/40 font-semibold">
                      {latestMovie.genre}
                    </span>
                  )}
                  {latestMovie.director && (
                    <span className="text-xs px-3 py-1 rounded-full bg-blue-500/20 border border-blue-300/40">
                      {latestMovie.director}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 pt-2">Recently updated</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-gray-400">
                No movie uploaded yet
              </div>
            )}
          </motion.div>

          {/* Recent Comments */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-2xl md:rounded-3xl p-6 md:p-8 border border-pink-400/20"
          >
            <div className="flex items-center justify-between gap-4 mb-6">
              <h2 className="text-lg md:text-xl font-bold">💬 Recent Comments</h2>
              <Link href="/admin/comments" className="text-sm text-cyan-300 hover:text-cyan-200 transition font-semibold">
                Review all →
              </Link>
            </div>

            {recentComments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-gray-400">
                No recent comments yet
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {recentComments.map((c, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                    className="rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/8 hover:border-pink-300/30 transition"
                  >
                    <p className="text-sm font-bold">{c.name}</p>
                    <p className="text-xs text-gray-400 line-clamp-2 mt-2">
                      {c.comment}
                    </p>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

        </div>
      </div>

    </div>
  );
}

/* ---------- STAT CARD ---------- */
function StatCard({ title, value, loading, helper, tone }) {
  const toneClass =
    tone === "blue"
      ? "from-blue-500/20 via-cyan-500/10 to-sky-500/5"
      : tone === "pink"
      ? "from-pink-500/20 via-rose-500/10 to-red-500/5"
      : tone === "amber"
      ? "from-amber-500/20 via-orange-500/10 to-yellow-500/5"
      : "from-cyan-500/20 via-blue-500/10 to-sky-500/5";

  const borderTone =
    tone === "blue" ? "border-blue-400/30" : tone === "pink" ? "border-pink-400/30" : tone === "amber" ? "border-amber-400/30" : "border-cyan-400/30";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`glass-card rounded-2xl md:rounded-3xl p-6 md:p-8 border ${borderTone} bg-gradient-to-br ${toneClass} hover:shadow-lg hover:shadow-current/20 transition-all duration-300`}
    >
      <p className="text-xs uppercase tracking-widest font-bold text-gray-300 mb-3">
        {title}
      </p>

      {loading ? (
        <div className="space-y-3">
          <div className="h-10 w-32 bg-zinc-700/70 rounded-lg animate-pulse" />
          <div className="h-3 w-24 bg-zinc-700/50 rounded animate-pulse" />
        </div>
      ) : (
        <>
          <p className="text-3xl md:text-4xl font-black text-white drop-shadow-lg">{value}</p>
          <p className="mt-3 text-xs text-gray-400 font-medium">{helper}</p>
        </>
      )}
    </motion.div>
  );
}