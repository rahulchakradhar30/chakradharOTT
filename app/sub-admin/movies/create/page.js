"use client";

import { useState, useEffect } from "react";
import { db } from "@/firebase";
import { collection, addDoc, Timestamp, getDocs } from "firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation";
import { normalizeYouTubeEmbed } from "@/lib/youtube";
import ImageUploadSelector from "@/components/ImageUploadSelector";
import { useAutoSave, loadDraft } from "@/lib/drafts";
import SubAdminAccessGuard from "@/components/admin/SubAdminAccessGuard";

export default function SubAdminCreateMovie() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftIdParam = searchParams?.get("draftId") || null;

  const [loading, setLoading] = useState(false);
  const [dbGenres, setDbGenres] = useState([]);
  const [adminEmail, setAdminEmail] = useState("");

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

  const { lastSaved, saving: autoSaving, clearDraft, saveDraftManually } = useAutoSave(
    form,
    "movie",
    adminEmail,
    10000
  );

  useEffect(() => {
    fetch("/api/admin/session")
      .then((r) => r.json())
      .then((d) => setAdminEmail(d.email || ""))
      .catch((e) => console.warn(e));
  }, []);

  useEffect(() => {
    if (!draftIdParam) return;
    loadDraft(draftIdParam).then((draft) => {
      if (draft?.data) setForm((prev) => ({ ...prev, ...draft.data }));
    });
  }, [draftIdParam]);

  useEffect(() => {
    const DEFAULT_GENRES = ["Action", "Comedy", "Drama", "Horror", "Thriller", "Romance", "Science Fiction", "Fantasy", "Animation"];
    getDocs(collection(db, "genres"))
      .then((snap) => {
        const names = snap.docs.map((doc) => doc.data().name || doc.data().genre || doc.id);
        setDbGenres(Array.from(new Set([...DEFAULT_GENRES, ...names])).sort());
      })
      .catch(() => setDbGenres(DEFAULT_GENRES));
  }, []);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const finalEmbed = normalizeYouTubeEmbed(form.embedLink);
    await addDoc(collection(db, "movies"), {
      ...form,
      embedLink: finalEmbed,
      createdAt: Timestamp.now(),
    });

    await clearDraft();
    setLoading(false);
    alert("Movie uploaded successfully");
    router.push("/sub-admin/movies");
  };

  return (
    <SubAdminAccessGuard moduleKey="movies">
      <div className="space-y-8 max-w-4xl mx-auto pb-16">
        <div>
          <p className="admin-kicker">Sub-Admin Studio</p>
          <h1 className="admin-title">Upload Movie</h1>
          <p className="admin-lead">Add title, video embed, and media assets.</p>
        </div>

        <form onSubmit={handleSubmit} className="admin-surface rounded-3xl p-6 md:p-8 space-y-6">
          <input
            type="text"
            placeholder="Movie title *"
            required
            value={form.title}
            onChange={(e) => handleChange("title", e.target.value)}
            className="admin-input focus-ring"
          />

          <textarea
            placeholder="Description"
            rows={3}
            value={form.description}
            onChange={(e) => handleChange("description", e.target.value)}
            className="admin-textarea focus-ring"
          />

          <input
            type="text"
            placeholder="YouTube embed link *"
            required
            value={form.embedLink}
            onChange={(e) => handleChange("embedLink", e.target.value)}
            className="admin-input focus-ring"
          />

          <ImageUploadSelector
            label="Poster Image"
            value={form.posterImage}
            onChange={(val) => handleChange("posterImage", val)}
            required
          />

          <ImageUploadSelector
            label="Banner Image"
            value={form.bannerImage}
            onChange={(val) => handleChange("bannerImage", val)}
            required
          />

          <select
            value={form.genre}
            required
            onChange={(e) => handleChange("genre", e.target.value)}
            className="admin-input focus-ring bg-zinc-900"
          >
            <option value="">Select Genre *</option>
            {dbGenres.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          <div className="flex gap-4">
            <button type="submit" disabled={loading} className="admin-button admin-button-primary flex-1">
              {loading ? "Uploading..." : "Upload Movie"}
            </button>
            <button
              type="button"
              onClick={async () => {
                const id = await saveDraftManually();
                if (id) alert("Draft saved!");
              }}
              className="admin-button admin-button-secondary"
            >
              💾 Save Draft
            </button>
          </div>
        </form>
      </div>
    </SubAdminAccessGuard>
  );
}
