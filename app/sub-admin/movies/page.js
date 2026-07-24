"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebase";
import { collection, getDocs } from "firebase/firestore";
import Link from "next/link";
import SubAdminAccessGuard from "@/components/admin/SubAdminAccessGuard";
import { MovieIcon, PlusIcon, SearchIcon } from "@/components/Icon";

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
            <h1 className="admin-title flex items-center gap-2">
              <MovieIcon className="w-8 h-8 text-cyan-400" />
              <span>Movies Studio</span>
            </h1>
            <p className="admin-lead">View and manage movies published on the platform.</p>
          </div>

          <Link
            href="/sub-admin/movies/create"
            className="admin-button bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs uppercase px-5 py-3 rounded-2xl flex items-center gap-2 w-fit shadow-lg shadow-cyan-500/20"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Upload New Movie</span>
          </Link>
        </div>

        <div className="admin-surface rounded-2xl p-4 flex items-center gap-3">
          <SearchIcon className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search movie title or genre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-input focus-ring text-xs text-white w-full max-w-md bg-white/5"
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="admin-surface p-4 rounded-2xl animate-pulse space-y-3">
                <div className="aspect-video bg-white/10 rounded-xl" />
                <div className="h-4 bg-white/10 rounded w-1/3" />
                <div className="h-5 bg-white/10 rounded w-3/4" />
                <div className="h-3 bg-white/10 rounded w-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="admin-empty text-xs text-gray-400">No movies found.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((m) => (
              <Link
                key={m.id}
                href={`/sub-admin/movies/edit/${m.id}`}
                className="admin-surface p-4 rounded-2xl space-y-3 flex flex-col justify-between hover:border-cyan-500/40 border border-transparent transition-all duration-200 cursor-pointer group"
              >
                <div className="space-y-2">
                  <div className="aspect-video rounded-xl bg-black/40 overflow-hidden relative border border-white/10">
                    {m.posterImage || m.bannerImage ? (
                      <img src={m.posterImage || m.bannerImage} alt={m.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="flex items-center justify-center h-full text-xs text-gray-500">No Preview</div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <span className="bg-cyan-500 text-black font-bold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full shadow-lg">Edit Movie</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-cyan-400">{m.genre || "Uncategorized"}</span>
                    <h3 className="text-sm font-bold text-white truncate">{m.title}</h3>
                    <p className="text-xs text-gray-400 line-clamp-2 mt-0.5">{m.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </SubAdminAccessGuard>
  );
}
