"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function SubAdminAccessGuard({ moduleKey, children }) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const checkPerm = async () => {
      try {
        const res = await fetch("/api/admin/session");
        if (res.ok) {
          const data = await res.json();

          // Super admins can access everything
          if (data.role === "super_admin") {
            setAllowed(true);
            return;
          }

          // Sub-admin permission check
          const perms = data.permissions?.modules || {};
          if (perms[moduleKey] === true || moduleKey === "dashboard") {
            setAllowed(true);
          } else {
            setAllowed(false);
          }
        }
      } catch (e) {
        console.warn("Permission check error:", e);
      } finally {
        setLoading(false);
      }
    };

    checkPerm();
  }, [moduleKey]);

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-white">
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-6 py-4 rounded-2xl">
          <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-gray-300">Validating feature permissions...</span>
        </div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-500/20 to-rose-500/20 border border-amber-500/30 flex items-center justify-center text-4xl mb-6 shadow-xl shadow-amber-500/10">
          🔒
        </div>
        <p className="admin-kicker text-amber-400 mb-1">Access Restricted</p>
        <h2 className="text-2xl font-black text-white mb-3">Feature Disabled by Super Administrator</h2>
        <p className="text-xs text-gray-400 leading-relaxed mb-6">
          You do not currently have access to the <strong className="text-cyan-300 uppercase">{moduleKey}</strong> module.
          Please request permission from the Root Super Administrator (<span className="text-cyan-400">thefifthagefilms@gmail.com</span>) to enable this section.
        </p>

        <Link
          href="/sub-admin"
          className="admin-button bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs uppercase px-6 py-3 rounded-2xl shadow-lg shadow-cyan-500/20 flex items-center gap-2"
        >
          <span>↩</span> Return to Sub-Admin Control Center
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
