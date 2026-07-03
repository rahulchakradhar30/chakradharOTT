"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebase";
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import Link from "next/link";
import { motion } from "framer-motion";

const PRESET_GENRES = [
  "Action",
  "Comedy",
  "Drama",
  "Horror",
  "Thriller",
  "Romance",
  "Science Fiction",
  "Fantasy",
  "Animation",
  "Documentary",
  "Mystery",
  "Adventure",
];

export default function GenreManagement() {
  const [genres, setGenres] = useState([]);
  const [newGenre, setNewGenre] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const snapshot = await getDocs(collection(db, "genres"));
        const genreList = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setGenres(genreList);
      } catch (error) {
        console.error("Fetch genres error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchGenres();
  }, []);

  const handleAddGenre = async (genreName) => {
    if (!genreName.trim()) return;

    setAdding(true);
    try {
      const exists = genres.some((g) => g.name.toLowerCase() === genreName.toLowerCase());
      if (exists) {
        alert("Genre already exists");
        setAdding(false);
        return;
      }

      const docRef = await addDoc(collection(db, "genres"), {
        name: genreName.trim(),
        createdAt: new Date(),
        movieCount: 0,
      });

      setGenres([...genres, { id: docRef.id, name: genreName.trim(), createdAt: new Date(), movieCount: 0 }]);
      setNewGenre("");
    } catch (error) {
      console.error("Add genre error:", error);
      alert("Failed to add genre");
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteGenre = async (id) => {
    if (!confirm("Delete this genre?")) return;

    try {
      await deleteDoc(doc(db, "genres", id));
      setGenres((prev) => prev.filter((g) => g.id !== id));
    } catch (error) {
      console.error("Delete genre error:", error);
      alert("Failed to delete genre");
    }
  };

  const visibleGenres = genres.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-10 pb-16">
      {/* HEADER */}
      <motion.div initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} className="admin-toolbar items-end">
        <div className="admin-section max-w-2xl">
          <p className="admin-kicker text-cyan-300 text-sm tracking-widest">✦ Manage Genres</p>
          <h1 className="admin-title text-4xl font-black">Genre Library</h1>
          <p className="admin-lead text-gray-300">Organize content with custom genres and categories for discovery.</p>
        </div>

        <Link href="/admin" className="admin-button admin-button-secondary text-sm">
          ← Back to Dashboard
        </Link>
      </motion.div>

      {/* ADD NEW GENRE */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-2xl md:rounded-3xl p-6 md:p-8 border border-cyan-400/20 bg-gradient-to-r from-cyan-500/10 to-blue-500/5"
      >
        <h2 className="text-lg md:text-xl font-bold mb-5">➕ Add New Genre</h2>
        <div className="flex gap-3 flex-col sm:flex-row">
          <input
            value={newGenre}
            onChange={(e) => setNewGenre(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddGenre(newGenre)}
            placeholder="Enter genre name (e.g., Sci-Fi, Anime)"
            className="admin-input focus-ring flex-1"
          />
          <button
            onClick={() => handleAddGenre(newGenre)}
            disabled={adding || !newGenre.trim()}
            className="admin-button admin-button-primary disabled:opacity-50"
          >
            {adding ? "Adding..." : "Add"}
          </button>
        </div>

        {/* PRESET GENRES */}
        <div className="mt-6 pt-6 border-t border-white/10">
          <p className="text-sm font-semibold text-gray-300 mb-4">Quick Add Presets</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {PRESET_GENRES.map((g) => {
              const exists = genres.some((existing) => existing.name.toLowerCase() === g.toLowerCase());
              return (
                <button
                  key={g}
                  onClick={() => !exists && handleAddGenre(g)}
                  disabled={exists || adding}
                  className={`px-4 py-2 rounded-lg border transition text-sm font-semibold ${
                    exists
                      ? "bg-green-500/10 border-green-300/30 text-green-300 cursor-default"
                      : "bg-white/5 border-white/15 hover:bg-white/10 hover:border-cyan-300/40"
                  }`}
                >
                  {exists ? "✓" : "+"} {g}
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* SEARCH */}
      <div className="flex gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search genres..."
          className="admin-input focus-ring flex-1"
        />
        <button className="admin-button admin-button-secondary">🔍</button>
      </div>

      {/* GENRES LIST */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full text-center py-12 text-gray-400">
            Loading genres...
          </div>
        ) : visibleGenres.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-400">
            {search ? "No genres match your search." : "No genres created yet."}
          </div>
        ) : (
          visibleGenres.map((genre, index) => (
            <motion.div
              key={genre.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="glass-card rounded-2xl p-6 border border-white/10 hover:border-cyan-300/50 transition group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold group-hover:text-cyan-300 transition">{genre.name}</h3>
                  <p className="text-xs text-gray-500 mt-2">
                    {genre.movieCount || 0} movies in this genre
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteGenre(genre.id)}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-300/30 text-rose-300 text-xs font-semibold hover:bg-rose-500/25 transition"
                >
                  ✕
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
