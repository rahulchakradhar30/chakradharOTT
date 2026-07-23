"use client";

import SubAdminAccessGuard from "@/components/admin/SubAdminAccessGuard";

export default function SubAdminGenres() {
  return (
    <SubAdminAccessGuard moduleKey="genres">
      <div className="space-y-6">
        <div>
          <p className="admin-kicker text-cyan-300">Taxonomy</p>
          <h1 className="admin-title">Genres Management</h1>
          <p className="admin-lead">Manage video genres and tags.</p>
        </div>
        <div className="admin-surface p-6 rounded-2xl text-xs text-gray-300">
          Genres Management module is active for your account.
        </div>
      </div>
    </SubAdminAccessGuard>
  );
}
