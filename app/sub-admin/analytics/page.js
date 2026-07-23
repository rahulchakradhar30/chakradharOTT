"use client";

import SubAdminAccessGuard from "@/components/admin/SubAdminAccessGuard";

export default function SubAdminAnalytics() {
  return (
    <SubAdminAccessGuard moduleKey="analytics">
      <div className="space-y-6">
        <div>
          <p className="admin-kicker text-cyan-300">Insights & Metrics</p>
          <h1 className="admin-title">Search & Watch Analytics</h1>
          <p className="admin-lead">Platform performance and user search queries.</p>
        </div>
        <div className="admin-surface p-6 rounded-2xl text-xs text-gray-300">
          Analytics & Search Insights module is active for your account.
        </div>
      </div>
    </SubAdminAccessGuard>
  );
}
