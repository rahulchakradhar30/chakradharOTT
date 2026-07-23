"use client";

import SubAdminAccessGuard from "@/components/admin/SubAdminAccessGuard";

export default function SubAdminUsers() {
  return (
    <SubAdminAccessGuard moduleKey="users">
      <div className="space-y-6">
        <div>
          <p className="admin-kicker text-cyan-300">Audience</p>
          <h1 className="admin-title">Registered Users</h1>
          <p className="admin-lead">Subscriber profiles and activity logs.</p>
        </div>
        <div className="admin-surface p-6 rounded-2xl text-xs text-gray-300">
          Registered Users Management module is active for your account.
        </div>
      </div>
    </SubAdminAccessGuard>
  );
}
