"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebase";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

export default function AdminPostersPage() {
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
          console.error("API error fetching posters:", data.error);
        }
      } catch (err) {
        console.error("Failed to fetch posters:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPosters();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Delete this poster permanently?")) return;
    try {
      const res = await fetch(`/api/posters?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setPosters((prev) => prev.filter((p) => p.id !== id));
      } else {
        alert("Failed to delete poster: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete poster.");
    }
  };

  return (
    <div className="space-y-10 pb-16">
      {/* HEADER */}
      <motion.div initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} className="admin-toolbar items-end">
        <div className="admin-section max-w-2xl">
          <p className="admin-kicker text-cyan-300 text-sm tracking-widest">✦ Movie Posters</p>
          <h1 className="admin-title text-4xl font-black">Poster Gallery</h1>
          <p className="admin-lead text-gray-300">Create and manage Instagram-style movie poster posts. Users can like and comment on each poster.</p>
        </div>

        <div className="flex gap-3">
          <Link href="/admin" className="admin-button admin-button-secondary text-sm">
            ← Dashboard
          </Link>
          <Link href="/admin/posters/create" className="admin-button admin-button-primary text-sm">
            + New Poster
          </Link>
        </div>
      </motion.div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-white/15 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-wide text-gray-400">Total Posters</p>
          <p className="text-3xl font-black mt-2 bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">{posters.length}</p>
        </div>
        <div className="rounded-2xl border border-white/15 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-wide text-gray-400">Total Likes</p>
          <p className="text-3xl font-black mt-2 bg-gradient-to-r from-pink-500 to-rose-600 bg-clip-text text-transparent">
            {posters.reduce((sum, p) => sum + (p.likesCount || 0), 0)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/15 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-wide text-gray-400">Total Comments</p>
          <p className="text-3xl font-black mt-2 bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
            {posters.reduce((sum, p) => sum + (p.commentsCount || 0), 0)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/15 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-wide text-gray-400">With Movie Link</p>
          <p className="text-3xl font-black mt-2 bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-transparent">
            {posters.filter((p) => p.movieId).length}
          </p>
        </div>
      </div>

      {/* CONTENT */}
      {loading ? (
        <div className="text-center py-16">
          <div className="mx-auto h-10 w-10 rounded-full border-4 border-cyan-400/30 border-t-cyan-400 animate-spin" />
          <p className="mt-4 text-gray-400">Loading posters...</p>
        </div>
      ) : posters.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">🖼️</p>
          <p className="text-gray-400 mb-4">No posters created yet.</p>
          <Link href="/admin/posters/create" className="admin-button admin-button-primary text-sm inline-block">
            Create Your First Poster
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posters.map((poster, idx) => (
            <motion.div
              key={poster.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="rounded-2xl border border-white/15 bg-black/20 overflow-hidden group hover:border-cyan-300/30 transition"
            >
              {/* Image */}
              <div className="relative aspect-[4/5] overflow-hidden">
                {poster.imageUrl ? (
                  poster.imageUrl.startsWith("data:") ? (
                    <img src={poster.imageUrl} alt={poster.caption || "Poster"} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                  ) : (
                    <Image
                      src={poster.imageUrl}
                      alt={poster.caption || "Poster"}
                      fill
                      className="object-cover group-hover:scale-105 transition duration-500"
                    />
                  )
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-cyan-900 to-blue-900 flex items-center justify-center text-4xl">🖼️</div>
                )}
              </div>

              {/* Details */}
              <div className="p-4 space-y-3">
                <p className="text-sm text-gray-200 line-clamp-2">{poster.caption || "No caption"}</p>

                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span>❤️ {poster.likesCount || 0}</span>
                  <span>💬 {poster.commentsCount || 0}</span>
                  {poster.movieId && <span className="text-cyan-300">🎬 Linked</span>}
                </div>

                <p className="text-[11px] text-gray-500">
                  {poster.createdAt
                    ? new Date(poster.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "Unknown date"}
                </p>

                {poster.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {poster.tags.slice(0, 4).map((tag, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-400/20">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 mt-2">
                  <Link
                    href={`/admin/posters/edit/${poster.id}`}
                    className="flex-1 text-center bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 text-xs py-2 rounded-xl transition font-semibold"
                  >
                    Edit Poster
                  </Link>
                  <button
                    onClick={() => handleDelete(poster.id)}
                    className="flex-1 bg-red-600/20 hover:bg-red-600/40 text-red-300 text-xs py-2 rounded-xl transition font-semibold"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
