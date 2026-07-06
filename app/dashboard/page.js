"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  setDoc,
  serverTimestamp,
  orderBy,
  limit,
} from "firebase/firestore";
import Link from "next/link";
import Image from "next/image";
import { MovieIcon, ClockIcon, FlameIcon, WishlistIcon } from "@/components/Icon";

function DashboardStatIcon({ type, className = "w-8 h-8 text-cyan-400" }) {
  switch (type) {
    case "Watched": return <MovieIcon className={className} />;
    case "Minutes": return <ClockIcon className={className} />;
    case "Streak": return <FlameIcon className={className} />;
    default: return null;
  }
}
import { motion } from "framer-motion";
import { SkeletonGrid } from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";
import { useRecommendations } from "@/lib/searchEngine";

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState({
    totalWatched: 0,
    totalMinutesWatched: 0,
    streak: 0,
  });
  const [continueWatching, setContinueWatching] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [watchHistory, setWatchHistory] = useState([]);

  const { recommendations } = useRecommendations(watchHistory);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    const loadUserData = async () => {
      try {
        setLoading(true);

        // Get user stats
        const userStatsDoc = await getDoc(doc(db, "userStats", user.uid));
        if (userStatsDoc.exists()) {
          setUserStats(userStatsDoc.data());
        }

        // Get continue watching
        const continueWatchingRef = collection(db, `users/${user.uid}/continueWatching`);
        const continueWatchingSnap = await getDocs(
          query(continueWatchingRef, orderBy("lastWatched", "desc"), limit(10))
        );
        setContinueWatching(
          continueWatchingSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
        );

        // Get watchlist
        const watchlistRef = collection(db, `users/${user.uid}/watchlist`);
        const watchlistSnap = await getDocs(query(watchlistRef, limit(20)));
        setWatchlist(
          watchlistSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
        );

        // Get watch history
        const historyRef = collection(db, `users/${user.uid}/watchHistory`);
        const historySnap = await getDocs(
          query(historyRef, orderBy("watchedAt", "desc"), limit(100))
        );
        setWatchHistory(
          historySnap.docs.map((doc) => ({
            movieId: doc.id,
            ...doc.data(),
          }))
        );
      } catch (err) {
        console.error("Error loading dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [user, router]);

  if (!user) return null;

  const getInitials = (name = "U") => {
    const parts = name.split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  return (
    <div className="min-h-screen px-4 md:px-10 lg:px-16 py-10 md:py-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-12"
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="admin-kicker mb-2">Your Dashboard</p>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight">
              Welcome back, {user.displayName?.split(" ")[0] || "Viewer"}
            </h1>
          </div>
          <Link href="/profile" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition font-medium">
            Edit Profile
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              label: "Total Watched",
              value: userStats.totalWatched,
              icon: "Watched",
            },
            {
              label: "Minutes Watched",
              value: `${Math.round(userStats.totalMinutesWatched / 60)}h`,
              icon: "Minutes",
            },
            {
              label: "Current Streak",
              value: `${userStats.streak} days`,
              icon: "Streak",
            },
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="glass-card rounded-2xl p-6 border border-white/10"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">{stat.label}</p>
                  <p className="text-2xl font-black mt-2">{stat.value}</p>
                </div>
                <DashboardStatIcon type={stat.icon} className="w-8 h-8 text-cyan-400" />
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Continue Watching */}
      {continueWatching.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mb-16"
        >
          <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-6">
            Continue Watching
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5 md:gap-7">
            {continueWatching.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Link href={`/movie/${item.movieId || item.id}`} className="group block">
                  <div className="relative aspect-[2/3] rounded-2xl overflow-hidden border border-white/15 bg-[#0b1328] transition duration-500 group-hover:-translate-y-1 group-hover:border-cyan-300/50">
                    <Image
                      src={
                        item.posterImage ||
                        "https://images.unsplash.com/photo-1524985069026-dd778a71c7b4"
                      }
                      alt={item.title}
                      fill
                      className="object-cover transition duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#04070f] via-transparent to-transparent" />

                    {/* Progress Bar */}
                    {item.progress && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                          style={{
                            width: `${(item.progress / item.duration) * 100}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <h3 className="mt-3 text-sm md:text-base text-gray-200 group-hover:text-white line-clamp-2 font-medium">
                    {item.title}
                  </h3>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Watchlist */}
      {watchlist.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mb-16"
        >
          <div className="flex items-end justify-between gap-4 mb-6">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">
              My Watchlist
            </h2>
            <Link
              href="/profile"
              className="text-sm text-cyan-300 hover:text-cyan-200 transition"
            >
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5 md:gap-7">
            {watchlist.slice(0, 10).map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Link href={`/movie/${item.movieId || item.id}`} className="group block">
                  <div className="relative aspect-[2/3] rounded-2xl overflow-hidden border border-white/15 bg-[#0b1328] transition duration-500 group-hover:-translate-y-1 group-hover:border-cyan-300/50">
                    <Image
                      src={
                        item.posterImage ||
                        "https://images.unsplash.com/photo-1524985069026-dd778a71c7b4"
                      }
                      alt={item.title}
                      fill
                      className="object-cover transition duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#04070f] via-transparent to-transparent" />
                     <div className="absolute top-3 right-3">
                       <WishlistIcon className="w-5 h-5 text-rose-500 fill-current" />
                     </div>
                  </div>
                  <h3 className="mt-3 text-sm md:text-base text-gray-200 group-hover:text-white line-clamp-2 font-medium">
                    {item.title}
                  </h3>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-6">
            Recommended For You
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5 md:gap-7">
            {recommendations.slice(0, 10).map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: Math.min(index * 0.02, 0.2) }}
              >
                <Link href={`/movie/${item.id}`} className="group block">
                  <div className="relative aspect-[2/3] rounded-2xl overflow-hidden border border-white/15 bg-[#0b1328] transition duration-500 group-hover:-translate-y-1 group-hover:border-cyan-300/50">
                    <Image
                      src={
                        item.posterImage ||
                        "https://images.unsplash.com/photo-1524985069026-dd778a71c7b4"
                      }
                      alt={item.title}
                      fill
                      className="object-cover transition duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#04070f] via-transparent to-transparent" />
                  </div>
                  <h3 className="mt-3 text-sm md:text-base text-gray-200 group-hover:text-white line-clamp-2 font-medium">
                    {item.title}
                  </h3>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Empty State */}
      {!loading && continueWatching.length === 0 && watchlist.length === 0 && (
        <EmptyState
          title="Start watching"
          description="Explore our library and add movies to your watchlist to get personalized recommendations"
          icon="🍿"
          action={{
            label: "Browse Movies",
            onClick: () => router.push("/movies"),
          }}
        />
      )}
    </div>
  );
}
