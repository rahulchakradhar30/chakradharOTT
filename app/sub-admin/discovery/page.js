"use client";

import SubAdminAccessGuard from "@/components/admin/SubAdminAccessGuard";

export default function SubAdminDiscovery() {
  return (
    <SubAdminAccessGuard moduleKey="discovery">
      <div className="space-y-6">
        <div>
          <p className="admin-kicker text-cyan-300">Features & Toggles</p>
          <h1 className="admin-title">Discovery Desk</h1>
          <p className="admin-lead">Feature highlights and homepage discovery.</p>
        </div>
        <div className="admin-surface p-6 rounded-2xl text-xs text-gray-300">
          Discovery & Feature Toggles module is active for your account.
        </div>
      </div>
    </SubAdminAccessGuard>
  );
}
