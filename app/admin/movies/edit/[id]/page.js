"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebase";
import {
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { normalizeYouTubeEmbed } from "@/lib/youtube";
import ImageUploadSelector from "@/components/ImageUploadSelector";

export default function EditMovie({ params }) {
  const router = useRouter();
  const [movie, setMovie] = useState(null);
  const [movieId, setMovieId] = useState(null);
  const [loading, setLoading] = useState(false);

  /* ---------- Resolve Params ---------- */
  useEffect(() => {
    const resolveParams = async () => {
      const resolved = await params;
      setMovieId(resolved.id);
    };
    resolveParams();
  }, [params]);

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
    router.push("/admin/movies");
  };

  if (!movie) {
    return (
      <div className="admin-empty text-sm max-w-md">
        Loading movie data...
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-4xl mx-auto">

      {/* HEADER */}
      <div className="admin-section">
        <p className="admin-kicker">Content Studio</p>
        <h1 className="admin-title">Edit movie</h1>
        <p className="admin-lead">Update copy, media, and publishing flags without leaving the admin flow.</p>
      </div>

      {/* FORM CONTAINER */}
      <div className="admin-surface rounded-[1.75rem] p-6 md:p-10 shadow-xl space-y-6">

        {/* BASIC INFO */}
        <div className="space-y-5">

          <input
            type="text"
            value={movie.title || ""}
            onChange={(e) => handleChange("title", e.target.value)}
            className="admin-input focus-ring"
            placeholder="Title"
          />

          <input
            type="text"
            value={movie.tagline || ""}
            onChange={(e) => handleChange("tagline", e.target.value)}
            className="admin-input focus-ring"
            placeholder="Tagline"
          />

          <input
            type="text"
            value={movie.director || ""}
            onChange={(e) => handleChange("director", e.target.value)}
            className="admin-input focus-ring"
            placeholder="Director Name"
          />

          <textarea
            rows="4"
            value={movie.description || ""}
            onChange={(e) => handleChange("description", e.target.value)}
            className="admin-textarea focus-ring"
            placeholder="Description"
          />

        </div>

        {/* MEDIA LINKS */}
        <div className="space-y-5">

          <input
            type="text"
            value={movie.embedLink || ""}
            onChange={(e) => handleChange("embedLink", e.target.value)}
            className="admin-input focus-ring"
            placeholder="YouTube Link"
          />

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

          <input
            type="text"
            value={movie.genre || ""}
            onChange={(e) => handleChange("genre", e.target.value)}
            className="admin-input focus-ring"
            placeholder="Genre"
          />

          <input
            type="date"
            value={movie.releaseDate || ""}
            onChange={(e) => handleChange("releaseDate", e.target.value)}
            className="admin-input focus-ring"
          />

        </div>

        {/* FLAGS */}
        <div className="flex flex-wrap gap-6 text-sm">

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={movie.isFeatured || false}
              onChange={(e) =>
                handleChange("isFeatured", e.target.checked)
              }
            />
            Featured
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={movie.isTrending || false}
              onChange={(e) =>
                handleChange("isTrending", e.target.checked)
              }
            />
            Trending
          </label>

        </div>

        {/* SAVE BUTTON */}
        <button
          onClick={handleSave}
          disabled={loading}
          className="admin-button admin-button-primary w-full md:w-auto disabled:opacity-60"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>

      </div>

    </div>
  );
}