"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import Link from "next/link";
import { motion } from "framer-motion";

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    maxMoviesPerPage: 12,
    enableNewReleases: true,
    enablePremières: true,
    enableReviews: true,
    enableWishlist: true,
    enableNotifications: true,
    premiumRequired: false,
  });

  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [adminRole, setAdminRole] = useState("sub_admin");

  useEffect(() => {
    const checkRole = async () => {
      try {
        const res = await fetch("/api/admin/session");
        if (res.ok) {
          const data = await res.json();
          setAdminRole(data.role || "sub_admin");
        }
      } catch (err) {
        console.warn(err);
      }
    };
    checkRole();
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsSnap = await getDocs(collection(db, "settings"));
        if (!settingsSnap.empty) {
          setSettings(settingsSnap.docs[0].data());
        }
      } catch (error) {
        console.error("Fetch settings error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleToggle = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    try {
      const settingsSnap = await getDocs(collection(db, "settings"));
      if (!settingsSnap.empty) {
        await updateDoc(settingsSnap.docs[0].ref, settings);
      } else {
        await updateDoc(doc(db, "settings", "global"), settings);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save settings");
    }
  };

  return (
    <div className="space-y-10 pb-28 md:pb-16">
      {/* HEADER */}
      <motion.div initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} className="admin-toolbar items-end">
        <div className="admin-section max-w-2xl">
          <p className="admin-kicker text-cyan-300 text-sm tracking-widest">✦ Platform Settings</p>
          <h1 className="admin-title text-4xl font-black">Admin Settings</h1>
          <p className="admin-lead text-gray-300">Configure platform features, maintenance mode, and global preferences.</p>
        </div>

        <Link href="/admin" className="admin-button admin-button-secondary text-sm">
          ← Back to Dashboard
        </Link>
      </motion.div>

      {/* SETTINGS SECTIONS */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading settings...</div>
      ) : (
        <div className="space-y-8">
          {/* MAINTENANCE MODE */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-2xl md:rounded-3xl p-6 md:p-8 border border-red-400/20 bg-gradient-to-r from-red-500/10 to-rose-500/5"
          >
            <div className="flex items-start justify-between gap-6">
              <div>
                <h2 className="text-xl font-bold mb-2">🔧 Maintenance Mode</h2>
                <p className="text-sm text-gray-400">
                  When enabled, the platform will show a maintenance message to all users. Admin access remains active.
                </p>
              </div>
              <button
                onClick={() => handleToggle("maintenanceMode")}
                className={`px-6 py-3 rounded-lg font-semibold transition min-w-fit ${
                  settings.maintenanceMode
                    ? "bg-red-500/30 border border-red-300/50 text-red-300"
                    : "bg-white/5 border border-white/15 hover:bg-white/10"
                }`}
              >
                {settings.maintenanceMode ? "🔴 ON" : "⚪ OFF"}
              </button>
            </div>
          </motion.div>

          {/* FEATURE FLAGS */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card rounded-2xl md:rounded-3xl p-6 md:p-8 border border-cyan-400/20"
          >
            <h2 className="text-xl font-bold mb-6">✨ Feature Flags</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                ["🎬 Enable New Releases", "enableNewReleases"],
                ["🎪 Enable Premieres", "enablePremières"],
                ["⭐ Enable Reviews", "enableReviews"],
                ["❤️ Enable Wishlist", "enableWishlist"],
                ["🔔 Enable Notifications", "enableNotifications"],
                ["💎 Premium Required", "premiumRequired"],
              ].map(([label, key]) => (
                <button
                  key={key}
                  onClick={() => handleToggle(key)}
                  className={`p-4 rounded-lg border transition text-left font-semibold ${
                    settings[key]
                      ? "bg-green-500/20 border-green-300/50 text-green-300"
                      : "bg-white/5 border-white/15 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{label}</span>
                    <span className="text-lg">{settings[key] ? "✓" : "✕"}</span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>

          {/* PAGINATION */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card rounded-2xl md:rounded-3xl p-6 md:p-8 border border-blue-400/20 bg-gradient-to-r from-blue-500/10 to-cyan-500/5"
          >
            <h2 className="text-xl font-bold mb-6">📄 Pagination Settings</h2>

            <div>
              <label className="block text-sm font-semibold mb-3">Movies per Page</label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  value={settings.maxMoviesPerPage}
                  onChange={(e) => handleChange("maxMoviesPerPage", parseInt(e.target.value) || 12)}
                  min="6"
                  max="50"
                  className="admin-input focus-ring w-32"
                />
                <span className="text-sm text-gray-400">
                  Currently showing {settings.maxMoviesPerPage} movies per page
                </span>
              </div>
            </div>
          </motion.div>

          {/* QUICK ACTIONS */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card rounded-2xl md:rounded-3xl p-6 md:p-8 border border-amber-400/20 bg-gradient-to-r from-amber-500/10 to-orange-500/5"
          >
            <h2 className="text-xl font-bold mb-6">🚀 Quick Links</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                ["📽️ Manage Movies", "/admin/movies"],
                ["🎪 Manage Premieres", "/admin/premieres"],
                ["🏷️ Manage Genres", "/admin/genres"],
                ["🔍 Discovery Settings", "/admin/discovery"],
                ["📊 Search Analytics", "/admin/search-analytics"],
                ["💬 Comments", "/admin/comments"],
              ].map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  className="p-4 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 hover:border-amber-300/40 transition text-sm font-semibold text-center"
                >
                  {label}
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* SAVE BUTTON */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="fixed bottom-0 left-0 right-0 bg-[#04070f]/95 backdrop-blur-xl border-t border-white/10 p-4 md:p-6 flex items-center justify-between gap-4 md:relative md:bg-transparent md:border-0"
      >
        <button
          onClick={handleSave}
          className="admin-button admin-button-primary flex-1 md:flex-none"
        >
          {saved ? "✓ Settings Saved" : "💾 Save Settings"}
        </button>

        {saved && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-green-300 font-semibold text-sm"
          >
            Changes saved successfully
          </motion.span>
        )}
      </motion.div>
    </div>
  );
}
