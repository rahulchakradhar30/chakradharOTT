"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import Link from "next/link";
import { motion } from "framer-motion";

export default function DiscoveryManagement() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const snapshot = await getDocs(collection(db, "movies"));
        const movieList = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setMovies(movieList);
      } catch (error) {
        console.error("Fetch error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMovies();
  }, []);

  const visibleMovies = movies.filter((movie) => {
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || [movie.title, movie.genre].some((v) => v?.toString().toLowerCase().includes(term));

    if (filter === "all") return matchesSearch;
    if (filter === "featured") return matchesSearch && movie.isFeatured;
    if (filter === "trending") return matchesSearch && movie.isTrending;
    if (filter === "hero") return matchesSearch && movie.isHero;
    return matchesSearch;
  });

  const toggleDiscoveryFeature = async (id, feature) => {
    try {
      const movie = movies.find((m) => m.id === id);
      const newValue = !movie[feature];

      await updateDoc(doc(db, "movies", id), {
        [feature]: newValue,
      });

      setMovies((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, [feature]: newValue } : m
        )
      );
    } catch (error) {
      console.error("Update error:", error);
      alert("Failed to update movie");
    }
  };

  const stats = {
    total: movies.length,
    featured: movies.filter((m) => m.isFeatured).length,
    trending: movies.filter((m) => m.isTrending).length,
    hero: movies.filter((m) => m.isHero).length,
  };

  return (
    <div className="space-y-10 pb-16">
      {/* HEADER */}
      <motion.div initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} className="admin-toolbar items-end">
        <div className="admin-section max-w-2xl">
          <p className="admin-kicker text-cyan-300 text-sm tracking-widest">✦ Discovery Settings</p>
          <h1 className="admin-title text-4xl font-black">Content Discovery</h1>
          <p className="admin-lead text-gray-300">Configure which movies appear in discovery sections, trending, featured, and hero banners.</p>
        </div>

        <Link href="/admin" className="admin-button admin-button-secondary text-sm">
          ← Back to Dashboard
        </Link>
      </motion.div>

      {/* STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          ["📊 Total Movies", stats.total, "cyan"],
          ["⭐ Featured", stats.featured, "amber"],
          ["🔥 Trending", stats.trending, "emerald"],
          ["🎯 Hero", stats.hero, "rose"],
        ].map(([label, value, tone]) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`glass-card rounded-2xl p-4 md:p-6 border border-${tone}-400/20`}
          >
            <p className="text-xs uppercase tracking-widest font-bold text-gray-300 mb-2">{label}</p>
            <p className="text-2xl md:text-3xl font-black">{value}</p>
          </motion.div>
        ))}
      </div>

      {/* FILTERS */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title or genre..."
          className="admin-input focus-ring flex-1"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="admin-input focus-ring"
        >
          <option value="all">All Movies</option>
          <option value="featured">Featured Only</option>
          <option value="trending">Trending Only</option>
          <option value="hero">Hero Only</option>
        </select>
      </motion.div>

      {/* MOVIES LIST */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading movies...</div>
        ) : visibleMovies.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            {search ? "No movies match your search." : "No movies found."}
          </div>
        ) : (
          visibleMovies.map((movie, index) => (
            <motion.div
              key={movie.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.03 }}
              className="glass-card rounded-2xl md:rounded-3xl p-6 md:p-8 border border-white/10 hover:border-cyan-300/30 transition"
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex-1">
                  <h3 className="text-lg md:text-xl font-bold">{movie.title}</h3>
                  <p className="text-sm text-gray-400 mt-2">{movie.genre || "No genre"}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {movie.isHero && <span className="text-xs px-3 py-1 rounded-full bg-rose-500/20 border border-rose-300/40 font-semibold">Hero</span>}
                    {movie.isTrending && <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-300/40 font-semibold">Trending</span>}
                    {movie.isFeatured && <span className="text-xs px-3 py-1 rounded-full bg-amber-500/20 border border-amber-300/40 font-semibold">Featured</span>}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => toggleDiscoveryFeature(movie.id, "isFeatured")}
                    className={`px-4 py-2 rounded-lg border font-semibold text-sm transition ${
                      movie.isFeatured
                        ? "bg-amber-500/20 border-amber-300/50 text-amber-300"
                        : "bg-white/5 border-white/15 hover:bg-white/10"
                    }`}
                  >
                    {movie.isFeatured ? "✓" : "○"} Featured
                  </button>

                  <button
                    onClick={() => toggleDiscoveryFeature(movie.id, "isTrending")}
                    className={`px-4 py-2 rounded-lg border font-semibold text-sm transition ${
                      movie.isTrending
                        ? "bg-emerald-500/20 border-emerald-300/50 text-emerald-300"
                        : "bg-white/5 border-white/15 hover:bg-white/10"
                    }`}
                  >
                    {movie.isTrending ? "✓" : "○"} Trending
                  </button>

                  <button
                    onClick={() => toggleDiscoveryFeature(movie.id, "isHero")}
                    className={`px-4 py-2 rounded-lg border font-semibold text-sm transition ${
                      movie.isHero
                        ? "bg-rose-500/20 border-rose-300/50 text-rose-300"
                        : "bg-white/5 border-white/15 hover:bg-white/10"
                    }`}
                  >
                    {movie.isHero ? "✓" : "○"} Hero
                  </button>

                  <Link
                    href={`/admin/movies/edit/${movie.id}`}
                    className="px-4 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 font-semibold text-sm transition"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
