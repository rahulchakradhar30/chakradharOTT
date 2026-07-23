"use client";

import { useState, useEffect } from "react";
import { db } from "@/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation";
import { normalizeYouTubeEmbed } from "@/lib/youtube";
import ImageUploadSelector from "@/components/ImageUploadSelector";
import { useAutoSave, loadDraft } from "@/lib/drafts";

export default function CreatePremierePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftIdParam = searchParams?.get("draftId") || null;

  const [loading, setLoading] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    embedLink: "",
    bannerImage: "",
    thumbnailImage: "",
    startTime: "",
    displayTime: "",
    ticketRequired: false,
    ticketPrice: 0,
    ticketLimit: 0,
    adminQuota: 0,
    countAdminQuotaInRevenue: false,
  });

  // Auto-save hook
  const { lastSaved, saving: autoSaving, clearDraft, saveDraftManually } = useAutoSave(
    form,
    "premiere",
    adminEmail,
    10000
  );

  // Fetch admin email
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch("/api/admin/session");
        if (res.ok) {
          const data = await res.json();
          setAdminEmail(data.email || "");
        }
      } catch (err) {
        console.warn(err);
      }
    };
    fetchSession();
  }, []);

  // Load draft if draftId is present
  useEffect(() => {
    if (!draftIdParam) return;
    const load = async () => {
      try {
        const draft = await loadDraft(draftIdParam);
        if (draft?.data) {
          setForm((prev) => ({ ...prev, ...draft.data }));
        }
      } catch (err) {
        console.warn("Failed to load draft:", err);
      }
    };
    load();
  }, [draftIdParam]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleCreate = async () => {
    if (!form.title || !form.embedLink || !form.startTime) {
      alert("Fill all required fields");
      return;
    }

    try {
      setLoading(true);

      const embed = normalizeYouTubeEmbed(form.embedLink);

      const docRef = await addDoc(collection(db, "premieres"), {
        title: form.title,
        description: form.description,
        embedLink: embed,
        bannerImage: form.bannerImage || "",
        thumbnailImage: form.thumbnailImage || "",
        displayTime: form.displayTime ? Timestamp.fromDate(new Date(form.displayTime)) : null,
        startTime: Timestamp.fromDate(new Date(form.startTime)),
        status: "scheduled",
        ticketRequired: form.ticketRequired,
        ticketPrice: Number(form.ticketPrice || 0),
        ticketLimit: Number(form.ticketLimit || 0),
        adminQuota: Number(form.adminQuota || 0),
        adminQuotaUsed: 0,
        countAdminQuotaInRevenue: form.countAdminQuotaInRevenue,
        ticketsSold: 0,
        createdAt: Timestamp.now(),
      });

      // Clear the draft after successful submission
      await clearDraft();

      router.push(`/admin/premieres/${docRef.id}`);

    } catch (err) {
      console.error("Create error:", err);
      alert("Error creating premiere: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 max-w-4xl mx-auto pb-16">

      <div className="admin-section">
        <p className="admin-kicker">Live Events</p>
        <h1 className="admin-title">Create premiere</h1>
        <p className="admin-lead">Set the live stream, access policy, and ticket rules in one place.</p>
        {draftIdParam && (
          <p className="text-xs text-cyan-400 mt-2">📝 Resuming from saved draft</p>
        )}
      </div>

      {/* AUTO-SAVE INDICATOR */}
      {adminEmail && (
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {autoSaving ? (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Saving draft...
            </span>
          ) : lastSaved ? (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              Draft auto-saved at {lastSaved.toLocaleTimeString()}
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-gray-500" />
              Changes will be auto-saved
            </span>
          )}
        </div>
      )}

      <div className="admin-surface rounded-[1.75rem] p-6 md:p-10 shadow-xl space-y-6">

        {/* TITLE */}
        <input
          name="title"
          placeholder="Premiere Title"
          value={form.title}
          onChange={handleChange}
          className="admin-input focus-ring"
        />

        {/* DESCRIPTION */}
        <textarea
          name="description"
          placeholder="Description (optional)"
          value={form.description}
          onChange={handleChange}
          className="admin-textarea focus-ring"
        />

        {/* YOUTUBE LINK */}
        <input
          name="embedLink"
          placeholder="Paste ANY YouTube Link"
          value={form.embedLink}
          onChange={handleChange}
          className="admin-input focus-ring"
        />

        {/* BANNER */}
        <ImageUploadSelector
          label="Banner Image"
          value={form.bannerImage}
          onChange={(val) => setForm((prev) => ({ ...prev, bannerImage: val }))}
          placeholder="Banner Image URL (optional)"
        />

        {/* THUMBNAIL */}
        <ImageUploadSelector
          label="Thumbnail Image (Join Page Preview)"
          value={form.thumbnailImage}
          onChange={(val) => setForm((prev) => ({ ...prev, thumbnailImage: val }))}
          placeholder="Thumbnail Image URL (optional)"
        />

        {/* START TIME */}
        <input
          type="datetime-local"
          name="startTime"
          value={form.startTime}
          onChange={handleChange}
          className="admin-input focus-ring"
        />

        {/* DISPLAY TIME (EARLY ACCESS) */}
        <div className="space-y-2">
          <label className="text-sm text-gray-300">
            Display Time (when to show on homepage) - Optional
          </label>
          <input
            type="datetime-local"
            name="displayTime"
            value={form.displayTime}
            onChange={handleChange}
            className="admin-input focus-ring"
          />
          <p className="text-xs text-gray-400">
            If set, premiere appears on homepage from this time. If blank, uses start time.
          </p>
        </div>

        {/* PAID */}
        <div className="flex items-center gap-3 admin-panel p-4 rounded-2xl">
          <input type="checkbox" name="ticketRequired" checked={form.ticketRequired} onChange={handleChange} />
          <label>Paid Premiere</label>
        </div>

        {form.ticketRequired && (
          <input
            name="ticketPrice"
            type="number"
            placeholder="Ticket Price"
            value={form.ticketPrice}
            onChange={handleChange}
            className="admin-input focus-ring"
          />
        )}

        {/* TICKET LIMIT */}
        <div className="space-y-2">
          <label className="text-sm text-gray-300">
            Max Participants (Ticket Limit) - Optional
          </label>
          <input
            name="ticketLimit"
            type="number"
            placeholder="e.g., 100, 500, or 0 for unlimited"
            value={form.ticketLimit}
            onChange={handleChange}
            className="admin-input focus-ring"
            min="0"
          />
          <p className="text-xs text-gray-400">
            Set max tickets to sell. Leave as 0 for unlimited.
          </p>
        </div>

        {/* ADMIN QUOTA */}
        <div className="space-y-2">
          <label className="text-sm text-gray-300">
            Admin Quota Tickets (Free tickets you can give) - Optional
          </label>
          <input
            name="adminQuota"
            type="number"
            placeholder="e.g., 50 free tickets"
            value={form.adminQuota}
            onChange={handleChange}
            className="admin-input focus-ring"
            min="0"
          />
          <p className="text-xs text-gray-400">
            How many free tickets you can give to friends/family.
          </p>
        </div>

        {/* COUNT ADMIN QUOTA IN REVENUE */}
        {form.adminQuota > 0 && (
          <div className="flex items-center gap-3 admin-panel p-3 rounded-2xl">
            <input
              type="checkbox"
              name="countAdminQuotaInRevenue"
              checked={form.countAdminQuotaInRevenue}
              onChange={handleChange}
            />
            <label>Count admin quota tickets in revenue?</label>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleCreate}
            disabled={loading}
            className="admin-button admin-button-primary flex-1 disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create Premiere"}
          </button>
          <button
            type="button"
            disabled={loading || autoSaving}
            onClick={async () => {
              try {
                const savedId = await saveDraftManually();
                if (savedId) {
                  alert("Draft saved successfully! You can resume it anytime from the Drafts tab.");
                } else {
                  alert("Please fill in at least the premiere title to save a draft.");
                }
              } catch (err) {
                alert("Failed to save draft: " + (err.message || err));
              }
            }}
            className="admin-button admin-button-secondary text-sm flex-none"
          >
            {autoSaving ? "Saving..." : "💾 Save as Draft"}
          </button>
        </div>

      </div>

    </div>
  );
}