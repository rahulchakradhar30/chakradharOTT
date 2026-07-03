"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { getTrendingContent } from "@/lib/searchEngine";
import { SkeletonGrid } from "@/components/Skeleton";

const GENRES = [
  { name: "Action", icon: "💥", color: "from-red-600 to-red-900" },
  { name: "Comedy", icon: "😂", color: "from-yellow-500 to-orange-900" },
  { name: "Drama", icon: "🎭", color: "from-purple-600 to-purple-900" },
  { name: "Horror", icon: "👻", color: "from-gray-800 to-black" },
  { name: "Thriller", icon: "😰", color: "from-blue-700 to-indigo-900" },
  { name: "Romance", icon: "💕", color: "from-pink-600 to-pink-900" },
  { name: "Sci-Fi", icon: "🚀", color: "from-cyan-600 to-blue-900" },
  { name: "Fantasy", icon: "✨", color: "from-emerald-600 to-emerald-900" },
  { name: "Animation", icon: "🎨", color: "from-violet-600 to-violet-900" },
  { name: "Documentary", icon: "📽️", color: "from-amber-600 to-amber-900" },
];

export default function DiscoverPage() {
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTrending = async () => {
      try {
        const data = await getTrendingContent();
        setTrending(data);
      } catch (err) {
        console.error("Error loading trending:", err);
      } finally {
        setLoading(false);
      }
    };

    loadTrending();
  }, []);

  return (
    <div className="min-h-screen px-4 md:px-10 lg:px-16 py-10 md:py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header */}
        <div className="mb-12">
          <p className="admin-kicker mb-2">Discovery</p>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-3">
            Discover Content
          </h1>
          <p className="text-gray-400 text-sm md:text-base">
            Explore all genres and find something new to watch
          </p>
        </div>

        {/* Genres Grid */}
        <section className="mb-16">
          <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-8">
            Browse by Genre
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {GENRES.map((genre, index) => (
              <motion.div
                key={genre.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <Link href={`/genre/${encodeURIComponent(genre.name)}`}>
                  <div
                    className={`relative h-40 rounded-2xl bg-gradient-to-br ${genre.color} overflow-hidden border border-white/10 hover:border-white/30 transition group cursor-pointer`}
                  >
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center group-hover:-translate-y-1 transition">
                      <span className="text-4xl mb-2">{genre.icon}</span>
                      <span className="text-white font-bold text-center">{genre.name}</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Trending Section */}
        <section>
          <div className="flex items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight">
                Trending Now
              </h2>
              <p className="text-gray-400 text-sm mt-1">Most watched this week</p>
            </div>
            <Link
              href="/search?sort=trending"
              className="text-sm text-cyan-300 hover:text-cyan-200 transition font-medium hidden md:block"
            >
              See all →
            </Link>
          </div>

          {loading ? (
            <SkeletonGrid count={10} columns={5} />
          ) : trending.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-400">No trending content available yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5 md:gap-7">
              {trending.slice(0, 10).map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: Math.min(index * 0.02, 0.2) }}
                >
                  <Link href={`/movie/${item.id}`} className="group block">
                    <div className="relative aspect-[2/3] rounded-2xl overflow-hidden border border-white/15 bg-[#0b1328] transition duration-500 group-hover:-translate-y-1 group-hover:border-cyan-300/50 group-hover:shadow-lg group-hover:shadow-cyan-500/20">
                      {/* Ranking Badge */}
                      <div className="absolute top-3 left-3 z-10 bg-gradient-to-r from-yellow-500 to-orange-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                        #{index + 1}
                      </div>

                      {(item.posterImage || "").startsWith("data:image/") ? (
                        <img
                          src={item.posterImage}
                          alt={item.title}
                          className="absolute inset-0 w-full h-full object-cover transition duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <Image
                          src={
                            item.posterImage ||
                            "https://images.unsplash.com/photo-1524985069026-dd778a71c7b4"
                          }
                          alt={item.title}
                          fill
                          className="object-cover transition duration-700 group-hover:scale-105"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#04070f] via-transparent to-transparent" />
                    </div>
                    <h3 className="mt-3 text-sm md:text-base text-gray-200 group-hover:text-white line-clamp-2 font-medium">
                      {item.title}
                    </h3>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </motion.div>
    </div>
  );
}
