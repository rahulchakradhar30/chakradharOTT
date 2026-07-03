"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebase";
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { normalizeYouTubeEmbed } from "@/lib/youtube";
import ImageUploadSelector from "@/components/ImageUploadSelector";

export default function EditPremierePage() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();

  const [premiere, setPremiere] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    embedLink: "",
    bannerImage: "",
    thumbnailImage: "",
    displayTime: "",
    startTime: "",
  });

  const toLocalISOString = (date) => {
    if (!date) return "";
    const tzoffset = date.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(date.getTime() - tzoffset)).toISOString().slice(0, 16);
    return localISOTime;
  };

  useEffect(() => {
    if (!id) return;

    const fetchPremiere = async () => {
      try {
        const docRef = doc(db, "premieres", id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          alert("Premiere not found");
          router.push("/admin/premieres");
          return;
        }

        const data = docSnap.data();
        setPremiere(data);

        // Populate form with existing data
        setForm({
          title: data.title || "",
          description: data.description || "",
          embedLink: data.embedLink || "",
          bannerImage: data.bannerImage || "",
          thumbnailImage: data.thumbnailImage || "",
          displayTime: data.displayTime ? toLocalISOString(data.displayTime.toDate?.() || new Date(data.displayTime)) : "",
          startTime: data.startTime ? toLocalISOString(data.startTime.toDate?.() || new Date(data.startTime)) : "",
        });
      } catch (err) {
        console.error("Error fetching premiere:", err);
        alert("Failed to load premiere");
      } finally {
        setLoading(false);
      }
    };

    fetchPremiere();
  }, [id, router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    if (!form.title || !form.embedLink || !form.startTime) {
      alert("Fill all required fields");
      return;
    }

    try {
      setSaving(true);

      const embed = normalizeYouTubeEmbed(form.embedLink);

      const updateData = {
        title: form.title,
        description: form.description,
        embedLink: embed,
        bannerImage: form.bannerImage || "",
        thumbnailImage: form.thumbnailImage || "",
        startTime: Timestamp.fromDate(new Date(form.startTime)),
      };

      // Only update displayTime if it's provided
      if (form.displayTime) {
        updateData.displayTime = Timestamp.fromDate(new Date(form.displayTime));
      } else {
        updateData.displayTime = null;
      }

      await updateDoc(doc(db, "premieres", id), updateData);

      alert("✅ Premiere updated successfully!");
      router.push(`/admin/premieres/${id}`);
    } catch (err) {
      console.error("Update error:", err);
      alert("Error updating premiere: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="admin-empty">Loading...</div>
      </div>
    );
  }

  if (!premiere) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="admin-empty text-red-300">Premiere not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-4xl mx-auto">
      <div className="admin-section">
        <p className="admin-kicker">Live Events</p>
        <h1 className="admin-title">Edit premiere</h1>
        <p className="admin-lead">Refine the live event details without touching ticket rules or performance data.</p>
      </div>

      <div className="admin-panel rounded-2xl p-4 mb-2">
          <p className="text-yellow-200 text-sm">
            📝 You can edit this premiere details anytime. Changes will reflect immediately in the live room.
          </p>
        </div>

      <div className="admin-surface rounded-[1.75rem] p-6 md:p-10 shadow-xl space-y-6">

        {/* TITLE */}
        <div>
          <label className="block text-sm font-semibold mb-2">Title *</label>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="Premiere Title"
            className="admin-input focus-ring"
          />
        </div>

        {/* DESCRIPTION */}
        <div>
          <label className="block text-sm font-semibold mb-2">Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Description (optional)"
            className="admin-textarea focus-ring h-24"
          />
        </div>

        {/* YOUTUBE LINK */}
        <div>
          <label className="block text-sm font-semibold mb-2">YouTube Link *</label>
          <input
            name="embedLink"
            value={form.embedLink}
            onChange={handleChange}
            placeholder="Paste ANY YouTube Link"
            className="admin-input focus-ring"
          />
          <p className="text-xs text-gray-400 mt-1">⚠️ Changing this will update the video in the live room</p>
        </div>

        {/* BANNER */}
        <div>
          <ImageUploadSelector
            label="Banner Image"
            value={form.bannerImage}
            onChange={(val) => setForm((prev) => ({ ...prev, bannerImage: val }))}
            placeholder="Banner Image URL (optional)"
          />
        </div>

        {/* THUMBNAIL */}
        <div>
          <ImageUploadSelector
            label="Thumbnail Image (Join Page Preview)"
            value={form.thumbnailImage}
            onChange={(val) => setForm((prev) => ({ ...prev, thumbnailImage: val }))}
            placeholder="Thumbnail Image URL (optional)"
          />
        </div>

        {/* TIMES */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Display Time (Early Access)</label>
            <input
              type="datetime-local"
              name="displayTime"
              value={form.displayTime}
              onChange={handleChange}
              className="admin-input focus-ring"
            />
            <p className="text-xs text-gray-400 mt-1">When to show on homepage</p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Start Time *</label>
            <input
              type="datetime-local"
              name="startTime"
              value={form.startTime}
              onChange={handleChange}
              className="admin-input focus-ring"
            />
            <p className="text-xs text-gray-400 mt-1">When premiere goes live</p>
          </div>
        </div>

        {/* TICKET INFO (READ-ONLY) */}
        <div className="admin-panel rounded-2xl p-4">
          <p className="text-sm text-gray-300 mb-3">
            💳 <span className="font-semibold">Ticket Settings (cannot edit)</span>
          </p>
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-400">Ticket Required:</p>
              <p className="font-semibold">{premiere.ticketRequired ? "Yes" : "No"}</p>
            </div>
            <div>
              <p className="text-gray-400">Price:</p>
              <p className="font-semibold">₹{premiere.ticketPrice || "Free"}</p>
            </div>
            <div>
              <p className="text-gray-400">Tickets Sold:</p>
              <p className="font-semibold">{premiere.ticketsSold || 0}</p>
            </div>
            <div>
              <p className="text-gray-400">Status:</p>
              <p className={`font-semibold ${
                premiere.status === "live"
                  ? "text-red-400"
                  : premiere.status === "ended"
                  ? "text-gray-400"
                  : "text-yellow-400"
              }`}>
                {premiere.status || "scheduled"}
              </p>
            </div>
          </div>
        </div>

        {/* BUTTONS */}
        <div className="flex gap-4 pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="admin-button admin-button-primary flex-1 disabled:opacity-60"
          >
            {saving ? "Saving..." : "💾 Save Changes"}
          </button>

          <Link
            href={`/admin/premieres/${id}`}
            className="admin-button admin-button-secondary flex-1 text-center"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
