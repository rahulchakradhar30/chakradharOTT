"use client";

import { useEffect, useState } from "react";
import { listDrafts, deleteDraft } from "@/lib/drafts";
import Link from "next/link";
import { motion } from "framer-motion";

const TYPE_CONFIG = {
  movie: { label: "Movie", icon: "🎬", color: "cyan", createPath: "/admin/movies/create" },
  premiere: { label: "Premiere", icon: "🎪", color: "pink", createPath: "/admin/premieres/create" },
  poster: { label: "Poster", icon: "🖼️", color: "blue", createPath: "/admin/posters/create" },
  genre: { label: "Genre", icon: "🏷️", color: "amber", createPath: "/admin/genres/create" },
};

export default function DraftsPage() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminEmail, setAdminEmail] = useState("");
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    const init = async () => {
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
    init();
  }, []);

  useEffect(() => {
    if (!adminEmail) return;

    const loadDrafts = async () => {
      try {
        setLoading(true);
        const type = filterType === "all" ? null : filterType;
        const list = await listDrafts(adminEmail, type);
        setDrafts(list);
      } catch (err) {
        console.error("Failed to load drafts:", err);
      } finally {
        setLoading(false);
      }
    };

    loadDrafts();
  }, [adminEmail, filterType]);

  const handleDelete = async (draftId) => {
    if (!confirm("Delete this draft? This cannot be undone.")) return;
    try {
      await deleteDraft(draftId);
      setDrafts((prev) => prev.filter((d) => d.id !== draftId));
    } catch (err) {
      console.error("Failed to delete draft:", err);
    }
  };

  const types = Object.keys(TYPE_CONFIG);

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* HEADER */}
      <div className="admin-section">
        <p className="admin-kicker text-cyan-300">📝 Work in Progress</p>
        <h1 className="admin-title">Drafts</h1>
        <p className="admin-lead">Resume any content you started creating. Auto-saved drafts are listed below.</p>
      </div>

      {/* FILTER TABS */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setFilterType("all")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${
            filterType === "all" ? "bg-cyan-500 text-white" : "bg-white/10 text-gray-300 hover:bg-white/15"
          }`}
        >
          All
        </button>
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${
              filterType === t ? "bg-cyan-500 text-white" : "bg-white/10 text-gray-300 hover:bg-white/15"
            }`}
          >
            {TYPE_CONFIG[t].icon} {TYPE_CONFIG[t].label}
          </button>
        ))}
      </div>

      {/* DRAFTS LIST */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : drafts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-5xl mb-4">📄</p>
          <h3 className="text-xl font-bold text-gray-400">No drafts</h3>
          <p className="text-sm text-gray-500 mt-2">
            Start creating content and your progress will be auto-saved here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {drafts.map((draft, index) => {
            const config = TYPE_CONFIG[draft.type] || TYPE_CONFIG.movie;
            const updatedAt = draft.updatedAt?.toDate
              ? draft.updatedAt.toDate()
              : new Date(draft.updatedAt || Date.now());
            const resumeUrl = `${config.createPath}?draftId=${draft.id}`;

            return (
              <motion.div
                key={draft.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="admin-surface rounded-2xl p-5 border border-white/5 space-y-3 hover:border-white/15 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{config.icon}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-${config.color}-500/20 border border-${config.color}-400/30 text-${config.color}-300`}>
                        {config.label}
                      </span>
                      <span className="text-[10px] text-gray-500">v{draft.version || 1}</span>
                    </div>
                    <h3 className="font-semibold text-white truncate">{draft.title || "Untitled Draft"}</h3>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Last saved: {updatedAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={resumeUrl}
                    className="flex-1 admin-button admin-button-primary text-xs py-2 text-center"
                  >
                    Resume Editing
                  </Link>
                  <button
                    onClick={() => handleDelete(draft.id)}
                    className="px-3 py-2 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 text-xs font-bold rounded-xl transition"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
