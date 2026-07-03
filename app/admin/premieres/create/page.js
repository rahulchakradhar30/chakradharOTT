"use client";

import { useState } from "react";
import { db } from "@/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { normalizeYouTubeEmbed } from "@/lib/youtube";
import ImageUploadSelector from "@/components/ImageUploadSelector";

export default function CreatePremierePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    embedLink: "",
    bannerImage: "",
    startTime: "",
    displayTime: "",
    ticketRequired: false,
    ticketPrice: 0,
    ticketLimit: 0,
    adminQuota: 0,
    countAdminQuotaInRevenue: false,
  });

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
        displayTime: form.displayTime ? Timestamp.fromDate(new Date(form.displayTime)) : null,
        startTime: Timestamp.fromDate(new Date(form.startTime)), // ✅ FIXED
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

      // ✅ FIXED REDIRECT
      router.push(`/admin/premieres/${docRef.id}`);

    } catch (err) {
      console.error("Create error:", err);
      alert("Error creating premiere: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 max-w-4xl mx-auto">

      <div className="admin-section">
        <p className="admin-kicker">Live Events</p>
        <h1 className="admin-title">Create premiere</h1>
        <p className="admin-lead">Set the live stream, access policy, and ticket rules in one place.</p>
      </div>

      <div className="admin-surface rounded-[1.75rem] p-6 md:p-10 shadow-xl space-y-6">

        {/* TITLE */}
        <input
          name="title"
          placeholder="Premiere Title"
          onChange={handleChange}
          className="admin-input focus-ring"
        />

        {/* DESCRIPTION */}
        <textarea
          name="description"
          placeholder="Description (optional)"
          onChange={handleChange}
          className="admin-textarea focus-ring"
        />

        {/* YOUTUBE LINK */}
        <input
          name="embedLink"
          placeholder="Paste ANY YouTube Link"
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

        {/* START TIME */}
        <input
          type="datetime-local"
          name="startTime"
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
            onChange={handleChange}
            className="admin-input focus-ring"
          />
          <p className="text-xs text-gray-400">
            If set, premiere appears on homepage from this time. If blank, uses start time.
          </p>
        </div>

        {/* PAID */}
        <div className="flex items-center gap-3 admin-panel p-4 rounded-2xl">
          <input type="checkbox" name="ticketRequired" onChange={handleChange} />
          <label>Paid Premiere</label>
        </div>

        {form.ticketRequired && (
          <input
            name="ticketPrice"
            type="number"
            placeholder="Ticket Price"
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
              onChange={handleChange}
            />
            <label>Count admin quota tickets in revenue?</label>
          </div>
        )}

        <button
          onClick={handleCreate}
          disabled={loading}
          className="admin-button admin-button-primary w-full disabled:opacity-60"
        >
          {loading ? "Creating..." : "Create Premiere"}
        </button>

      </div>

    </div>
  );
}