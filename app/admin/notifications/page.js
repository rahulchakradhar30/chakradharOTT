"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebase";
import {
  collection,
  query,
  orderBy,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
} from "firebase/firestore";
import { motion } from "framer-motion";
import { BellIcon } from "@/components/Icon";

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminEmail, setAdminEmail] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch("/api/admin/session");
        if (res.ok) {
          const data = await res.json();
          setAdminEmail(data.email || "");
        }
      } catch (err) {
        console.warn(err);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!adminEmail) return;

    const loadNotifications = async () => {
      try {
        setLoading(true);
        const notifRef = collection(db, "admins", adminEmail, "notifications");
        const q = query(notifRef, orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setNotifications(list);
      } catch (err) {
        console.error("Failed to load admin notifications:", err);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, [adminEmail]);

  const markAsRead = async (notifId) => {
    try {
      await updateDoc(doc(db, "admins", adminEmail, "notifications", notifId), { read: true });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error("Mark as read failed:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const batch = writeBatch(db);
      notifications
        .filter((n) => !n.read)
        .forEach((n) => {
          batch.update(doc(db, "admins", adminEmail, "notifications", n.id), { read: true });
        });
      await batch.commit();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error("Mark all as read failed:", err);
    }
  };

  const deleteNotification = async (notifId) => {
    try {
      await deleteDoc(doc(db, "admins", adminEmail, "notifications", notifId));
      setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    } catch (err) {
      console.error("Delete notification failed:", err);
    }
  };

  const filtered = filter === "unread"
    ? notifications.filter((n) => !n.read)
    : notifications;

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Group by date
  const grouped = {};
  filtered.forEach((n) => {
    const date = n.createdAt?.toDate
      ? n.createdAt.toDate()
      : new Date(n.createdAt || Date.now());
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const weekAgo = new Date(today.getTime() - 7 * 86400000);

    let group;
    if (date >= today) group = "Today";
    else if (date >= yesterday) group = "Yesterday";
    else if (date >= weekAgo) group = "This Week";
    else group = "Older";

    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(n);
  });

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      {/* HEADER */}
      <div className="admin-section">
        <p className="admin-kicker text-cyan-300">🔔 Alerts</p>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="admin-title">Admin Notifications</h1>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="admin-button admin-button-secondary text-xs py-2"
            >
              Mark All as Read ({unreadCount})
            </button>
          )}
        </div>
      </div>

      {/* FILTERS */}
      <div className="flex gap-3">
        {[
          { label: "All", value: "all" },
          { label: `Unread (${unreadCount})`, value: "unread" },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              filter === tab.value
                ? "bg-cyan-500 text-white"
                : "bg-white/10 text-gray-300 hover:bg-white/15"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* NOTIFICATIONS */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card rounded-2xl p-6 h-20 bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BellIcon className="w-16 h-16 text-gray-600 mb-4" />
          <h3 className="text-xl font-bold text-gray-400">No notifications</h3>
          <p className="text-sm text-gray-500 mt-2">
            {filter === "unread" ? "All caught up! No unread notifications." : "No admin notifications yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              <h3 className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-3 px-1">{group}</h3>
              <div className="space-y-3">
                {items.map((notif, index) => {
                  const date = notif.createdAt?.toDate
                    ? notif.createdAt.toDate()
                    : new Date(notif.createdAt || Date.now());

                  return (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className={`glass-card rounded-2xl p-5 border transition ${
                        notif.read
                          ? "border-white/10 opacity-60"
                          : "border-cyan-400/30 bg-cyan-500/5"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-white text-sm">{notif.title}</h4>
                          <p className="text-xs text-gray-400 mt-1">{notif.message}</p>
                          <p className="text-[10px] text-gray-500 mt-2">
                            {date.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!notif.read && (
                            <button
                              onClick={() => markAsRead(notif.id)}
                              className="text-[10px] text-cyan-300 hover:text-cyan-200 transition font-medium px-2 py-1 rounded-lg hover:bg-white/5"
                            >
                              Mark Read
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notif.id)}
                            className="text-[10px] text-red-400 hover:text-red-300 transition font-medium px-2 py-1 rounded-lg hover:bg-white/5"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
