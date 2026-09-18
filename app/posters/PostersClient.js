"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Heart, MessageSquare, Image as ImageIcon, Sparkles } from "lucide-react";

export default function PostersClient() {
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
    <div className="min-h-screen text-white max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 relative">
      {/* Ambient Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-red-600/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-3xl p-6 sm:p-8 md:p-10 mb-10 border border-white/[0.08] shadow-2xl relative overflow-hidden"
      >
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <p className="text-[11px] uppercase tracking-[0.2em] font-black text-red-400">
              Gallery
            </p>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white">
            Movie Posters
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-400 mt-2 max-w-xl leading-relaxed">
            Explore our curated collection of stunning movie posters. Like your favorites and share your thoughts in the comments.
          </p>
        </div>
      </motion.div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-24">
          <div className="mx-auto h-12 w-12 rounded-full border-3 border-red-500/20 border-t-red-500 animate-spin" />
          <p className="mt-4 text-xs font-bold text-gray-400 tracking-wider uppercase">Loading posters...</p>
        </div>
      ) : posters.length === 0 ? (
        <div className="text-center py-24 glass-card rounded-3xl p-8 max-w-md mx-auto border border-white/[0.08]">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center mx-auto mb-4 text-red-400">
            <ImageIcon className="w-8 h-8" />
          </div>
          <p className="text-xl text-white font-black mb-2 tracking-tight">No Posters Yet</p>
          <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
            Check back soon — exciting movie posters are on the way!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
          {posters.map((poster, idx) => (
            <motion.div
              key={poster.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.04, duration: 0.35 }}
            >
              <Link href={`/posters/${poster.id}`} className="group block select-none">
                <div className="relative aspect-[3/4] rounded-2xl md:rounded-3xl overflow-hidden border border-white/[0.08] group-hover:border-red-500/40 bg-[#0c0f17] transition-all duration-300 shadow-lg group-hover:shadow-[0_15px_35px_rgba(0,0,0,0.85)]">
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
                    <div className="w-full h-full bg-gradient-to-br from-red-950 to-black flex items-center justify-center">
                      <ImageIcon className="w-10 h-10 text-red-400" />
                    </div>
                  )}

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition duration-300 flex flex-col justify-end p-4">
                    <p className="text-xs sm:text-sm text-white line-clamp-2 font-bold leading-tight">
                      {poster.caption || "View poster"}
                    </p>
                    <div className="flex items-center gap-3.5 mt-2.5 text-[11px] text-gray-300 font-bold">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5 text-rose-500 fill-current" />
                        {poster.likesCount || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                        {poster.commentsCount || 0}
                      </span>
                    </div>
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
