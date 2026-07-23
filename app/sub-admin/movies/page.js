"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import Link from "next/link";
import SubAdminAccessGuard from "@/components/admin/SubAdminAccessGuard";

export default function SubAdminMovies() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchMovies = async () => {
    try {
      const snap = await getDocs(collection(db, "movies"));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMovies(list);
    } catch (err) {
      console.warn("Failed to fetch movies:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovies();
  }, []);

  const filtered = movies.filter((m) =>
    (m.title || "").toLowerCase().includes(search.toLowerCase()) ||
    (m.genre || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SubAdminAccessGuard moduleKey="movies">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="admin-kicker text-cyan-300">Catalog Management</p>
            <h1 className="admin-title">Movies Studio</h1>
            <p className="admin-lead">View and manage movies published on the platform.</p>
          </div>

          <Link
            href="/sub-admin/movies/create"
            className="admin-button bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs uppercase px-5 py-3 rounded-2xl flex items-center gap-2 w-fit shadow-lg shadow-cyan-500/20"
          >
            <span>➕</span> Upload New Movie
          </Link>
        </div>

        <div className="admin-surface rounded-2xl p-4">
          <input
            type="text"
            placeholder="Search movie title or genre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-input focus-ring text-xs text-white w-full max-w-md bg-white/5"
          />
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-gray-400">Loading catalog...</div>
        ) : filtered.length === 0 ? (
          <div className="admin-empty text-xs text-gray-400">No movies found.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((m) => (
              <div key={m.id} className="admin-surface p-4 rounded-2xl space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="aspect-video rounded-xl bg-black/40 overflow-hidden relative border border-white/10">
                    {m.posterImage || m.bannerImage ? (
                      <img src={m.posterImage || m.bannerImage} alt={m.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex items-center justify-center h-full text-xs text-gray-500">No Preview</div>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-cyan-400">{m.genre || "Uncategorized"}</span>
                    <h3 className="text-sm font-bold text-white truncate">{m.title}</h3>
                    <p className="text-xs text-gray-400 line-clamp-2 mt-0.5">{m.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SubAdminAccessGuard>
  );
}
