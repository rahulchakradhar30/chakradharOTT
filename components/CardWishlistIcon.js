"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";

import { WishlistIcon } from "@/components/Icon";

export default function CardWishlistIcon({ movieId }) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const check = async () => {
      if (!user) {
        setSaved(false);
        return;
      }

      const ref = doc(db, "users", user.uid, "wishlist", movieId);
      const snap = await getDoc(ref);
      setSaved(snap.exists());
    };

    check();
  }, [user, movieId]);

  if (!user) return null;

  return (
    <div className="absolute top-3 right-3 drop-shadow-lg">
      {saved ? <WishlistIcon className="w-5 h-5 text-rose-500 fill-current" /> : null}
    </div>
  );
}