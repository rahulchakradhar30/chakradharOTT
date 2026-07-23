"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SubAdminAccessGuard from "@/components/admin/SubAdminAccessGuard";

export default function SubAdminDashboard() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    fetch("/api/admin/session")
      .then((r) => r.json())
      .then((data) => setSession(data))
      .catch((e) => console.warn(e));
  }, []);

  const modules = session?.permissions?.modules || {};

  return (
    <SubAdminAccessGuard moduleKey="dashboard">
      <div className="space-y-8">
        {/* HEADER */}
        <div>
          <p className="admin-kicker text-cyan-300">Authorized Sub-Administrator Workspace</p>
          <h1 className="admin-title flex items-center gap-2">
            <span>🔐</span> Sub-Admin Desk
          </h1>
          <p className="admin-lead">Manage your permitted modules and communicate with staff members.</p>
        </div>

        {/* PROFILE BANNER */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-cyan-950/40 to-blue-950/40 border border-cyan-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black uppercase text-cyan-400">Account Verified</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">Sub-Admin</span>
            </div>
            <p className="text-lg font-bold text-white">{session?.name || session?.email}</p>
            <p className="text-xs text-gray-400 font-mono">{session?.email}</p>
          </div>

          <Link
            href="/sub-admin/mail"
            className="admin-button bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase text-xs tracking-wider px-5 py-3 rounded-2xl flex items-center gap-2 w-fit shadow-lg shadow-cyan-500/20"
          >
            <span>✉️</span> Open Admin Mail
          </Link>
        </div>

        {/* PERMITTED MODULE CARDS GRID */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Your Permitted Modules</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.movies && (
              <Link href="/sub-admin/movies" className="p-5 rounded-2xl bg-white/5 hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-500/30 transition group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">🎬</span>
                  <span className="text-xs font-bold text-cyan-400 group-hover:translate-x-1 transition">Access →</span>
                </div>
                <h3 className="text-sm font-bold text-white">Movies Studio</h3>
                <p className="text-xs text-gray-400 mt-1">Upload, edit, and publish titles in catalog.</p>
              </Link>
            )}

            {modules.premieres && (
              <Link href="/sub-admin/premieres" className="p-5 rounded-2xl bg-white/5 hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-500/30 transition group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">🎪</span>
                  <span className="text-xs font-bold text-cyan-400 group-hover:translate-x-1 transition">Access →</span>
                </div>
                <h3 className="text-sm font-bold text-white">Live Premieres</h3>
                <p className="text-xs text-gray-400 mt-1">Schedule live events and ticket sales.</p>
              </Link>
            )}

            {modules.posters && (
              <Link href="/sub-admin/posters" className="p-5 rounded-2xl bg-white/5 hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-500/30 transition group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">🖼️</span>
                  <span className="text-xs font-bold text-cyan-400 group-hover:translate-x-1 transition">Access →</span>
                </div>
                <h3 className="text-sm font-bold text-white">Posters Gallery</h3>
                <p className="text-xs text-gray-400 mt-1">Manage promotional artwork & posters.</p>
              </Link>
            )}

            {modules.contacts && (
              <Link href="/sub-admin/contacts" className="p-5 rounded-2xl bg-white/5 hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-500/30 transition group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">📬</span>
                  <span className="text-xs font-bold text-cyan-400 group-hover:translate-x-1 transition">Access →</span>
                </div>
                <h3 className="text-sm font-bold text-white">Support Contacts</h3>
                <p className="text-xs text-gray-400 mt-1">Review user tickets and reply to messages.</p>
              </Link>
            )}

            {modules.drafts && (
              <Link href="/sub-admin/drafts" className="p-5 rounded-2xl bg-white/5 hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-500/30 transition group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">📝</span>
                  <span className="text-xs font-bold text-cyan-400 group-hover:translate-x-1 transition">Access →</span>
                </div>
                <h3 className="text-sm font-bold text-white">Personal Drafts</h3>
                <p className="text-xs text-gray-400 mt-1">Resume auto-saved forms and uploads.</p>
              </Link>
            )}

            {modules.mail && (
              <Link href="/sub-admin/mail" className="p-5 rounded-2xl bg-white/5 hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-500/30 transition group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">✉️</span>
                  <span className="text-xs font-bold text-cyan-400 group-hover:translate-x-1 transition">Access →</span>
                </div>
                <h3 className="text-sm font-bold text-white">Admin Mail Desk</h3>
                <p className="text-xs text-gray-400 mt-1">Send and reply to internal emails.</p>
              </Link>
            )}

            {modules.notifications && (
              <Link href="/sub-admin/notifications" className="p-5 rounded-2xl bg-white/5 hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-500/30 transition group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">🔔</span>
                  <span className="text-xs font-bold text-cyan-400 group-hover:translate-x-1 transition">Access →</span>
                </div>
                <h3 className="text-sm font-bold text-white">Notifications Desk</h3>
                <p className="text-xs text-gray-400 mt-1">View system alerts and activity logs.</p>
              </Link>
            )}
          </div>
        </div>
      </div>
    </SubAdminAccessGuard>
  );
}
