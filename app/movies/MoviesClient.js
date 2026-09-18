"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { SkeletonGrid } from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";
import { Search, X, Film, Star, ArrowRight } from "lucide-react";
import { getCachedData } from "@/lib/searchEngine";

export default function MoviesClient() {
  const [movies, setMovies] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        setLoading(true);
        setError(null);
        const { movies: cachedList } = await getCachedData();
        const now = Date.now();
        const movieList = cachedList.filter((m) => {
          if (!m.scheduledRelease) return true;
          const releaseTime = m.scheduledRelease.toDate
            ? m.scheduledRelease.toDate().getTime()
            : new Date(m.scheduledRelease).getTime();
          return now >= releaseTime;
        });
        setMovies(movieList);
      } catch (err) {
        console.error("Error fetching movies:", err);
        setError("Failed to load movies. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, []);

  const filtered = movies.filter((movie) =>
    (movie.title || "").toLowerCase().includes(search.toLowerCase()) ||
    (movie.genre || "").toLowerCase().includes(search.toLowerCase())
  );

  if (error) {
    return (
      <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <EmptyState
          title="Something went wrong"
          description={error}
          icon="❌"
          action={{
            label: "Try Again",
            onClick: () => window.location.reload(),
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
      {/* Header Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-card rounded-3xl p-6 sm:p-8 md:p-10 mb-10 border border-white/[0.08] relative overflow-hidden shadow-2xl"
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/10 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="relative z-10">
          <p className="admin-kicker mb-2 text-red-400">Library</p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white">
            Explore Movies
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-400 mt-2 max-w-xl">
            Search through the full cinematic collection. {movies.length} titles available.
          </p>

          <div className="relative mt-6 max-w-md">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, genre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/[0.06] focus:bg-black/80 border border-white/[0.12] focus:border-red-500/60 rounded-2xl pl-11 pr-10 py-3 text-xs sm:text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all shadow-inner"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {search && (
            <div className="mt-3 text-xs text-gray-400 font-semibold">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""} found
            </div>
          )}
        </div>
      </motion.div>

      {loading ? (
        <SkeletonGrid count={10} columns={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={search ? "No movies found" : "No movies available"}
          description={
            search
              ? `We couldn't find any movies matching "${search}". Try a different search term.`
              : "Check back soon for new releases!"
          }
          icon="🎬"
          action={
            search
              ? {
                  label: "Clear Search",
                  onClick: () => setSearch(""),
                }
              : null
          }
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5 md:gap-6">
          {filtered.map((movie, index) => (
            <motion.div
              key={movie.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: Math.min(index * 0.02, 0.2) }}
            >
              <Link href={`/movie/${movie.id}`} className="group block select-none">
                <div className="relative aspect-[2/3] overflow-hidden rounded-2xl md:rounded-3xl border border-white/[0.08] bg-[#0c0f17] group-hover:border-red-500/40 shadow-lg group-hover:shadow-[0_15px_35px_rgba(0,0,0,0.85)] transition-all duration-300">
                  {(movie.posterImage || "").startsWith("data:image/") ? (
                    <img
                      src={movie.posterImage}
                      alt={movie.title || "Movie poster"}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <Image
                      src={
                        movie.posterImage ||
                        "https://images.unsplash.com/photo-1524985069026-dd778a71c7b4"
                      }
                      alt={movie.title || "Movie poster"}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      priority={index < 5}
                    />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  
                  {/* Floating Action Tag */}
                  <div className="absolute inset-x-3 bottom-3 opacity-0 group-hover:opacity-100 transition duration-300 transform translate-y-1 group-hover:translate-y-0">
                    <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-xl border border-white/30 px-3 py-1 rounded-full text-[10px] font-bold text-white shadow-md">
                      <span>View details</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>

                <div className="mt-2.5 space-y-0.5">
                  <h3 className="text-xs sm:text-sm font-extrabold text-white group-hover:text-red-400 transition-colors line-clamp-1">
                    {movie.title}
                  </h3>
                  <div className="flex items-center justify-between text-[10px] text-gray-400">
                    <span>{movie.genre || movie.releaseYear || "Cinema"}</span>
                    {movie.rating && (
                      <span className="flex items-center gap-0.5 text-amber-400 font-bold">
                        <Star className="w-2.5 h-2.5 fill-current" />
                        {Number(movie.rating).toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
