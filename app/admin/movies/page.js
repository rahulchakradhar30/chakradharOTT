"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebase";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import Link from "next/link";
import { StarIcon, FlameIcon, TargetIcon } from "@/components/Icon";

export default function MoviesManagement() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [adminRole, setAdminRole] = useState("sub_admin");

  useEffect(() => {
    const checkRole = async () => {
      try {
        const res = await fetch("/api/admin/session");
        if (res.ok) {
          const data = await res.json();
          setAdminRole(data.role || "sub_admin");
        }
      } catch (err) {
        console.warn("Failed to check role:", err);
      }
    };
    checkRole();
  }, []);

  useEffect(() => {
    const fetchMovies = async () => {
      const snapshot = await getDocs(collection(db, "movies"));
      const movieList = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setMovies(movieList);
      setLoading(false);
    };
    fetchMovies();
  }, []);

  const visibleMovies = movies.filter((movie) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;

    return [movie.title, movie.genre, movie.director]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term));
  });

  const handleDelete = async (id) => {
    const confirmDelete = confirm("Are you sure you want to delete this movie?");
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "movies", id));
      setMovies((prev) => prev.filter((m) => m.id !== id));
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete movie");
    }
  };

  /* 🔁 Generic toggle for any field (isFeatured, isTrending) */
  const toggleField = async (id, field, currentValue) => {
    try {
      await updateDoc(doc(db, "movies", id), {
        [field]: !currentValue,
      });

      setMovies((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, [field]: !currentValue } : m
        )
      );
    } catch (e) {
      console.error("Toggle error:", e);
    }
  };

  /* ⭐ HERO: enforce single hero */
  const setHeroMovie = async (id) => {
    try {
      const snapshot = await getDocs(collection(db, "movies"));

      // remove hero from all
      const clears = snapshot.docs.map((d) =>
        updateDoc(doc(db, "movies", d.id), { isHero: false })
      );
      await Promise.all(clears);

      // set selected as hero + update releaseDate
      await updateDoc(doc(db, "movies", id), {
        isHero: true,
      });

      // update UI
      setMovies((prev) =>
        prev.map((m) => ({
          ...m,
          isHero: m.id === id,
        }))
      );
    } catch (e) {
      console.error("Hero update error:", e);
    }
  };

  return (
    <div className="space-y-10">

      {/* HEADER */}
      <div className="admin-toolbar items-end">
        <div className="admin-section max-w-2xl">
          <p className="admin-kicker">Content Library</p>
          <h1 className="admin-title">Movies management</h1>
          <p className="admin-lead">Keep the catalog organized, feature the right titles, and jump to analytics or comments from each entry.</p>
        </div>

        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <div className="min-w-[240px] flex-1 sm:flex-none">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, genre, director"
              className="admin-input focus-ring"
            />
          </div>

          {adminRole === "super_admin" && (
            <Link
              href="/admin/movies/create"
              className="admin-button admin-button-primary"
            >
              + Upload New Movie
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          ["Total", movies.length],
          ["Visible", visibleMovies.length],
          ["Featured", movies.filter((movie) => movie.isFeatured).length],
          ["Trending", movies.filter((movie) => movie.isTrending).length],
        ].map(([label, value]) => (
          <div key={label} className="admin-surface rounded-3xl p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-gray-400">{label}</p>
            <p className="mt-2 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      {/* LIST */}
      <div className="space-y-6">

        {loading && (
          <div className="admin-empty">
            Loading movies...
          </div>
        )}

        {!loading && visibleMovies.length === 0 && (
          <div className="admin-empty text-center">
            {search ? "No movies match your search." : "No movies uploaded yet."}
          </div>
        )}

        {visibleMovies.map((movie) => (
          <div
            key={movie.id}
            className="admin-surface p-5 md:p-6 rounded-[1.75rem] shadow-lg space-y-5"
          >

            {/* TITLE + ACTIONS */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {movie.isHero && <span className="admin-chip border-cyan-300/30 bg-cyan-500/10 text-cyan-100">Hero</span>}
                  {movie.isTrending && <span className="admin-chip border-emerald-300/30 bg-emerald-500/10 text-emerald-100">Trending</span>}
                  {movie.isFeatured && <span className="admin-chip border-amber-300/30 bg-amber-500/10 text-amber-100">Featured</span>}
                </div>

                <div>
                  <h2 className="text-lg md:text-xl font-semibold">{movie.title}</h2>
                  <p className="text-sm text-gray-400 mt-1">{movie.genre || "No genre"} {movie.director ? `• ${movie.director}` : ""}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/admin/movies/edit/${movie.id}`}
                  className="admin-button admin-button-secondary px-3 py-2 text-xs md:text-sm"
                >
                  Edit
                </Link>

                <Link
                  href={`/admin/analytics/${movie.id}`}
                  className="admin-button admin-button-secondary px-3 py-2 text-xs md:text-sm"
                >
                  Analytics
                </Link>

                <Link
                  href={`/admin/comments/${movie.id}`}
                  className="admin-button admin-button-secondary px-3 py-2 text-xs md:text-sm"
                >
                  Comments
                </Link>

                {adminRole === "super_admin" && (
                  <button
                    onClick={() => handleDelete(movie.id)}
                    className="admin-button px-3 py-2 text-xs md:text-sm bg-rose-500/15 text-rose-100 border border-rose-300/20"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>

            {/* STATUS TOGGLES */}
            {adminRole === "super_admin" ? (
              <div className="flex flex-wrap gap-3 text-sm">
                {/* ⭐ HERO */}
                <button
                  onClick={() => setHeroMovie(movie.id)}
                  className={`admin-chip transition flex items-center gap-1 ${movie.isHero ? "border-rose-300/30 bg-rose-500/15 text-rose-100" : "bg-white/5 text-gray-300"}`}
                >
                  <StarIcon className="w-3.5 h-3.5" /> Hero {movie.isHero ? "On" : "Off"}
                </button>

                {/* 🔥 TRENDING */}
                <button
                  onClick={() =>
                    toggleField(
                      movie.id,
                      "isTrending",
                      !!movie.isTrending
                    )
                  }
                  className={`admin-chip transition flex items-center gap-1 ${movie.isTrending ? "border-emerald-300/30 bg-emerald-500/15 text-emerald-100" : "bg-white/5 text-gray-300"}`}
                >
                  <FlameIcon className="w-3.5 h-3.5" /> Trending {movie.isTrending ? "On" : "Off"}
                </button>

                {/* 🎯 FEATURED */}
                <button
                  onClick={() =>
                    toggleField(
                      movie.id,
                      "isFeatured",
                      !!movie.isFeatured
                    )
                  }
                  className={`admin-chip transition flex items-center gap-1 ${movie.isFeatured ? "border-amber-300/30 bg-amber-500/15 text-amber-100" : "bg-white/5 text-gray-300"}`}
                >
                  <TargetIcon className="w-3.5 h-3.5" /> Featured {movie.isFeatured ? "On" : "Off"}
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3 text-sm opacity-60">
                <span className={`admin-chip flex items-center gap-1 ${movie.isHero ? "border-rose-300/30 bg-rose-500/15 text-rose-100" : "bg-white/5 text-gray-400"}`}>
                  <StarIcon className="w-3.5 h-3.5" /> Hero {movie.isHero ? "Active" : "Inactive"}
                </span>
                <span className={`admin-chip flex items-center gap-1 ${movie.isTrending ? "border-emerald-300/30 bg-emerald-500/15 text-emerald-100" : "bg-white/5 text-gray-400"}`}>
                  <FlameIcon className="w-3.5 h-3.5" /> Trending {movie.isTrending ? "Active" : "Inactive"}
                </span>
                <span className={`admin-chip flex items-center gap-1 ${movie.isFeatured ? "border-amber-300/30 bg-amber-500/15 text-amber-100" : "bg-white/5 text-gray-400"}`}>
                  <TargetIcon className="w-3.5 h-3.5" /> Featured {movie.isFeatured ? "Active" : "Inactive"}
                </span>
              </div>
            )}

          </div>
        ))}

      </div>
    </div>
  );
}