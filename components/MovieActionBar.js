"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { db } from "@/firebase";
import { doc, updateDoc, increment } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";
import WishlistButton from "@/components/WishlistButton";
import {
  ThumbsUpIcon,
  ThumbsDownIcon,
  ShareIcon,
  RobotIcon,
  UserIcon,
} from "@/components/Icon";

export default function MovieActionBar({ movieId, title, initialLikes = 0, posterImage }) {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [likes, setLikes] = useState(initialLikes);
  const [userVote, setUserVote] = useState(null); // 'like', 'dislike', or null
  const [liking, setLiking] = useState(false);

  // Load user vote from localStorage for persistent voting feel
  useEffect(() => {
    if (!movieId) return;
    const storedVote = localStorage.getItem(`vote_movie_${movieId}`);
    if (storedVote) {
      setUserVote(storedVote);
    }
  }, [movieId]);

  // HANDLE REAL LIKE TOGGLE
  const handleLike = async () => {
    if (liking) return;
    try {
      setLiking(true);

      if (userVote === "like") {
        // Undo like
        setUserVote(null);
        setLikes((prev) => Math.max(0, prev - 1));
        localStorage.removeItem(`vote_movie_${movieId}`);

        await updateDoc(doc(db, "movies", movieId), {
          likesCount: increment(-1),
        });
      } else {
        // Apply like
        const isSwitching = userVote === "dislike";
        setUserVote("like");
        setLikes((prev) => prev + (isSwitching ? 1 : 1));
        localStorage.setItem(`vote_movie_${movieId}`, "like");

        await updateDoc(doc(db, "movies", movieId), {
          likesCount: increment(1),
        });
        addToast("Added to your liked movies!", "success");
      }
    } catch (err) {
      console.warn("Failed to update like count:", err);
    } finally {
      setLiking(false);
    }
  };

  // HANDLE DISLIKE TOGGLE
  const handleDislike = () => {
    if (userVote === "dislike") {
      setUserVote(null);
      localStorage.removeItem(`vote_movie_${movieId}`);
    } else {
      if (userVote === "like") {
        setLikes((prev) => Math.max(0, prev - 1));
        updateDoc(doc(db, "movies", movieId), {
          likesCount: increment(-1),
        }).catch(console.warn);
      }
      setUserVote("dislike");
      localStorage.setItem(`vote_movie_${movieId}`, "dislike");
      addToast("Thanks for your feedback", "info");
    }
  };

  // HANDLE SHARE ACTION
  const handleShare = async () => {
    const shareData = {
      title: title || "Chakradhar Stream Movie",
      text: `Watch ${title} on Chakradhar Stream!`,
      url: typeof window !== "undefined" ? window.location.href : "",
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareData.url);
        addToast("Movie link copied to clipboard!", "success");
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        addToast("Link copied to clipboard!", "success");
      }
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-white/10 pb-4 my-2">
      {/* LEFT: JOIN WATCH PARTY / PREMIERE BUTTON (High-Contrast Cyan with Visible Bold Text) */}
      <div className="flex items-center gap-3">
        <Link
          href={`/watch-party?movie=${movieId}`}
          className="bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs md:text-sm py-2.5 px-6 rounded-full transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2 active:scale-95"
        >
          <UserIcon className="w-4 h-4 text-black stroke-[2.5]" />
          <span className="tracking-wide">Watch Party / Premiere</span>
        </Link>
      </div>

      {/* RIGHT: CONNECTED FUNCTIONAL ACTION PILLS */}
      <div className="flex flex-wrap items-center gap-2.5">
        
        {/* 1. LIKE / DISLIKE SPLIT PILL */}
        <div className="flex items-center bg-[#272727] hover:bg-[#313131] rounded-full text-xs font-bold text-white overflow-hidden border border-white/15 shadow-sm">
          <button
            type="button"
            onClick={handleLike}
            disabled={liking}
            className={`px-4 py-2.5 flex items-center gap-2 transition border-r border-white/15 ${
              userVote === "like"
                ? "bg-cyan-500/20 text-cyan-300 font-black"
                : "hover:bg-white/10 text-white"
            }`}
            title="Like this movie"
          >
            <ThumbsUpIcon className={`w-4 h-4 ${userVote === "like" ? "text-cyan-400 fill-cyan-400" : "text-white"}`} />
            <span>{likes > 0 ? likes.toLocaleString() : "Like"}</span>
          </button>

          <button
            type="button"
            onClick={handleDislike}
            className={`px-3.5 py-2.5 transition ${
              userVote === "dislike"
                ? "bg-rose-500/20 text-rose-300"
                : "hover:bg-white/10 text-white"
            }`}
            title="Dislike"
          >
            <ThumbsDownIcon className={`w-4 h-4 ${userVote === "dislike" ? "text-rose-400 fill-rose-400" : "text-white"}`} />
          </button>
        </div>

        {/* 2. SHARE BUTTON */}
        <button
          type="button"
          onClick={handleShare}
          className="bg-[#272727] hover:bg-[#313131] border border-white/15 text-xs font-bold px-4 py-2.5 rounded-full flex items-center gap-2 transition text-white shadow-sm active:scale-95"
          title="Share Movie Link"
        >
          <ShareIcon className="w-4 h-4 text-white" />
          <span>Share</span>
        </button>

        {/* 3. ASK AI GUIDE BUTTON */}
        <Link
          href={`/ai-assistant?prompt=${encodeURIComponent(`Tell me about the movie ${title}`)}`}
          className="bg-[#272727] hover:bg-[#313131] border border-white/15 text-xs font-bold px-4 py-2.5 rounded-full flex items-center gap-2 transition text-white shadow-sm active:scale-95"
          title="Ask AI Guide about this movie"
        >
          <RobotIcon className="w-4 h-4 text-cyan-400" />
          <span>Ask AI</span>
        </Link>

        {/* 4. WATCHLIST / SAVE BUTTON */}
        <div className="bg-[#272727] hover:bg-[#313131] border border-white/15 text-xs font-bold px-3 py-1.5 rounded-full flex items-center transition shadow-sm">
          <WishlistButton
            movie={{
              id: movieId,
              title,
              posterImage,
            }}
          />
        </div>
      </div>
    </div>
  );
}
