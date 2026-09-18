"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { db } from "@/firebase";
import { doc, updateDoc, increment } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";
import WishlistButton from "@/components/WishlistButton";
import {
  ThumbsUp,
  ThumbsDown,
  Share2,
  Bot,
  Users,
} from "lucide-react";

export default function MovieActionBar({ movieId, title, initialLikes = 0, posterImage }) {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [likes, setLikes] = useState(initialLikes);
  const [userVote, setUserVote] = useState(null);
  const [liking, setLiking] = useState(false);

  useEffect(() => {
    if (!movieId) return;
    try {
      const storedVote = localStorage.getItem(`vote_movie_${movieId}`);
      if (storedVote) {
        setUserVote(storedVote);
      }
    } catch (e) {
      console.warn("Storage vote check error:", e);
    }
  }, [movieId]);

  // Handle Like
  const handleLike = async () => {
    if (liking) return;
    try {
      setLiking(true);

      if (userVote === "like") {
        setUserVote(null);
        setLikes((prev) => Math.max(0, prev - 1));
        localStorage.removeItem(`vote_movie_${movieId}`);

        await updateDoc(doc(db, "movies", movieId), {
          likesCount: increment(-1),
        });
      } else {
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

  // Handle Dislike
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

  // Handle Share
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
    <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-white/[0.08] pb-4 my-2">
      {/* Left: Watch Party Button */}
      <div className="flex items-center gap-3">
        <Link
          href={`/watch-party?movie=${movieId}`}
          className="btn-luxury-primary text-xs sm:text-sm py-2.5 px-5 rounded-full flex items-center gap-2 shadow-lg"
        >
          <Users className="w-4 h-4 text-white" />
          <span className="font-bold tracking-wide">Watch Party / Premiere</span>
        </Link>
      </div>

      {/* Right: Action Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Like / Dislike Split Pill */}
        <div className="flex items-center bg-white/[0.06] hover:bg-white/[0.09] rounded-full text-xs font-bold text-white overflow-hidden border border-white/[0.1] shadow-inner transition-colors">
          <button
            type="button"
            onClick={handleLike}
            disabled={liking}
            className={`px-3.5 py-2 flex items-center gap-1.5 transition-colors border-r border-white/10 ${
              userVote === "like"
                ? "bg-red-600/30 text-red-300 font-bold"
                : "hover:bg-white/10 text-gray-200"
            }`}
            title="Like this movie"
          >
            <ThumbsUp
              className={`w-3.5 h-3.5 ${userVote === "like" ? "text-red-400 fill-current" : "text-gray-300"}`}
            />
            <span>{likes > 0 ? likes.toLocaleString() : "Like"}</span>
          </button>

          <button
            type="button"
            onClick={handleDislike}
            className={`px-3 py-2 transition-colors ${
              userVote === "dislike"
                ? "bg-rose-600/30 text-rose-300"
                : "hover:bg-white/10 text-gray-200"
            }`}
            title="Dislike"
          >
            <ThumbsDown
              className={`w-3.5 h-3.5 ${userVote === "dislike" ? "text-rose-400 fill-current" : "text-gray-300"}`}
            />
          </button>
        </div>

        {/* Share Button */}
        <button
          type="button"
          onClick={handleShare}
          className="bg-white/[0.06] hover:bg-white/[0.09] border border-white/[0.1] text-xs font-bold px-3.5 py-2 rounded-full flex items-center gap-1.5 transition text-gray-200 hover:text-white shadow-inner active:scale-95"
          title="Share Movie Link"
        >
          <Share2 className="w-3.5 h-3.5 text-gray-300" />
          <span>Share</span>
        </button>

        {/* Ask AI Guide */}
        <Link
          href={`/ai-assistant?prompt=${encodeURIComponent(`Tell me about the movie ${title}`)}`}
          className="bg-white/[0.06] hover:bg-white/[0.09] border border-white/[0.1] text-xs font-bold px-3.5 py-2 rounded-full flex items-center gap-1.5 transition text-gray-200 hover:text-white shadow-inner active:scale-95"
          title="Ask AI Guide about this movie"
        >
          <Bot className="w-3.5 h-3.5 text-red-400" />
          <span>Ask AI</span>
        </Link>

        {/* Wishlist Button */}
        <div className="bg-white/[0.06] hover:bg-white/[0.09] border border-white/[0.1] text-xs font-bold px-2.5 py-1.5 rounded-full flex items-center transition shadow-inner">
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
