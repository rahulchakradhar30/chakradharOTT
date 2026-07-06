"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebase";
import { collection, getDocs } from "firebase/firestore";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { SkeletonGrid } from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";
import { SearchIcon } from "@/components/Icon";

export default function MoviesPage() {
  const [movies, setMovies] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        setLoading(true);
        setError(null);
        const snapshot = await getDocs(collection(db, "movies"));
        const now = Date.now();
        const movieList = snapshot.docs
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
    (movie.title || "").toLowerCase().includes(search.toLowerCase())
  );

  if (error) {
    return (
      <div className="min-h-screen px-4 md:px-10 lg:px-16 py-10 md:py-12">
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
    <div className="min-h-screen px-4 md:px-10 lg:px-16 py-10 md:py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-card rounded-[2rem] p-5 md:p-8 mb-10 md:mb-12"
      >
        <p className="admin-kicker mb-2">Library</p>
        <h1 className="text-3xl md:text-5xl font-black tracking-tight">
          Explore Movies
        </h1>
        <p className="text-sm md:text-base text-muted mt-2">
          Search through the full cinematic collection. {movies.length} titles available.
        </p>

        <div className="relative mt-5">
          <input
            type="text"
            placeholder="Search by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="focus-ring admin-input w-full md:w-[28rem] pl-10"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <SearchIcon className="w-4 h-4" />
          </span>
        </div>

        <div className="mt-3 text-xs text-gray-400">
          {search && `${filtered.length} result${filtered.length !== 1 ? "s" : ""} found`}
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5 md:gap-7">
          {filtered.map((movie, index) => (
            <motion.div
              key={movie.id}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: Math.min(index * 0.02, 0.2) }}
            >
              <Link href={`/movie/${movie.id}`} className="group block">
                <div className="relative aspect-[2/3] overflow-hidden rounded-2xl border border-white/15 bg-[#0b1328] transition duration-500 group-hover:-translate-y-1 group-hover:border-cyan-300/50 shadow-lg hover:shadow-xl hover:shadow-cyan-500/20">
                  {(movie.posterImage || "").startsWith("data:image/") ? (
                    <img
                      src={movie.posterImage}
                      alt={movie.title}
                      className="absolute inset-0 w-full h-full object-cover transition duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <Image
                      src={
                        movie.posterImage ||
                        "https://images.unsplash.com/photo-1524985069026-dd778a71c7b4"
                      }
                      alt={movie.title}
                      fill
                      className="object-cover transition duration-700 group-hover:scale-105"
                      priority={index < 5}
                    />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-[#04070f] via-transparent to-transparent" />
                  <div className="absolute inset-x-3 bottom-3 opacity-0 group-hover:opacity-100 transition duration-300">
                    <span className="inline-block bg-white/15 backdrop-blur-lg border border-white/25 px-3 py-1.5 rounded-full text-xs font-medium">
                      View details →
                    </span>
                  </div>
                </div>
                <h3 className="mt-3 text-sm md:text-base text-gray-200 group-hover:text-white transition line-clamp-1 font-medium">
                  {movie.title}
                </h3>
                {movie.releaseYear && (
                  <p className="text-xs text-gray-500 mt-1">{movie.releaseYear}</p>
                )}
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}