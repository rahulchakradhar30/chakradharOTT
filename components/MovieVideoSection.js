"use client";

import { useState, useCallback, useRef } from "react";
import { db } from "@/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import VideoPlayer from "@/components/VideoPlayer";
import dynamic from "next/dynamic";

const Toast = dynamic(() => import("@/components/Toast").then(mod => mod.Toast), {
  ssr: false
});

export default function MovieVideoSection({
  movieId,
  title,
  embedLink,
  videoUrl,
  posterImage,
}) {
  const { user } = useAuth();
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasTracked, setHasTracked] = useState(false);

  // Track watch history
  const trackWatchHistory = useCallback(
    async (currentTime) => {
      if (!user || !movieId || hasTracked) return;

      try {
        const continueWatchingRef = doc(
          db,
          `users/${user.uid}/continueWatching/${movieId}`
        );

        await setDoc(continueWatchingRef, {
          movieId,
          title,
          posterImage,
          progress: Math.floor(currentTime),
          lastWatched: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true });

        setHasTracked(true);
      } catch (err) {
        console.error("Error tracking watch history:", err);
      }
    },
    [user, movieId, title, posterImage, hasTracked]
  );

  const handleTimeUpdate = (currentTime) => {
    // Track after 30 seconds of watching
    if (currentTime > 30 && !hasTracked) {
      trackWatchHistory(currentTime);
    }
  };

  // If we have a direct video URL, use the custom player
  if (videoUrl) {
    return (
      <section className="glass-card rounded-[2rem] overflow-hidden border border-white/15 shadow-[0_8px_60px_rgba(0,0,0,0.32)] transition duration-500 hover:border-cyan-300/40">
        <div className="aspect-video">
          <VideoPlayer
            ref={videoRef}
            src={videoUrl}
            poster={posterImage}
            title={title}
            autoPlay={false}
            onTimeUpdate={handleTimeUpdate}
            onPlayPauseChange={setIsPlaying}
            movieId={movieId}
          />
        </div>
      </section>
    );
  }

  // Fall back to iframe for embedded content
  if (embedLink) {
    return (
      <section className="glass-card rounded-[2rem] overflow-hidden border border-white/15 shadow-[0_8px_60px_rgba(0,0,0,0.32)] transition duration-500 hover:border-cyan-300/40">
        <div className="aspect-video">
          <iframe
            src={embedLink}
            className="w-full h-full rounded-3xl"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            title={title || "Movie stream"}
          />
        </div>
      </section>
    );
  }

  // No video source available
  return (
    <section className="glass-card rounded-[2rem] overflow-hidden border border-white/15 shadow-[0_8px_60px_rgba(0,0,0,0.32)] transition duration-500 hover:border-cyan-300/40">
      <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-white/5 to-white/2">
        <div className="text-center">
          <p className="text-3xl mb-2">🎬</p>
          <p className="text-gray-300 font-medium">Video not available</p>
          <p className="text-gray-500 text-sm mt-1">Check back soon for streaming access</p>
        </div>
      </div>
    </section>
  );
}
