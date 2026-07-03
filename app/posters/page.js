"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

export default function PostersGalleryPage() {
  const [posters, setPosters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosters = async () => {
      try {
        const res = await fetch("/api/posters");
        const data = await res.json();
        if (data.success) {
          setPosters(data.posters || []);
        } else {
          console.error("API error loading posters:", data.error);
        }
      } catch (err) {
        console.error("Fetch posters error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPosters();
  }, []);

  return (
    <div className="min-h-screen text-white px-4 md:px-8 lg:px-12 py-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(0,212,255,0.15),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(255,77,141,0.1),_transparent_30%)]" />

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300 mb-2">✦ Gallery</p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight bg-gradient-to-r from-white via-cyan-200 to-blue-200 bg-clip-text text-transparent">
            Movie Posters
          </h1>
          <p className="text-gray-400 mt-3 max-w-xl">
            Explore our curated collection of stunning movie posters. Like your favorites and share your thoughts in the comments.
          </p>
        </motion.div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-20">
            <div className="mx-auto h-12 w-12 rounded-full border-4 border-cyan-400/30 border-t-cyan-400 animate-spin" />
            <p className="mt-4 text-gray-400">Loading posters...</p>
          </div>
        ) : posters.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-6xl mb-4">🖼️</p>
            <p className="text-xl text-gray-300 font-semibold mb-2">No Posters Yet</p>
            <p className="text-gray-400">Check back soon — exciting movie posters are on the way!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {posters.map((poster, idx) => (
              <motion.div
                key={poster.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.35 }}
              >
                <Link href={`/posters/${poster.id}`} className="group block">
                  <div className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-white/15 group-hover:border-cyan-300/40 transition shadow-lg group-hover:shadow-cyan-500/10">
                    {poster.imageUrl ? (
                      poster.imageUrl.startsWith("data:") ? (
                        <img
                          src={poster.imageUrl}
                          alt={poster.caption || "Poster"}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-700"
                        />
                      ) : (
                        <Image
                          src={poster.imageUrl}
                          alt={poster.caption || "Poster"}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          className="object-cover group-hover:scale-105 transition duration-700"
                        />
                      )
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-cyan-900 to-blue-900 flex items-center justify-center text-5xl">🖼️</div>
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition duration-300 flex flex-col justify-end p-4">
                      <p className="text-sm text-white line-clamp-2 font-medium">{poster.caption || "View poster"}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-300">
                        <span>❤️ {poster.likesCount || 0}</span>
                        <span>💬 {poster.commentsCount || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Below card info (mobile friendly) */}
                  <div className="mt-2 px-1">
                    <p className="text-xs text-gray-300 line-clamp-1">{poster.caption || ""}</p>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500">
                      <span>❤️ {poster.likesCount || 0}</span>
                      <span>💬 {poster.commentsCount || 0}</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
