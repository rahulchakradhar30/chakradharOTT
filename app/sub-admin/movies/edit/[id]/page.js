"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { useRouter, useParams } from "next/navigation";
import { normalizeYouTubeEmbed } from "@/lib/youtube";
import ImageUploadSelector from "@/components/ImageUploadSelector";
import SubAdminAccessGuard from "@/components/admin/SubAdminAccessGuard";
import { MovieIcon } from "@/components/Icon";

export default function SubAdminEditMovie() {
  const params = useParams();
  const movieId = params?.id;
  const router = useRouter();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dbGenres, setDbGenres] = useState([]);

  useEffect(() => {
    const fetchGenres = async () => {
      const DEFAULT_GENRES = [
        "Action", "Comedy", "Drama", "Horror", "Thriller",
        "Romance", "Science Fiction", "Fantasy", "Animation",
        "Documentary", "Adventure", "Crime", "Mystery", "Family"
      ];
      try {
        const snap = await getDocs(collection(db, "genres"));
        const names = snap.docs.map((doc) => doc.data().name || doc.data().genre || doc.data().title || doc.id);
        const combined = Array.from(new Set([...DEFAULT_GENRES, ...names])).filter(Boolean).sort();
        setDbGenres(combined);
      } catch (err) {
        console.warn("Failed to load genres, falling back to defaults:", err);
        setDbGenres(DEFAULT_GENRES);
      }
    };
    fetchGenres();
  }, []);

  const availableGenres = Array.from(
    new Set([...dbGenres, ...(movie?.genre ? [movie.genre] : [])])
  ).filter(Boolean).sort();

  /* ---------- Fetch Movie ---------- */
  useEffect(() => {
    if (!movieId) return;

    const fetchMovie = async () => {
      const movieRef = doc(db, "movies", movieId);
      const snapshot = await getDoc(movieRef);

      if (snapshot.exists()) {
        setMovie(snapshot.data());
      }
    };

    fetchMovie();
  }, [movieId]);

  const handleChange = (field, value) => {
    setMovie((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    setLoading(true);

    const finalEmbed = normalizeYouTubeEmbed(movie.embedLink);

    await updateDoc(doc(db, "movies", movieId), {
      ...movie,
      embedLink: finalEmbed,
      director: movie.director || "",
    });

    setLoading(false);
    alert("Movie updated successfully");
    router.push("/sub-admin/movies");
  };

  if (!movie) {
    return (
      <SubAdminAccessGuard moduleKey="movies">
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="admin-surface rounded-2xl p-6 animate-pulse space-y-4">
            <div className="h-6 bg-white/10 rounded w-1/3" />
            <div className="h-10 bg-white/10 rounded w-full" />
            <div className="h-10 bg-white/10 rounded w-full" />
            <div className="h-24 bg-white/10 rounded w-full" />
          </div>
        </div>
      </SubAdminAccessGuard>
    );
  }

  return (
    <SubAdminAccessGuard moduleKey="movies">
      <div className="space-y-10 max-w-4xl mx-auto">

        {/* HEADER */}
        <div className="admin-section">
          <p className="admin-kicker text-cyan-300">Content Studio</p>
          <h1 className="admin-title flex items-center gap-3">
            <MovieIcon className="w-8 h-8 text-cyan-400" />
            <span>Edit Movie</span>
          </h1>
          <p className="admin-lead">Update copy, media, and publishing flags for this movie.</p>
        </div>

        {/* FORM CONTAINER */}
        <div className="admin-surface rounded-[1.75rem] p-6 md:p-10 shadow-xl space-y-6">

          {/* BASIC INFO */}
          <div className="space-y-5">

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Title</label>
              <input
                type="text"
                value={movie.title || ""}
                onChange={(e) => handleChange("title", e.target.value)}
                className="admin-input focus-ring"
                placeholder="Movie Title"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tagline</label>
              <input
                type="text"
                value={movie.tagline || ""}
                onChange={(e) => handleChange("tagline", e.target.value)}
                className="admin-input focus-ring"
                placeholder="Tagline"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Director</label>
              <input
                type="text"
                value={movie.director || ""}
                onChange={(e) => handleChange("director", e.target.value)}
                className="admin-input focus-ring"
                placeholder="Director Name"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Description</label>
              <textarea
                rows="4"
                value={movie.description || ""}
                onChange={(e) => handleChange("description", e.target.value)}
                className="admin-textarea focus-ring"
                placeholder="Movie Description"
              />
            </div>

          </div>

          {/* MEDIA LINKS */}
          <div className="space-y-5">

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">YouTube Embed Link</label>
              <input
                type="text"
                value={movie.embedLink || ""}
                onChange={(e) => handleChange("embedLink", e.target.value)}
                className="admin-input focus-ring"
                placeholder="YouTube Link"
              />
            </div>

            <ImageUploadSelector
              label="Poster Image"
              value={movie.posterImage || ""}
              onChange={(val) => handleChange("posterImage", val)}
              required
              placeholder="Poster Image URL"
            />

            <ImageUploadSelector
              label="Banner Image"
              value={movie.bannerImage || ""}
              onChange={(val) => handleChange("bannerImage", val)}
              required
              placeholder="Banner Image URL"
            />

          </div>

          {/* META GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Genre</label>
              <select
                value={movie.genre || ""}
                required
                onChange={(e) => handleChange("genre", e.target.value)}
                className="admin-input focus-ring text-gray-200 bg-[#181818] border-white/10"
              >
                <option value="">Select Genre *</option>
                {availableGenres.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Release Date</label>
              <input
                type="date"
                value={movie.releaseDate || ""}
                onChange={(e) => handleChange("releaseDate", e.target.value)}
                className="admin-input focus-ring"
              />
            </div>

          </div>

          {/* FLAGS */}
          <div className="flex flex-wrap gap-6 text-sm">
            <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={movie.isFeatured || false}
                onChange={(e) => handleChange("isFeatured", e.target.checked)}
                className="w-4 h-4 rounded accent-cyan-500"
              />
              Featured
            </label>

            <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={movie.isTrending || false}
                onChange={(e) => handleChange("isTrending", e.target.checked)}
                className="w-4 h-4 rounded accent-cyan-500"
              />
              Trending
            </label>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={loading}
              className="admin-button bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs uppercase px-6 py-3 rounded-xl shadow-lg shadow-cyan-500/20 disabled:opacity-60 transition"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>

            <button
              onClick={() => router.push("/sub-admin/movies")}
              className="admin-button bg-white/10 hover:bg-white/15 text-gray-300 font-bold text-xs uppercase px-6 py-3 rounded-xl border border-white/10 transition"
            >
              Cancel
            </button>
          </div>

        </div>

      </div>
    </SubAdminAccessGuard>
  );
}
