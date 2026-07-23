"use client";

import { useEffect, useState } from "react";
import { listDrafts, deleteDraft } from "@/lib/drafts";
import Link from "next/link";
import SubAdminAccessGuard from "@/components/admin/SubAdminAccessGuard";

export default function SubAdminDrafts() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/session")
      .then((r) => r.json())
      .then((data) => {
        if (data.email) {
          listDrafts(data.email).then((list) => setDrafts(list));
        }
      })
      .catch((e) => console.warn(e))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Delete this draft?")) return;
    await deleteDraft(id);
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <SubAdminAccessGuard moduleKey="drafts">
      <div className="space-y-6">
        <div>
          <p className="admin-kicker text-cyan-300">Auto-Save Manager</p>
          <h1 className="admin-title">Personal Drafts</h1>
          <p className="admin-lead">Resume unfinished form entries and media uploads.</p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-gray-400">Loading drafts...</div>
        ) : drafts.length === 0 ? (
          <div className="admin-empty text-xs text-gray-400">No saved drafts found.</div>
        ) : (
          <div className="space-y-3">
            {drafts.map((d) => (
              <div key={d.id} className="admin-surface p-4 rounded-2xl flex items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-cyan-400">{d.type}</span>
                  <h3 className="text-sm font-bold text-white">{d.title || "Untitled Draft"}</h3>
                  <p className="text-[11px] text-gray-400">
                    Last updated: {d.updatedAt?.toDate ? d.updatedAt.toDate().toLocaleString() : "Recently"}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/sub-admin/${d.type === "premiere" ? "premieres/create" : "movies/create"}?draftId=${d.id}`}
                    className="admin-button bg-cyan-500 text-black font-bold text-xs px-4 py-2 rounded-xl"
                  >
                    Resume
                  </Link>
                  <button
                    onClick={() => handleDelete(d.id)}
                    className="admin-button bg-rose-500/10 text-rose-300 border border-rose-500/20 text-xs px-3 py-2 rounded-xl"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SubAdminAccessGuard>
  );
}
