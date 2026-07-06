"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebase";
import { collection, getDocs, query, orderBy, updateDoc, deleteDoc, doc } from "firebase/firestore";
import Link from "next/link";

export default function AdminPremieresPage() {
  const [premieres, setPremieres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active"); // "active" or "history"
  const [archiveModal, setArchiveModal] = useState(null);
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    const fetchPremieres = async () => {
      try {
        const q = query(
          collection(db, "premieres"),
          orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);

        setPremieres(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
        );
      } catch (err) {
        console.error("Error fetching premieres:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPremieres();
  }, []);

  // Filter premieres based on tab
  const activePremieres = premieres.filter((p) => !p.archived);
  const archivedPremieres = premieres.filter((p) => p.archived);

  const displayedPremieres = activeTab === "active" ? activePremieres : archivedPremieres;

  // Archive premiere
  const handleArchive = async (premiereId) => {
    try {
      setArchiving(true);

      await updateDoc(doc(db, "premieres", premiereId), {
        archived: true,
        archivedAt: new Date(),
      });

      setPremieres((prev) =>
        prev.map((p) =>
          p.id === premiereId
            ? { ...p, archived: true, archivedAt: new Date() }
            : p
        )
      );

      alert("✅ Premiere archived successfully!");
      setArchiveModal(null);
    } catch (err) {
      console.error("Error archiving premiere:", err);
      alert("Failed to archive premiere");
    } finally {
      setArchiving(false);
    }
  };

  // Restore premiere from archive
  const handleRestore = async (premiereId) => {
    try {
      await updateDoc(doc(db, "premieres", premiereId), {
        archived: false,
        archivedAt: null,
      });

      setPremieres((prev) =>
        prev.map((p) =>
          p.id === premiereId
            ? { ...p, archived: false, archivedAt: null }
            : p
        )
      );

      alert("✅ Premiere restored successfully!");
    } catch (err) {
      console.error("Error restoring premiere:", err);
      alert("Failed to restore premiere");
    }
  };

  // Permanently delete premiere
  const handleDelete = async (premiereId) => {
    const confirmDelete = window.confirm("⚠️ Are you absolutely sure you want to permanently delete this premiere? This action CANNOT be undone.");
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "premieres", premiereId));
      setPremieres((prev) => prev.filter((p) => p.id !== premiereId));
      alert("🗑️ Premiere permanently deleted!");
    } catch (err) {
      console.error("Error deleting premiere:", err);
      alert("Failed to delete premiere: " + err.message);
    }
  };

  return (
    <div className="space-y-10">

      {/* HEADER */}
      <div className="admin-toolbar items-end">
        <div className="admin-section max-w-2xl">
          <p className="admin-kicker">Live Events</p>
          <h1 className="admin-title">Premiere management</h1>
          <p className="admin-lead">Track active sessions, review history, and jump into a premiere’s detail page for tickets, room access, and lifecycle controls.</p>
        </div>

        <Link
          href="/admin/premieres/create"
          className="admin-button admin-button-primary"
        >
          + Create Premiere
        </Link>
      </div>

      {/* TABS */}
      <div className="admin-surface rounded-3xl p-2 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("active")}
          className={`px-4 py-2 font-semibold transition flex items-center gap-2 rounded-2xl ${
            activeTab === "active"
              ? "bg-cyan-500/15 text-cyan-200 border border-cyan-300/20"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Active Premieres
          <span className="admin-chip border-cyan-300/20 bg-cyan-500/10 text-cyan-100">
            {activePremieres.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 font-semibold transition flex items-center gap-2 rounded-2xl ${
            activeTab === "history"
              ? "bg-cyan-500/15 text-cyan-200 border border-cyan-300/20"
              : "text-gray-400 hover:text-white"
          }`}
        >
          History
          <span className="admin-chip bg-white/8 text-gray-200">
            {archivedPremieres.length}
          </span>
        </button>
        </div>

        <p className="text-xs text-gray-400 px-2">Archive or restore items without losing the detail history.</p>
      </div>

      {/* LOADING */}
      {loading && (
        <div className="admin-empty">Loading premieres...</div>
      )}

      {/* EMPTY STATE */}
      {!loading && displayedPremieres.length === 0 && (
        <div className="admin-empty text-center mt-10">
          <p className="text-lg mb-2 text-white">
            {activeTab === "active"
              ? "No active premieres"
              : "No archived premieres"}
          </p>
          <p className="text-sm">
            {activeTab === "active"
              ? "Create your first live event"
              : "Archived premieres will appear here"}
          </p>
        </div>
      )}

      {/* GRID */}
      {!loading && displayedPremieres.length > 0 && (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">

          {displayedPremieres.map((premiere) => (
            <div
              key={premiere.id}
              className={`admin-surface rounded-[1.75rem] p-5 transition group hover:-translate-y-1 border ${
                activeTab === "active"
                  ? "border-white/10"
                  : "border-white/10 opacity-80"
              }`}
            >
              {/* CLICKABLE AREA */}
              <Link
                href={`/admin/premieres/${premiere.id}`}
                className="block mb-3"
              >
                {/* TITLE */}
                <h2 className="text-lg font-semibold mb-2 group-hover:text-cyan-100 transition">
                  {premiere.title || "Untitled Premiere"}
                </h2>

                {/* STATUS */}
                <div className="mb-3">
                  <span
                    className={`admin-chip text-xs ${
                      premiere.status === "live"
                        ? "border-rose-300/20 bg-rose-500/15 text-rose-100"
                        : premiere.status === "ended"
                        ? "border-white/10 bg-white/5 text-gray-200"
                        : "border-amber-300/20 bg-amber-500/10 text-amber-100"
                    }`}
                  >
                    {premiere.status || "scheduled"}
                  </span>
                </div>

                {/* DESCRIPTION */}
                <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                  {premiere.description || "No description"}
                </p>

                {/* TIME */}
                <p className="text-xs text-gray-500 mb-2">
                  <span className="text-gray-400">Display:</span>{" "}
                  {premiere.displayTime
                    ? (premiere.displayTime.toDate ? premiere.displayTime.toDate().toLocaleString() : new Date(premiere.displayTime).toLocaleString())
                    : premiere.startTime
                    ? (premiere.startTime.toDate ? premiere.startTime.toDate().toLocaleString() : new Date(premiere.startTime).toLocaleString())
                    : "No date set"}
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  <span className="text-gray-400">Live:</span>{" "}
                  {premiere.startTime
                    ? (premiere.startTime.toDate ? premiere.startTime.toDate().toLocaleString() : new Date(premiere.startTime).toLocaleString())
                    : "No date set"}
                </p>
              </Link>

              {/* ACTIONS */}
              <div className="flex gap-2 pt-3 border-t border-white/10">
                {activeTab === "active" ? (
                  <button
                    onClick={() => setArchiveModal(premiere.id)}
                    className="flex-1 admin-button bg-amber-500/10 text-amber-100 border border-amber-300/20 text-xs py-2"
                  >
                    Archive
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleRestore(premiere.id)}
                      className="flex-1 admin-button bg-emerald-500/10 text-emerald-100 border border-emerald-300/20 text-xs py-2"
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => handleDelete(premiere.id)}
                      className="flex-1 admin-button bg-red-500/10 text-red-100 border border-red-300/20 text-xs py-2"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}

        </div>
      )}

      {/* ARCHIVE CONFIRMATION MODAL */}
      {archiveModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="admin-surface rounded-[1.75rem] max-w-md w-full p-6 space-y-4">
            <h2 className="text-xl font-bold">Archive premiere?</h2>

            <div className="p-3 bg-amber-500/10 border border-amber-300/20 rounded-2xl">
              <p className="text-sm text-gray-300">
                {premieres.find((p) => p.id === archiveModal)?.title}
              </p>
            </div>

            <p className="text-sm text-gray-400">
              Archiving will move this premiere to history. You can restore it anytime.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => handleArchive(archiveModal)}
                disabled={archiving}
                className="flex-1 admin-button admin-button-primary disabled:opacity-60"
              >
                {archiving ? "Archiving..." : "Archive"}
              </button>
              <button
                onClick={() => setArchiveModal(null)}
                className="flex-1 admin-button admin-button-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}