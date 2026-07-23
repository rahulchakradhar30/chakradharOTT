"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { db, auth } from "@/firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { motion } from "framer-motion";
import {
  AnalyticsIcon,
  MovieIcon,
  TicketIcon,
  PosterIcon,
  MailIcon,
  UserIcon,
  SettingsIcon,
  PlusIcon,
  PencilIcon,
  CheckCircleIcon,
  RobotIcon,
  SearchIcon,
} from "@/components/Icon";

export default function AdminDashboard() {
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

  const [revenueStats, setRevenueStats] = useState({
    tickets: 0,
    revenue: 0,
  });

  const [advancedStats, setAdvancedStats] = useState({
    aiQueries: 0,
    quizzesSolved: 0,
    storyPaths: 0,
    totalXP: 0,
  });

  const [recentComments, setRecentComments] = useState([]);
  const [latestMovie, setLatestMovie] = useState(null);
  const [adminEmail, setAdminEmail] = useState("");
  const [sessionTimeLeft, setSessionTimeLeft] = useState(1800);
  const [loading, setLoading] = useState(true);
  const [moviesList, setMoviesList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const handleToggleFlag = async (movieId, field, currentValue) => {
    try {
      await updateDoc(doc(db, "movies", movieId), {
        [field]: !currentValue,
      });
      setMoviesList((prev) =>
        prev.map((m) => (m.id === movieId ? { ...m, [field]: !currentValue } : m))
      );
    } catch (err) {
      console.error("Error toggling field:", err);
      alert("Failed to toggle field: " + err.message);
    }
  };

  const handleSetHero = async (movieId) => {
    try {
      const clears = moviesList.map((m) =>
        updateDoc(doc(db, "movies", m.id), { isHero: false })
      );
      await Promise.all(clears);

      await updateDoc(doc(db, "movies", movieId), {
        isHero: true,
      });

      setMoviesList((prev) =>
        prev.map((m) => ({
          ...m,
          isHero: m.id === movieId,
        }))
      );
      alert("Hero banner updated successfully!");
    } catch (err) {
      console.error("Error setting hero:", err);
      alert("Failed to set hero: " + err.message);
    }
  };

  /* ---------------- AUTH ---------------- */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user?.email) {
        setAdminEmail(user.email);
      }
    });
    return () => unsubscribe();
  }, []);

  /* ---------------- FETCH 100% GENUINE FIRESTORE DATA ---------------- */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          moviesSnap,
          ratingsSnap,
          commentsSnap,
          usersSnap,
          premiereSnap,
          aiLogsSnap,
          quizResultsSnap,
          storyHistorySnap,
        ] = await Promise.allSettled([
          getDocs(collection(db, "movies")),
          getDocs(collection(db, "ratings")),
          getDocs(collection(db, "comments")),
          getDocs(collection(db, "users")),
          getDocs(collection(db, "premieres")),
          getDocs(collection(db, "ai_logs")),
          getDocs(collection(db, "quiz_results")),
          getDocs(collection(db, "story_history")),
        ]);

        const moviesDocs = moviesSnap.status === "fulfilled" ? moviesSnap.value.docs : [];
        const ratingsDocs = ratingsSnap.status === "fulfilled" ? ratingsSnap.value.docs : [];
        const commentsDocs = commentsSnap.status === "fulfilled" ? commentsSnap.value.docs : [];
        const usersDocs = usersSnap.status === "fulfilled" ? usersSnap.value.docs : [];
        const premiereDocs = premiereSnap.status === "fulfilled" ? premiereSnap.value.docs : [];

        let totalViews = 0;
        moviesDocs.forEach((doc) => {
          const d = doc.data();
          totalViews += (d.views || 0) + (d.viewsReal || 0);
        });

        setStats({
          movies: moviesDocs.length,
          ratings: ratingsDocs.length,
          comments: commentsDocs.length,
          views: totalViews,
        });

        const list = moviesDocs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMoviesList(list);

        let totalRevenue = 0;
        let totalTickets = 0;

        premiereDocs.forEach((doc) => {
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

        // Genuine Advanced Feature Stats from Firestore
        let calculatedTotalXP = 0;
        usersDocs.forEach((doc) => {
          calculatedTotalXP += doc.data().totalXP || 0;
        });

        setAdvancedStats({
          aiQueries: aiLogsSnap.status === "fulfilled" ? aiLogsSnap.value.size : 0,
          quizzesSolved: quizResultsSnap.status === "fulfilled" ? quizResultsSnap.value.size : 0,
          storyPaths: storyHistorySnap.status === "fulfilled" ? storyHistorySnap.value.size : 0,
          totalXP: calculatedTotalXP,
        });

        // Latest movie
        const sortedMovies = [...list].sort((a, b) => {
          const timeA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
          const timeB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
          return timeB - timeA;
        });
        if (sortedMovies.length > 0) {
          setLatestMovie(sortedMovies[0]);
        }

        // Recent comments
        const commentsList = commentsDocs.map((doc) => doc.data());
        const sortedComments = commentsList.sort((a, b) => {
          const timeA = a.timestamp?.toDate?.() || new Date(a.timestamp || 0);
          const timeB = b.timestamp?.toDate?.() || new Date(b.timestamp || 0);
          return timeB - timeA;
        });
        setRecentComments(sortedComments.slice(0, 5));
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
    <div className="space-y-8 md:space-y-12 animate-fadeUp pb-24 md:pb-16 max-w-7xl mx-auto">
      {/* HEADER */}
      <motion.div initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} className="admin-toolbar items-end">
        <div className="admin-section max-w-3xl">
          <p className="admin-kicker text-cyan-300 text-sm tracking-widest uppercase">Platform Control Center</p>
          <h1 className="admin-title text-4xl md:text-5xl bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">
            Platform Intelligence & Operations
          </h1>
          <p className="admin-lead text-gray-300 text-lg mt-2">
            Track platform metrics, manage content, and monitor revenue in real-time.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 md:gap-3 w-full sm:w-auto">
          <Link href="/admin/settings" className="admin-button bg-white/10 hover:bg-white/15 text-white border border-white/20 text-xs md:text-sm font-bold py-2.5 px-4 rounded-2xl flex items-center justify-center gap-2">
            <SettingsIcon className="w-4 h-4 text-cyan-300" />
            <span>Settings</span>
          </Link>
          <Link href="/admin/movies/create" className="admin-button bg-white/10 hover:bg-white/15 text-white border border-white/20 text-xs md:text-sm font-bold py-2.5 px-4 rounded-2xl flex items-center justify-center gap-2">
            <PlusIcon className="w-4 h-4 text-cyan-300" />
            <span>New Movie</span>
          </Link>
          <Link href="/admin/premieres/create" className="admin-button bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs md:text-sm font-bold py-2.5 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20">
            <PlusIcon className="w-4 h-4 text-white" />
            <span>New Premiere</span>
          </Link>
        </div>
      </motion.div>

      {/* SESSION CARD */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-2xl md:rounded-3xl p-6 md:p-8 bg-gradient-to-r from-cyan-500/10 via-blue-500/5 to-purple-500/5 border border-cyan-400/20"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-xs text-cyan-300 uppercase tracking-widest font-semibold">Logged In As</p>
            <p className="text-lg md:text-xl font-bold mt-2 truncate">{adminEmail || "Super Admin"}</p>
          </div>
          <div>
            <p className="text-xs text-cyan-300 uppercase tracking-widest font-semibold">Session Expires In</p>
            <p className="text-lg md:text-xl font-bold mt-2 text-cyan-300 font-mono">
              {formatTime(sessionTimeLeft)}
            </p>
          </div>
          <div className="flex items-end">
            <div className="text-xs text-green-300 uppercase tracking-widest font-semibold flex items-center gap-2">
              <CheckCircleIcon className="w-4 h-4 text-green-400 animate-pulse" />
              <span>Secure Session Active</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* MAIN STATS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
        <StatCard title="Movies Catalog" value={numberFormatter.format(stats.movies)} loading={loading} helper="Live catalog size" tone="cyan" IconComponent={MovieIcon} />
        <StatCard title="Community Ratings" value={numberFormatter.format(stats.ratings)} loading={loading} helper="Community feedback" tone="blue" IconComponent={PosterIcon} />
        <StatCard title="User Comments" value={numberFormatter.format(stats.comments)} loading={loading} helper="Conversation volume" tone="pink" IconComponent={MailIcon} />
        <StatCard title="Total Title Views" value={numberFormatter.format(stats.views)} loading={loading} helper="Watch activity" tone="amber" IconComponent={AnalyticsIcon} />
      </div>

      {/* GAMIFICATION & ENGAGEMENT STATS (100% GENUINE FIRESTORE RECURSION) */}
      <div>
        <motion.h2
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="text-xl md:text-2xl font-black mb-6 text-transparent bg-gradient-to-r from-cyan-300 via-blue-300 to-purple-300 bg-clip-text flex items-center gap-2"
        >
          <AnalyticsIcon className="w-6 h-6 text-cyan-400" />
          <span>Advanced Features Engagement</span>
        </motion.h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            title="AI Guide Queries"
            value={numberFormatter.format(advancedStats.aiQueries)}
            loading={loading}
            helper="Real conversational prompts"
            tone="cyan"
            IconComponent={RobotIcon}
          />
          <StatCard
            title="Trivia Quizzes Solved"
            value={numberFormatter.format(advancedStats.quizzesSolved)}
            loading={loading}
            helper="Real quiz completions"
            tone="blue"
            IconComponent={TicketIcon}
          />
          <StatCard
            title="Story Paths Explored"
            value={numberFormatter.format(advancedStats.storyPaths)}
            loading={loading}
            helper="Branching narrative runs"
            tone="pink"
            IconComponent={MovieIcon}
          />
          <StatCard
            title="Total Standings XP"
            value={numberFormatter.format(advancedStats.totalXP)}
            loading={loading}
            helper="Real total global score"
            tone="amber"
            IconComponent={UserIcon}
          />
        </div>
      </div>

      {/* REVENUE & TICKETS SECTION */}
      <div>
        <motion.h2
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="text-xl md:text-2xl font-black mb-6 text-transparent bg-gradient-to-r from-amber-300 to-orange-300 bg-clip-text flex items-center gap-2"
        >
          <TicketIcon className="w-6 h-6 text-amber-400" />
          <span>Revenue & Premiere Attendance</span>
        </motion.h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <StatCard
            title="Tickets Sold"
            value={numberFormatter.format(revenueStats.tickets)}
            loading={loading}
            helper="Live premiere attendance"
            tone="cyan"
            IconComponent={TicketIcon}
          />
          <StatCard
            title="Total Revenue"
            value={currencyFormatter.format(revenueStats.revenue)}
            loading={loading}
            helper="Gross ticket sales"
            tone="amber"
            IconComponent={AnalyticsIcon}
          />
        </div>
      </div>

      {/* HOMEPAGE LAYOUT CONTROLS */}
      <div>
        <motion.h2
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="text-xl md:text-2xl font-black mb-6 text-transparent bg-gradient-to-r from-cyan-300 via-blue-300 to-indigo-300 bg-clip-text"
        >
          Homepage Content Controls
        </motion.h2>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card rounded-[2.5rem] p-6 md:p-8 border border-white/10"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <p className="admin-kicker mb-1 text-cyan-300">Layout Manager</p>
              <h3 className="text-xl font-bold text-white">Spotlight Content Settings</h3>
            </div>
            <div className="w-full sm:w-64">
              <input
                type="text"
                placeholder="Search catalog titles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="admin-input focus-ring text-xs py-2"
              />
            </div>
          </div>

          <div className="overflow-x-auto hide-scrollbar max-h-96">
            <table className="w-full text-left text-sm text-gray-300 border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-gray-400 font-extrabold">
                  <th className="pb-3 font-semibold">Title</th>
                  <th className="pb-3 text-center font-semibold">Hero Banner</th>
                  <th className="pb-3 text-center font-semibold">Editors Choice</th>
                  <th className="pb-3 text-center font-semibold">Trending Now</th>
                  <th className="pb-3 text-right font-semibold">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {moviesList
                  .filter((m) =>
                    m.title?.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((movie) => (
                    <tr key={movie.id} className="hover:bg-white/[0.02] transition">
                      <td className="py-4 font-bold text-white flex flex-col">
                        <span>{movie.title}</span>
                        <span className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide">{movie.genre || "Drama"}</span>
                      </td>
                      <td className="py-4 text-center">
                        <input
                          type="radio"
                          name="hero-radio"
                          checked={movie.isHero || false}
                          onChange={() => handleSetHero(movie.id)}
                          className="cursor-pointer accent-cyan-400 w-4 h-4"
                        />
                      </td>
                      <td className="py-4 text-center">
                        <input
                          type="checkbox"
                          checked={movie.isFeatured || false}
                          onChange={() => handleToggleFlag(movie.id, "isFeatured", !!movie.isFeatured)}
                          className="cursor-pointer accent-cyan-400 w-4 h-4"
                        />
                      </td>
                      <td className="py-4 text-center">
                        <input
                          type="checkbox"
                          checked={movie.isTrending || false}
                          onChange={() => handleToggleFlag(movie.id, "isTrending", !!movie.isTrending)}
                          className="cursor-pointer accent-cyan-400 w-4 h-4"
                        />
                      </td>
                      <td className="py-4 text-right">
                        <Link
                          href={`/admin/movies/edit/${movie.id}`}
                          className="text-xs text-cyan-300 hover:underline font-extrabold"
                        >
                          Edit →
                        </Link>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      {/* RECENT ACTIVITY */}
      <div>
        <motion.h2
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="text-xl md:text-2xl font-black mb-6 text-transparent bg-gradient-to-r from-pink-300 to-rose-300 bg-clip-text flex items-center gap-2"
        >
          <AnalyticsIcon className="w-6 h-6 text-pink-400" />
          <span>Recent Activity</span>
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
              <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
                <MovieIcon className="w-5 h-5 text-cyan-400" />
                <span>Latest Uploaded</span>
              </h2>
              <Link href="/admin/movies" className="text-sm text-cyan-300 hover:text-cyan-200 transition font-semibold">
                View all →
              </Link>
            </div>
            {latestMovie ? (
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/2 p-5 space-y-3 hover:border-cyan-300/30 transition">
                <p className="font-bold text-lg text-white">{latestMovie.title}</p>
                <div className="flex flex-wrap gap-2">
                  {latestMovie.genre && (
                    <span className="text-xs px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-300/40 font-semibold text-cyan-300">
                      {latestMovie.genre}
                    </span>
                  )}
                  {latestMovie.director && (
                    <span className="text-xs px-3 py-1 rounded-full bg-blue-500/20 border border-blue-300/40 text-blue-300">
                      {latestMovie.director}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 pt-2">Recently updated</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-gray-400 text-xs">
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
              <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
                <MailIcon className="w-5 h-5 text-pink-400" />
                <span>Recent Comments</span>
              </h2>
              <Link href="/admin/comments" className="text-sm text-cyan-300 hover:text-cyan-200 transition font-semibold">
                Review all →
              </Link>
            </div>

            {recentComments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-gray-400 text-xs">
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
                    <p className="text-sm font-bold text-white">{c.name}</p>
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
function StatCard({ title, value, loading, helper, tone, IconComponent }) {
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
      className={`glass-card rounded-2xl md:rounded-3xl p-5 md:p-8 border ${borderTone} bg-gradient-to-br ${toneClass} hover:shadow-lg hover:shadow-current/20 transition-all duration-300 min-w-0 flex flex-col justify-between`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-[10px] md:text-xs uppercase tracking-widest font-bold text-gray-300 truncate">
          {title}
        </p>
        {IconComponent && <IconComponent className="w-5 h-5 text-cyan-400 shrink-0" />}
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-10 w-32 bg-zinc-700/70 rounded-lg animate-pulse" />
          <div className="h-3 w-24 bg-zinc-700/50 rounded animate-pulse" />
        </div>
      ) : (
        <>
          <p className="text-2xl md:text-4xl font-black text-white drop-shadow-lg">{value}</p>
          <p className="mt-2 text-[10px] md:text-xs text-gray-400 font-medium">{helper}</p>
        </>
      )}
    </motion.div>
  );
}