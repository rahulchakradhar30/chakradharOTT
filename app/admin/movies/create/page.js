"use client";

import { useState, useEffect } from "react";
import { db } from "@/firebase";
import { collection, addDoc, Timestamp, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { normalizeYouTubeEmbed } from "@/lib/youtube";
import ImageUploadSelector from "@/components/ImageUploadSelector";

export default function CreateMovie() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [dbGenres, setDbGenres] = useState([]);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledTime, setScheduledTime] = useState("");

  const [form, setForm] = useState({
    title: "",
    tagline: "",
    description: "",
    embedLink: "",
    posterImage: "",
    bannerImage: "",
    genre: "",
    releaseDate: "",
    director: "",
    isHero: false,
    isFeatured: false,
    isTrending: false,
  });

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const snap = await getDocs(collection(db, "genres"));
        const names = snap.docs.map((doc) => doc.data().name);
        const unique = Array.from(new Set(names)).filter(Boolean).sort();
        setDbGenres(unique);
      } catch (err) {
        console.warn("Failed to load genres, falling back to defaults:", err);
        setDbGenres([
          "Action", "Comedy", "Drama", "Horror", "Thriller",
          "Romance", "Science Fiction", "Fantasy", "Animation"
        ]);
      }
    };
    fetchGenres();
  }, []);

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const finalEmbed = normalizeYouTubeEmbed(form.embedLink);

    let scheduledRelease = null;
    if (isScheduled && scheduledTime) {
      scheduledRelease = new Date(scheduledTime);
    }

    const docRef = await addDoc(collection(db, "movies"), {
      ...form,
      embedLink: finalEmbed,
      scheduledRelease,
      createdAt: Timestamp.now(),
    });

    try {
      const isFuture = scheduledRelease && scheduledRelease.getTime() > Date.now();
      const title = isFuture ? "New Movie Scheduled! 🕐" : "New Movie Released! 🎬";
      const message = isFuture 
        ? `A new movie has been scheduled: "${form.title}" will release on ${scheduledRelease.toLocaleString()}`
        : `Watch the newly added movie: "${form.title}"`;

      await fetch("/api/notifications/broadcast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          message,
          type: "movie",
          link: isFuture ? "/movies" : `/movie/${docRef.id}`,
        }),
      });
    } catch (notifErr) {
      console.warn("Failed to broadcast movie release notification:", notifErr);
    }

    setLoading(false);
    alert("Movie uploaded successfully");
    router.push("/admin/movies");
  };

  return (
    <div className="space-y-10 max-w-5xl mx-auto">

      {/* HEADER */}
      <div className="admin-section">
        <p className="admin-kicker">Content Studio</p>
        <h1 className="admin-title">Upload new movie</h1>
        <p className="admin-lead">Add new movie details, media links, and visibility flags in one clean flow.</p>
      </div>

      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        className="admin-surface rounded-[1.75rem] p-6 md:p-10 shadow-xl space-y-6"
      >

        {/* BASIC INFO */}
        <div className="space-y-5">

          <input
            type="text"
            placeholder="Movie title"
            required
            className="admin-input focus-ring"
            onChange={(e) => handleChange("title", e.target.value)}
          />

          <input
            type="text"
            placeholder="Tagline"
            className="admin-input focus-ring"
            onChange={(e) => handleChange("tagline", e.target.value)}
          />

          <input
            type="text"
            placeholder="Director name"
            className="admin-input focus-ring"
            onChange={(e) => handleChange("director", e.target.value)}
          />

          <textarea
            placeholder="Description"
            rows="4"
            className="admin-textarea focus-ring"
            onChange={(e) => handleChange("description", e.target.value)}
          />

        </div>

        {/* MEDIA LINKS */}
        <div className="space-y-5">

          <input
            type="text"
            placeholder="Paste any YouTube link"
            required
            className="admin-input focus-ring"
            onChange={(e) => handleChange("embedLink", e.target.value)}
          />

          <ImageUploadSelector
            label="Poster Image"
            value={form.posterImage}
            onChange={(val) => handleChange("posterImage", val)}
            required
            placeholder="Poster Image URL"
          />

          <ImageUploadSelector
            label="Banner Image"
            value={form.bannerImage}
            onChange={(val) => handleChange("bannerImage", val)}
            required
            placeholder="Banner Image URL"
          />

        </div>

        {/* META INFO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          <select
            value={form.genre}
            required
            onChange={(e) => handleChange("genre", e.target.value)}
            className="admin-input focus-ring text-gray-200 bg-zinc-900 border-white/10"
          >
            <option value="">Select Genre *</option>
            {dbGenres.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          <input
            type="date"
            className="admin-input focus-ring"
            onChange={(e) => handleChange("releaseDate", e.target.value)}
          />

          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-300">
              <input
                type="checkbox"
                checked={isScheduled}
                onChange={(e) => setIsScheduled(e.target.checked)}
                className="rounded border-white/15 bg-black/40 text-cyan-500 focus:ring-cyan-500 cursor-pointer"
              />
              Schedule Release Date & Time
            </label>
            {isScheduled && (
              <input
                type="datetime-local"
                required
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="admin-input focus-ring text-white"
              />
            )}
          </div>

        </div>

        {/* FLAGS */}
        <div className="flex flex-wrap gap-6 text-sm">

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              onChange={(e) =>
                handleChange("isFeatured", e.target.checked)
              }
            />
            Featured
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              onChange={(e) =>
                handleChange("isTrending", e.target.checked)
              }
            />
            Trending
          </label>

        </div>

        {/* SUBMIT */}
        <button
          type="submit"
          disabled={loading}
          className="admin-button admin-button-primary w-full md:w-auto disabled:opacity-60"
        >
          {loading ? "Uploading..." : "Upload Movie"}
        </button>

      </form>

    </div>
  );
}