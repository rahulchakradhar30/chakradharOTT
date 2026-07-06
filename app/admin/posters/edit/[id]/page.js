"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/firebase";
import { collection, getDocs } from "firebase/firestore";
import Link from "next/link";
import { motion } from "framer-motion";
import ImageUploadSelector from "@/components/ImageUploadSelector";

export default function EditPosterPage({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const id = resolvedParams?.id;

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    imageUrl: "",
    caption: "",
    movieId: "",
    tags: "",
  });

  const [movies, setMovies] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  // Fetch all movies for dropdown selection and the current poster details
  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      try {
        setLoading(true);

        // Load all movies
        const moviesSnap = await getDocs(collection(db, "movies"));
        const moviesList = moviesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setMovies(moviesList);

        // Load current poster details via API
        const res = await fetch(`/api/posters/${id}`);
        const data = await res.json();
        
        if (data.success && data.poster) {
          const poster = data.poster;
          setForm({
            imageUrl: poster.imageUrl || "",
            caption: poster.caption || "",
            movieId: poster.movieId || "",
            tags: Array.isArray(poster.tags) ? poster.tags.join(", ") : "",
          });

          // Prepopulate linked movie search term
          if (poster.movieId) {
            const linkedMovie = moviesList.find((m) => m.id === poster.movieId);
            if (linkedMovie) {
              setSearchTerm(linkedMovie.title || "");
            }
          }
        } else {
          alert("Poster not found");
          router.push("/admin/posters");
        }
      } catch (err) {
        console.error("Failed to load poster data:", err);
        alert("Failed to load poster details.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, router]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = () => setShowDropdown(false);
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.imageUrl) {
      alert("Please upload or paste a poster image.");
      return;
    }

    if (!form.caption.trim()) {
      alert("Please add a caption / description.");
      return;
    }

    try {
      setSaving(true);

      const tagsArray = form.tags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      const response = await fetch(`/api/posters/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl: form.imageUrl,
          caption: form.caption.trim(),
          movieId: form.movieId || null,
          tags: tagsArray,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert("✅ Poster updated successfully!");
        router.push("/admin/posters");
      } else {
        alert("Failed to update poster: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Update poster failed:", err);
      alert("Failed to update poster: " + (err.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-24">
        <div className="mx-auto h-10 w-10 rounded-full border-4 border-cyan-400/30 border-t-cyan-400 animate-spin" />
        <p className="mt-4 text-gray-400">Loading poster details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-16 text-left text-white">
      {/* HEADER */}
      <motion.div initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} className="admin-toolbar items-end">
        <div className="admin-section max-w-2xl">
          <p className="admin-kicker text-cyan-300 text-sm tracking-widest">✦ Edit Poster</p>
          <h1 className="admin-title text-4xl font-black">Edit Poster</h1>
          <p className="admin-lead text-gray-300">Modify the description, update the poster image, or link it to a different movie.</p>
        </div>

        <Link href="/admin/posters" className="admin-button admin-button-secondary text-sm">
          ← Back to Posters
        </Link>
      </motion.div>

      {/* FORM */}
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="max-w-2xl space-y-6"
      >
        {/* Poster Image */}
        <ImageUploadSelector
          label="Poster Image *"
          value={form.imageUrl}
          onChange={(val) => setForm((prev) => ({ ...prev, imageUrl: val }))}
          placeholder="Poster image URL"
          required
        />

        {/* Caption */}
        <div>
          <label className="block text-sm font-semibold mb-2">Caption / Description *</label>
          <textarea
            name="caption"
            value={form.caption}
            onChange={handleChange}
            placeholder="Write a caption for this poster... (supports multiple lines)"
            rows={5}
            maxLength={2000}
            required
            className="admin-textarea focus-ring w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none"
          />
          <p className="text-xs text-gray-400 mt-1">{form.caption.length}/2000 characters</p>
        </div>

        {/* Searchable Movie Link */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <label className="block text-sm font-semibold mb-2">Link to Movie (Optional)</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search movie by title to link..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowDropdown(true);
                  if (!e.target.value) {
                    setForm((prev) => ({ ...prev, movieId: "" }));
                  }
                }}
                onFocus={() => setShowDropdown(true)}
                className="admin-input focus-ring w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none"
              />
              {showDropdown && (
                <div className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto rounded-xl border border-white/10 bg-zinc-950 p-2 shadow-2xl space-y-1">
                  {movies.filter((m) =>
                    m.title?.toLowerCase().includes(searchTerm.toLowerCase())
                  ).length === 0 ? (
                    <p className="text-xs text-gray-500 p-2">No movies found</p>
                  ) : (
                    movies
                      .filter((m) =>
                        m.title?.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setForm((prev) => ({ ...prev, movieId: m.id }));
                            setSearchTerm(m.title || "");
                            setShowDropdown(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs transition ${
                            form.movieId === m.id
                              ? "bg-cyan-500/25 text-cyan-300 border border-cyan-400/20"
                              : "hover:bg-white/5 text-gray-300"
                          }`}
                        >
                          {m.title}
                        </button>
                      ))
                  )}
                </div>
              )}
            </div>
            {form.movieId && (
              <button
                type="button"
                onClick={() => {
                  setForm((prev) => ({ ...prev, movieId: "" }));
                  setSearchTerm("");
                }}
                className="px-4 rounded-xl bg-red-600/25 border border-red-500/20 text-red-300 text-xs hover:bg-red-600/40 transition"
              >
                Clear
              </button>
            )}
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5">
            {form.movieId ? (
              <span className="text-cyan-300 font-medium">Selected Movie ID: {form.movieId}</span>
            ) : (
              "Select a movie to automatically link this poster to its detail page"
            )}
          </p>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-semibold mb-2">Tags (comma separated)</label>
          <input
            type="text"
            name="tags"
            value={form.tags}
            onChange={handleChange}
            placeholder="e.g. thriller, action, 2026, new-release"
            className="admin-input focus-ring w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none"
          />
          <p className="text-xs text-gray-400 mt-1">Tags help categorize posters for discovery</p>
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="admin-button admin-button-primary disabled:opacity-70 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 font-bold"
          >
            {saving ? "Saving Changes..." : "Save Changes"}
          </button>
          <Link href="/admin/posters" className="admin-button admin-button-secondary px-6 py-3 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition">
            Cancel
          </Link>
        </div>
      </motion.form>
    </div>
  );
}
