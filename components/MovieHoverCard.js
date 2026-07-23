"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/firebase";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import AuthModal from "@/components/AuthModal";
import { PlayIcon, WishlistIcon, TrophyIcon } from "@/components/Icon";

export default function MovieHoverCard({ movie }) {
  const { user } = useAuth();
  const [isHovered, setIsHovered] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const hoverTimeoutRef = useRef(null);

  // Generate a random match percentage (e.g. 94% - 99%) based on movie ID hash to keep it consistent
  const matchPercentage = (() => {
    let hash = 0;
    const str = movie.id || "";
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return 94 + (Math.abs(hash) % 6);
  })();

  useEffect(() => {
    const checkSaved = async () => {
      if (!user || !movie.id) return;
      const ref = doc(db, "users", user.uid, "wishlist", movie.id);
      const snap = await getDoc(ref);
      setSaved(snap.exists());
    };
    checkSaved();
  }, [user, movie.id]);

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
    if (isTouchDevice) return; // Disable hover overlay on touch/mobile viewports
    clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 450); // Delay hover state to prevent aggressive activation on scroll
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

  const poster = movie.posterImage || movie.bannerImage || "https://images.unsplash.com/photo-1524985069026-dd778a71c7b4";

  return (
    <>
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative w-[160px] md:w-[220px] lg:w-[260px] aspect-[2/3] shrink-0"
      >
        {/* Base Card */}
        <Link href={`/movie/${movie.id}`} className="block w-full h-full">
          <div className="relative w-full h-full rounded-2xl md:rounded-3xl overflow-hidden border border-white/15 bg-gradient-to-br from-[#0b1328] to-[#04070f] transition-all duration-300">
            {poster.startsWith("data:image/") ? (
              <img
                src={poster}
                alt={movie.title || "Movie"}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <Image
                src={poster}
                alt={movie.title || "Movie"}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 160px, (max-width: 1024px) 220px, 260px"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#04070f] via-transparent to-transparent" />

            {/* Base Title overlay */}
            <div className="absolute bottom-4 left-4 right-4 z-10">
              <h3 className="text-sm md:text-base font-bold text-gray-200 line-clamp-1">
                {movie.title}
              </h3>
              {movie.rating && (
                <div className="text-[10px] md:text-xs text-yellow-400 font-bold mt-1">
                  ⭐ {movie.rating.toFixed(1)}
                </div>
              )}
            </div>
          </div>
        </Link>

        {/* Hover Hover Zoom & Details */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 0 }}
              animate={{ scale: 1.15, opacity: 1, y: -20 }}
              exit={{ scale: 0.95, opacity: 0, y: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 25 }}
              className="absolute top-0 left-0 w-full z-50 bg-[#080d1e] rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-cyan-500/30"
              style={{ originY: 0.3 }}
            >
              {/* Media Section */}
              <Link href={`/movie/${movie.id}`} className="block relative aspect-video w-full">
                {movie.videoUrl ? (
                  <video
                    src={movie.videoUrl}
                    autoPlay
                    muted
                    loop
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
                      sizes="260px"
                    />
                  )
                )}
                {/* Visual Mute Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#080d1e] via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 text-xs bg-black/60 px-2.5 py-1 rounded backdrop-blur font-black tracking-widest text-cyan-300">
                  PREVIEW
                </div>
              </Link>

              {/* Detail Info Panel */}
              <div className="p-4 space-y-3 bg-[#080d1e]">
                {/* Row 1: Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/movie/${movie.id}`}
                      className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:bg-cyan-100 transition-colors"
                      title="Play Movie"
                    >
                      <PlayIcon className="w-3.5 h-3.5 text-black fill-current ml-0.5" />
                    </Link>
                    <button
                      onClick={toggleWishlist}
                      className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${saved
                          ? "bg-red-500 border-red-500 text-white"
                          : "border-white/20 hover:border-white/40 text-gray-300 hover:text-white"
                        }`}
                    >
                      {saved ? (
                        <WishlistIcon className="w-3.5 h-3.5 text-white fill-current" />
                      ) : (
                        <svg className="w-3.5 h-3.5 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                      )}
                    </button>
                    <Link
                      href={`/movie/${movie.id}/quiz`}
                      className="w-8 h-8 rounded-full border border-white/20 hover:border-white/40 text-gray-300 hover:text-white flex items-center justify-center transition-colors"
                      title="Play Trivia Quiz"
                    >
                      <TrophyIcon className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                    </Link>
                  </div>
                  <div className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-gray-400 font-bold uppercase tracking-wider">
                    {movie.genre || "Drama"}
                  </div>
                </div>

                {/* Row 2: Match Score & Rating */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-green-400 font-bold">{matchPercentage}% Match</span>
                  {movie.year && <span className="text-gray-400">{movie.year}</span>}
                  {movie.rating && (
                    <span className="text-yellow-400 font-medium">⭐ {movie.rating.toFixed(1)}</span>
                  )}
                </div>

                {/* Row 3: Synopsis / Title */}
                <div>
                  <h4 className="text-sm font-black text-white line-clamp-1">
                    {movie.title}
                  </h4>
                  <p className="text-[11px] text-gray-400 line-clamp-2 mt-1 font-medium leading-normal">
                    {movie.tagline || movie.description || "Stream this cinematic highlight on Chakradhar STREAM."}
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
