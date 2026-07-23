"use client";

import { useEffect, useState } from "react";
import SubAdminAccessGuard from "@/components/admin/SubAdminAccessGuard";

export default function SubAdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/session")
      .then((r) => r.json())
      .then((data) => {
        if (data.email) {
          // Fetch notifications from API or Firestore
          setNotifications([
            { id: "1", title: "System Ready", message: "Sub-Admin Portal active.", createdAt: new Date() },
          ]);
        }
      })
      .catch((e) => console.warn(e))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SubAdminAccessGuard moduleKey="notifications">
      <div className="space-y-6">
        <div>
          <p className="admin-kicker text-cyan-300">System Logs</p>
          <h1 className="admin-title">Notifications Desk</h1>
          <p className="admin-lead">System notifications and administrative alerts.</p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-gray-400">Loading notifications...</div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <div key={n.id} className="admin-surface p-4 rounded-2xl space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-white">{n.title}</span>
                  <span className="text-[10px] text-gray-400">{new Date(n.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-gray-300">{n.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </SubAdminAccessGuard>
  );
}
