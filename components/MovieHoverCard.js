"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/firebase";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import AuthModal from "@/components/AuthModal";
import { Play, Heart, Trophy, Star, Plus, Check } from "lucide-react";

export default function MovieHoverCard({ movie }) {
  const { user } = useAuth();
  const [isHovered, setIsHovered] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const hoverTimeoutRef = useRef(null);

  // Generate a consistent match percentage (94% - 99%)
  const matchPercentage = (() => {
    let hash = 0;
    const str = movie?.id || "";
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return 94 + (Math.abs(hash) % 6);
  })();

  useEffect(() => {
    const checkSaved = async () => {
      if (!user || !movie?.id) return;
      try {
        const ref = doc(db, "users", user.uid, "wishlist", movie.id);
        const snap = await getDoc(ref);
        setSaved(snap.exists());
      } catch (e) {
        console.warn("Wishlist check skipped:", e);
      }
    };
    checkSaved();
  }, [user, movie?.id]);

  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice(
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0 ||
        window.innerWidth < 768
      );
    };
    checkTouch();
    window.addEventListener("resize", checkTouch);
    return () => window.removeEventListener("resize", checkTouch);
  }, []);

  const handleMouseEnter = () => {
    if (isTouchDevice) return;
    clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 350);
  };

  const handleMouseLeave = () => {
    clearTimeout(hoverTimeoutRef.current);
    setIsHovered(false);
  };

  const toggleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      setShowAuthModal(true);
      return;
    }

    const docRef = doc(db, "users", user.uid, "wishlist", movie.id);
    if (saved) {
      await deleteDoc(docRef);
      setSaved(false);
    } else {
      await setDoc(docRef, {
        movieId: movie.id,
        title: movie.title,
        posterImage: movie.posterImage || null,
        addedAt: new Date(),
      });
      setSaved(true);
    }
  };

  useEffect(() => {
    return () => clearTimeout(hoverTimeoutRef.current);
  }, []);

  const poster =
    movie.posterImage ||
    movie.bannerImage ||
    "https://images.unsplash.com/photo-1524985069026-dd778a71c7b4";

  return (
    <>
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative w-[155px] sm:w-[190px] md:w-[220px] lg:w-[250px] aspect-[2/3] shrink-0 select-none group"
      >
        {/* Base Card */}
        <Link href={`/movie/${movie.id}`} className="block w-full h-full">
          <div className="relative w-full h-full rounded-2xl md:rounded-3xl overflow-hidden border border-white/[0.08] group-hover:border-red-500/40 bg-[#0c0f17] shadow-lg group-hover:shadow-[0_12px_30px_rgba(0,0,0,0.8)] transition-all duration-300">
            {poster.startsWith("data:image/") ? (
              <img
                src={poster}
                alt={movie.title || "Movie"}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <Image
                src={poster}
                alt={movie.title || "Movie"}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 155px, (max-width: 768px) 190px, (max-width: 1024px) 220px, 250px"
              />
            )}
            
            {/* Ambient Multi-Layer Vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />
            <div className="absolute inset-0 bg-radial-gradient from-transparent to-black/60 opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* Base Title overlay */}
            <div className="absolute bottom-3 left-3 right-3 z-10 space-y-1">
              <h3 className="text-xs md:text-sm font-extrabold text-white line-clamp-1 group-hover:text-red-400 transition-colors">
                {movie.title}
              </h3>
              <div className="flex items-center justify-between text-[10px] md:text-xs">
                {movie.genre && (
                  <span className="text-gray-400 font-medium truncate max-w-[65%]">
                    {movie.genre}
                  </span>
                )}
                {movie.rating ? (
                  <div className="flex items-center gap-1 text-amber-400 font-bold">
                    <Star className="w-3 h-3 fill-current" />
                    <span>{Number(movie.rating).toFixed(1)}</span>
                  </div>
                ) : (
                  <span className="text-emerald-400 font-bold">{matchPercentage}% Match</span>
                )}
              </div>
            </div>
          </div>
        </Link>

        {/* Hover Zoom & Details Card */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 0 }}
              animate={{ scale: 1.18, opacity: 1, y: -24 }}
              exit={{ scale: 0.95, opacity: 0, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="absolute top-0 left-0 w-full z-50 bg-[#0a0d14] rounded-3xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.95)] border border-red-500/40"
              style={{ originY: 0.3 }}
            >
              {/* Media Section */}
              <Link href={`/movie/${movie.id}`} className="block relative aspect-video w-full bg-black">
                {movie.videoUrl ? (
                  <video
                    src={movie.videoUrl}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (movie.bannerImage || poster).startsWith("data:image/") ? (
                    <img
                      src={movie.bannerImage || poster}
                      alt={movie.title || "Movie"}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <Image
                      src={movie.bannerImage || poster}
                      alt={movie.title || "Movie"}
                      fill
                      className="object-cover"
                      sizes="280px"
                    />
                  )
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0d14] via-transparent to-transparent" />
                <div className="absolute top-2 left-2 text-[9px] bg-red-600/90 text-white font-black px-2 py-0.5 rounded-full tracking-wider uppercase shadow-md">
                  Preview
                </div>
              </Link>

              {/* Detail Info Panel */}
              <div className="p-3.5 space-y-2.5 bg-[#0a0d14]">
                {/* Actions Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/movie/${movie.id}`}
                      className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-md"
                      title="Play Movie"
                    >
                      <Play className="w-3 h-3 fill-current ml-0.5" />
                    </Link>
                    <button
                      onClick={toggleWishlist}
                      className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all ${
                        saved
                          ? "bg-red-600 border-red-500 text-white shadow-md shadow-red-600/30"
                          : "border-white/20 hover:border-white/50 text-gray-300 hover:text-white bg-white/[0.06]"
                      }`}
                      title="Wishlist"
                    >
                      {saved ? (
                        <Check className="w-3.5 h-3.5 text-white" />
                      ) : (
                        <Plus className="w-3.5 h-3.5 text-gray-200" />
                      )}
                    </button>
                    <Link
                      href={`/movie/${movie.id}/quiz`}
                      className="w-7 h-7 rounded-full border border-white/20 hover:border-amber-400/60 bg-white/[0.06] text-gray-300 hover:text-amber-300 flex items-center justify-center transition-all"
                      title="Play Trivia Quiz"
                    >
                      <Trophy className="w-3 h-3 text-amber-400" />
                    </Link>
                  </div>
                  <div className="text-[9px] bg-white/[0.08] px-2 py-0.5 rounded-full text-gray-300 font-bold uppercase tracking-wider border border-white/10">
                    {movie.genre || "Drama"}
                  </div>
                </div>

                {/* Score & Rating */}
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-emerald-400 font-bold">{matchPercentage}% Match</span>
                  {movie.year && <span className="text-gray-400">{movie.year}</span>}
                  {movie.rating && (
                    <span className="text-amber-400 font-bold flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 fill-current" />
                      {Number(movie.rating).toFixed(1)}
                    </span>
                  )}
                </div>

                {/* Title & Tagline */}
                <div>
                  <h4 className="text-xs font-black text-white line-clamp-1">
                    {movie.title}
                  </h4>
                  <p className="text-[10px] text-gray-400 line-clamp-2 mt-0.5 leading-tight">
                    {movie.tagline || movie.description || "Experience this cinematic highlight on Chakradhar Stream."}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
}
