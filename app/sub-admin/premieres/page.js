"use client";

import SubAdminAccessGuard from "@/components/admin/SubAdminAccessGuard";

export default function SubAdminPremieres() {
  return (
    <SubAdminAccessGuard moduleKey="premieres">
      <div className="space-y-6">
        <div>
          <p className="admin-kicker text-cyan-300">Live Streaming</p>
          <h1 className="admin-title">Live Premieres Desk</h1>
          <p className="admin-lead">Schedule and manage live premiere events.</p>
        </div>
        <div className="admin-surface p-6 rounded-2xl text-xs text-gray-300">
          Live Premieres module is active for your account.
        </div>
      </div>
    </SubAdminAccessGuard>
  );
}
