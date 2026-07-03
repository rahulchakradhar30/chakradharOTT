"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import Link from "next/link";
import { motion } from "framer-motion";
import ImageUploadSelector from "@/components/ImageUploadSelector";

export default function CreatePosterPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    imageUrl: "",
    caption: "",
    movieId: "",
    tags: "",
  });

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

      await addDoc(collection(db, "posters"), {
        imageUrl: form.imageUrl,
        caption: form.caption.trim(),
        movieId: form.movieId.trim() || null,
        tags: tagsArray,
        likesCount: 0,
        commentsCount: 0,
        createdAt: Timestamp.now(),
      });

      router.push("/admin/posters");
    } catch (err) {
      console.error("Create poster failed:", err);
      alert("Failed to create poster: " + (err.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-10 pb-16">
      {/* HEADER */}
      <motion.div initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} className="admin-toolbar items-end">
        <div className="admin-section max-w-2xl">
          <p className="admin-kicker text-cyan-300 text-sm tracking-widest">✦ New Poster</p>
          <h1 className="admin-title text-4xl font-black">Create Poster</h1>
          <p className="admin-lead text-gray-300">Upload a movie poster image and add a caption. Users will see this in the poster gallery and can like and comment.</p>
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
            className="admin-textarea focus-ring"
          />
          <p className="text-xs text-gray-400 mt-1">{form.caption.length}/2000 characters</p>
        </div>

        {/* Movie Link (Optional) */}
        <div>
          <label className="block text-sm font-semibold mb-2">Link to Movie (Optional)</label>
          <input
            type="text"
            name="movieId"
            value={form.movieId}
            onChange={handleChange}
            placeholder="Paste movie ID to link this poster to a movie page"
            className="admin-input focus-ring"
          />
          <p className="text-xs text-gray-400 mt-1">Users will see a &quot;Watch Movie&quot; button if linked</p>
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
            className="admin-input focus-ring"
          />
          <p className="text-xs text-gray-400 mt-1">Tags help categorize posters for discovery</p>
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="admin-button admin-button-primary disabled:opacity-70"
          >
            {saving ? "Publishing..." : "Publish Poster"}
          </button>
          <Link href="/admin/posters" className="admin-button admin-button-secondary">
            Cancel
          </Link>
        </div>
      </motion.form>
    </div>
  );
}
