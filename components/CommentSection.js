"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import AuthModal from "@/components/AuthModal";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

export default function CommentSection({ movieId }) {
  const { user } = useAuth();

  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [replyText, setReplyText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "comments"),
      where("movieId", "==", movieId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Sort comments client-side to avoid composite index requirements
      const sorted = data.sort((a, b) => {
        const timeA = a.timestamp?.toDate?.() || new Date(a.timestamp || 0);
        const timeB = b.timestamp?.toDate?.() || new Date(b.timestamp || 0);
        return timeB - timeA;
      });

      setComments(sorted);
    });

    return () => unsubscribe();
  }, [movieId]);

  const getInitials = (name = "U") => {
    const parts = name.split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return setShowAuthModal(true);
    if (!text.trim()) return;

    await addDoc(collection(db, "comments"), {
      movieId,
      userId: user.uid,
      name: user.displayName || "User",
      photoURL: user.photoURL || null,
      comment: text,
      timestamp: serverTimestamp(),
      parentId: null,
    });

    setText("");
  };

  const handleReplySubmit = async (parentId) => {
    if (!user) return setShowAuthModal(true);
    if (!replyText.trim()) return;

    await addDoc(collection(db, "comments"), {
      movieId,
      userId: user.uid,
      name: user.displayName || "User",
      photoURL: user.photoURL || null,
      comment: replyText,
      timestamp: serverTimestamp(),
      parentId,
    });

    setReplyText("");
    setReplyTo(null);
  };

  const topLevel = comments.filter((c) => !c.parentId);
  const replies = comments.filter((c) => c.parentId);

  return (
    <>
      <div className="mt-12 md:mt-16">
        <h2 className="text-xl md:text-2xl font-semibold mb-6 md:mb-8">
          Comments
        </h2>

        <form onSubmit={handleSubmit} className="mb-8 md:mb-10 flex gap-3">
          {user && (
            user.photoURL && user.photoURL.startsWith("http") ? (
              <Image
                src={user.photoURL}
                alt="avatar"
                width={40}
                height={40}
                className="rounded-full object-cover w-10 h-10 min-w-[40px]"
              />
            ) : (
              <div className="w-10 h-10 min-w-[40px] rounded-full bg-red-600 flex items-center justify-center text-white text-sm font-semibold">
                {getInitials(user.displayName || user.email)}
              </div>
            )
          )}

          <div className="flex-1">
            <textarea
              placeholder={user ? "Write a comment..." : "Login to comment..."}
              className="w-full p-3 rounded-xl bg-zinc-800 text-white resize-none text-sm md:text-base"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />

            <button
              type="submit"
              className="mt-3 bg-red-600 px-5 py-2 rounded-full text-sm hover:bg-red-700 transition"
            >
              Post
            </button>
          </div>
        </form>

        {/* Comments */}
        <div className="space-y-6 md:space-y-8">
          {topLevel.map((c) => (
            <div key={c.id} className="flex gap-3">

              {c.photoURL && c.photoURL.startsWith("http") ? (
                <Image
                  src={c.photoURL}
                  alt="avatar"
                  width={40}
                  height={40}
                  className="rounded-full object-cover w-10 h-10 min-w-[40px]"
                />
              ) : (
                <div className="w-10 h-10 min-w-[40px] rounded-full bg-red-600 flex items-center justify-center text-white text-sm font-semibold">
                  {getInitials(c.name)}
                </div>
              )}

              <div className="flex-1">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <p className="font-semibold text-sm mb-1">{c.name}</p>
                  <p className="text-gray-300 text-sm md:text-base">{c.comment}</p>
                </div>

                <button
                  onClick={() => setReplyTo(c.id)}
                  className="text-xs text-gray-400 mt-2 hover:text-white"
                >
                  Reply
                </button>

                {replyTo === c.id && (
                  <div className="mt-3">
                    <textarea
                      placeholder="Write a reply..."
                      className="w-full p-3 rounded-xl bg-zinc-800 text-white resize-none text-sm"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                    />
                    <button
                      onClick={() => handleReplySubmit(c.id)}
                      className="mt-2 bg-green-600 px-4 py-2 rounded-full text-sm hover:bg-green-700 transition"
                    >
                      Send
                    </button>
                  </div>
                )}

                {replies
                  .filter((r) => r.parentId === c.id)
                  .map((r) => (
                    <div key={r.id} className="flex gap-3 mt-4 ml-6">

                      {r.photoURL && r.photoURL.startsWith("http") ? (
                        <Image
                          src={r.photoURL}
                          alt="avatar"
                          width={32}
                          height={32}
                          className="rounded-full object-cover w-8 h-8 min-w-[32px]"
                        />
                      ) : (
                        <div className="w-8 h-8 min-w-[32px] rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-semibold">
                          {getInitials(r.name)}
                        </div>
                      )}

                      <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex-1">
                        <p className="font-semibold text-xs mb-1">{r.name}</p>
                        <p className="text-gray-300 text-xs md:text-sm">{r.comment}</p>
                      </div>

                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
}