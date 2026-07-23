"use client";

import SubAdminAccessGuard from "@/components/admin/SubAdminAccessGuard";

export default function SubAdminPosters() {
  return (
    <SubAdminAccessGuard moduleKey="posters">
      <div className="space-y-6">
        <div>
          <p className="admin-kicker text-cyan-300">Media Assets</p>
          <h1 className="admin-title">Posters Gallery</h1>
          <p className="admin-lead">Upload and organize promotional posters.</p>
        </div>
        <div className="admin-surface p-6 rounded-2xl text-xs text-gray-300">
          Posters & Gallery module is active for your account.
        </div>
      </div>
    </SubAdminAccessGuard>
  );
}
