"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebase";
import { doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import AuthModal from "@/components/AuthModal";
import { motion } from "framer-motion";
import { WishlistIcon } from "@/components/Icon";

export default function WishlistButton({ movie }) {
  const { user } = useAuth();

  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  /* ---------- Check if already saved ---------- */

  useEffect(() => {
    const checkWishlist = async () => {
      if (!user) {
        setSaved(false);
        setLoading(false);
        return;
      }

      const docRef = doc(
        db,
        "users",
        user.uid,
        "wishlist",
        movie.id
      );

      const snap = await getDoc(docRef);
      setSaved(snap.exists());
      setLoading(false);
    };

    checkWishlist();
  }, [user, movie.id]);

  /* ---------- Toggle Wishlist ---------- */

  const toggleWishlist = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    const docRef = doc(
      db,
      "users",
      user.uid,
      "wishlist",
      movie.id
    );

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

  if (loading) return null;

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={toggleWishlist}
        className={`flex items-center gap-2 px-4 py-2 rounded-full border transition ${
          saved
            ? "bg-red-600 border-red-600"
            : "bg-white/10 border-white/20 hover:bg-white/20"
        }`}
      >
        {saved ? (
          <WishlistIcon className="w-4 h-4 text-white fill-current" />
        ) : (
          <WishlistIcon className="w-4 h-4 text-gray-300" />
        )}
        <span className="text-sm hidden sm:block">
          {saved ? "Saved" : "My List"}
        </span>
      </motion.button>

      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </>
  );
}