"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  doc,
  getDoc,
  updateDoc,
  increment,
  collection,
  addDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import AuthModal from "@/components/AuthModal";

export default function PosterDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [poster, setPoster] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);

  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  const [showAuthModal, setShowAuthModal] = useState(false);

  // Fetch poster data
  useEffect(() => {
    if (!id) return;
    const fetchPoster = async () => {
      try {
        const snap = await getDoc(doc(db, "posters", id));
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() };
          setPoster(data);
          setLikeCount(data.likesCount || 0);
        }
      } catch (err) {
        console.error("Error fetching poster:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPoster();
  }, [id]);

  // Check if user has liked
  useEffect(() => {
    if (!id || !user?.uid) return;
    const checkLike = async () => {
      try {
        const q = query(
          collection(db, "poster_likes"),
          where("posterId", "==", id),
          where("userId", "==", user.uid)
        );
        const snap = await getDocs(q);
        setLiked(!snap.empty);
      } catch (err) {
        console.error("Check like error:", err);
      }
    };
    checkLike();
  }, [id, user]);

  // Real-time comments
  useEffect(() => {
    if (!id) return;

    const q = query(
      collection(db, "poster_comments"),
      where("posterId", "==", id)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      // Sort client-side
      data.sort((a, b) => {
        const ta = a.createdAt?.toDate?.()?.getTime?.() || 0;
        const tb = b.createdAt?.toDate?.()?.getTime?.() || 0;
        return tb - ta;
      });
      setComments(data);
    });

    return () => unsub();
  }, [id]);

  const handleLikeToggle = async () => {
    if (!user) return setShowAuthModal(true);
    if (likeLoading) return;

    setLikeLoading(true);
    try {
      if (liked) {
        // Unlike
        const q = query(
          collection(db, "poster_likes"),
          where("posterId", "==", id),
          where("userId", "==", user.uid)
        );
        const snap = await getDocs(q);
        for (const d of snap.docs) {
          await deleteDoc(doc(db, "poster_likes", d.id));
        }
        await updateDoc(doc(db, "posters", id), { likesCount: increment(-1) });
        setLiked(false);
        setLikeCount((prev) => Math.max(0, prev - 1));
      } else {
        // Like
        await addDoc(collection(db, "poster_likes"), {
          posterId: id,
          userId: user.uid,
          createdAt: serverTimestamp(),
        });
        await updateDoc(doc(db, "posters", id), { likesCount: increment(1) });
        setLiked(true);
        setLikeCount((prev) => prev + 1);
      }
    } catch (err) {
      console.error("Like toggle error:", err);
    } finally {
      setLikeLoading(false);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!user) return setShowAuthModal(true);
    if (!commentText.trim() || commentLoading) return;

    setCommentLoading(true);
    try {
      await addDoc(collection(db, "poster_comments"), {
        posterId: id,
        userId: user.uid,
        name: user.displayName || user.email?.split("@")[0] || "User",
        photoURL: user.photoURL || "",
        comment: commentText.trim(),
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "posters", id), { commentsCount: increment(1) });
      setCommentText("");
    } catch (err) {
      console.error("Comment submit error:", err);
      alert("Failed to post comment.");
    } finally {
      setCommentLoading(false);
    }
  };

  const getInitials = (name = "U") => {
    const parts = name.split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card rounded-3xl px-6 py-5 shadow-2xl text-center max-w-sm w-full">
          <div className="mx-auto mb-4 h-10 w-10 rounded-full border-4 border-cyan-400/30 border-t-cyan-400 animate-spin" />
          <p className="font-semibold text-white">Loading poster...</p>
        </div>
      </div>
    );
  }

  if (!poster) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-6xl mb-4">🖼️</p>
          <h2 className="text-2xl font-bold mb-2">Poster Not Found</h2>
          <Link href="/posters" className="text-cyan-300 hover:underline">← Back to Gallery</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white px-4 md:px-8 lg:px-12 py-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(0,212,255,0.12),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(255,77,141,0.08),_transparent_30%)]" />

      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Back Link */}
        <Link href="/posters" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-cyan-300 transition mb-6">
          ← Back to Gallery
        </Link>

        <div className="grid lg:grid-cols-[1fr,400px] gap-8">
          {/* POSTER IMAGE */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="relative rounded-[2rem] overflow-hidden border border-white/15 shadow-2xl"
          >
            <div className="relative aspect-[3/4]">
              {poster.imageUrl?.startsWith("data:") ? (
                <img src={poster.imageUrl} alt={poster.caption} className="w-full h-full object-cover" />
              ) : poster.imageUrl ? (
                <Image
                  src={poster.imageUrl}
                  alt={poster.caption || "Poster"}
                  fill
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-cyan-900 to-blue-900 flex items-center justify-center text-6xl">🖼️</div>
              )}
            </div>
          </motion.div>

          {/* DETAILS & COMMENTS PANEL */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15, duration: 0.35 }}
            className="glass-card rounded-[2rem] p-5 md:p-6 flex flex-col max-h-[85vh] lg:sticky lg:top-24"
          >
            {/* Caption */}
            <div className="mb-4 pb-4 border-b border-white/10">
              <p className="text-gray-100 text-sm md:text-base whitespace-pre-line leading-relaxed">
                {poster.caption}
              </p>

              {poster.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {poster.tags.map((tag, i) => (
                    <span key={i} className="text-[11px] px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-400/20">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <p className="text-[11px] text-gray-500 mt-3">
                {poster.createdAt?.toDate?.().toLocaleDateString?.("en-IN", { day: "numeric", month: "long", year: "numeric" }) || ""}
              </p>
            </div>

            {/* Like + Movie Link */}
            <div className="flex items-center gap-4 mb-4 pb-4 border-b border-white/10">
              <button
                onClick={handleLikeToggle}
                disabled={likeLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm transition ${
                  liked
                    ? "bg-red-500/20 text-red-400 border border-red-400/30 hover:bg-red-500/30"
                    : "bg-white/10 text-gray-300 border border-white/15 hover:bg-white/15"
                }`}
              >
                <AnimatePresence mode="wait">
                  <motion.span
                    key={liked ? "liked" : "notliked"}
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.5 }}
                    transition={{ duration: 0.15 }}
                  >
                    {liked ? "❤️" : "🤍"}
                  </motion.span>
                </AnimatePresence>
                {likeCount}
              </button>

              <span className="text-sm text-gray-400">💬 {comments.length} comments</span>

              {poster.movieId && (
                <Link
                  href={`/movie/${poster.movieId}`}
                  className="ml-auto bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 px-4 py-2 rounded-full text-xs font-semibold transition"
                >
                  🎬 Watch Movie
                </Link>
              )}
            </div>

            {/* Comment Form */}
            <form onSubmit={handleCommentSubmit} className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder={user ? "Add a comment..." : "Login to comment..."}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="flex-1 bg-black/30 border border-white/15 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-400/40 transition"
              />
              <button
                type="submit"
                disabled={commentLoading || !commentText.trim()}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 disabled:opacity-50 px-4 py-2.5 rounded-xl text-sm font-semibold transition"
              >
                {commentLoading ? "..." : "Post"}
              </button>
            </form>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {comments.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No comments yet. Be the first!</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="flex gap-3 group">
                    {c.photoURL && c.photoURL.startsWith("http") ? (
                      <Image
                        src={c.photoURL}
                        alt="avatar"
                        width={32}
                        height={32}
                        className="rounded-full object-cover w-8 h-8 min-w-[32px]"
                      />
                    ) : (
                      <div className="w-8 h-8 min-w-[32px] rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white text-[10px] font-bold">
                        {getInitials(c.name)}
                      </div>
                    )}
                    <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-xs font-semibold text-gray-200">{c.name}</p>
                        <p className="text-[10px] text-gray-500">
                          {c.createdAt?.toDate?.().toLocaleDateString?.("en-IN", { day: "numeric", month: "short" }) || ""}
                        </p>
                      </div>
                      <p className="text-sm text-gray-300">{c.comment}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}
