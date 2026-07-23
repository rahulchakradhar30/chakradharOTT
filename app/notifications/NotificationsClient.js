"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
} from "firebase/firestore";
import Link from "next/link";
import { motion } from "framer-motion";
import EmptyState from "@/components/EmptyState";
import {
  MovieIcon,
  SparklesIcon,
  RobotIcon,
  TrophyIcon,
  BellIcon
} from "@/components/Icon";

function NotificationIcon({ type, className = "w-6 h-6 text-cyan-400" }) {
  switch (type) {
    case "premiere":
      return <MovieIcon className={className} />;
    case "new_content":
      return <SparklesIcon className={className} />;
    case "recommendation":
      return <RobotIcon className={className} />;
    case "achievement":
      return <TrophyIcon className={className} />;
    case "system":
    default:
      return <BellIcon className={className} />;
  }
}

// Notification types config (colors only)
const NOTIFICATION_TYPES = {
  premiere: { color: "from-red-500" },
  new_content: { color: "from-blue-500" },
  recommendation: { color: "from-cyan-500" },
  achievement: { color: "from-yellow-500" },
  system: { color: "from-gray-500" },
};

export default function NotificationsClient() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!user) return;

    const loadNotifications = async () => {
      try {
        setLoading(true);
        const notificationsRef = collection(
          db,
          `users/${user.uid}/notifications`
        );

        let q;
        if (filter === "unread") {
          q = query(
            notificationsRef,
            where("read", "==", false),
            orderBy("createdAt", "desc")
          );
        } else {
          q = query(notificationsRef, orderBy("createdAt", "desc"));
        }

        const snapshot = await getDocs(q);
        const notif = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setNotifications(notif);
      } catch (err) {
        console.error("Error loading notifications:", err);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, [user, filter]);

  const markAsRead = async (notificationId) => {
    try {
      await updateDoc(
        doc(db, `users/${user.uid}/notifications/${notificationId}`),
        { read: true }
      );
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const batch = writeBatch(db);
      notifications
        .filter((n) => !n.read)
        .forEach((n) => {
          batch.update(doc(db, `users/${user.uid}/notifications/${n.id}`), { read: true });
        });
      await batch.commit();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await deleteDoc(doc(db, `users/${user.uid}/notifications/${notificationId}`));
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Group notifications by date
  const grouped = {};
  notifications.forEach((n) => {
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
    <div className="min-h-screen px-4 md:px-10 lg:px-16 py-10 md:py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header */}
        <div className="mb-8 md:mb-12">
          <p className="admin-kicker mb-2">Notifications</p>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-3xl md:text-5xl font-black tracking-tight">
              Your Notifications
            </h1>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <>
                  <div className="px-4 py-2 rounded-full bg-red-500/20 border border-red-500/50 text-red-200 text-sm font-medium">
                    {unreadCount} new
                  </div>
                  <button
                    onClick={markAllAsRead}
                    className="px-4 py-2 rounded-full bg-cyan-500/20 border border-cyan-500/50 text-cyan-200 text-sm font-medium hover:bg-cyan-500/30 transition"
                  >
                    Mark All Read
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
          {[
            { label: "All", value: "all" },
            { label: "Unread", value: "unread" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition font-medium ${
                filter === tab.value
                  ? "bg-cyan-500 text-white"
                  : "bg-white/10 text-gray-300 hover:bg-white/15"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="glass-card rounded-2xl p-6 h-20 bg-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            title="All caught up!"
            description="You have no notifications yet. We'll notify you about premieres, recommendations, and updates."
            icon="✨"
          />
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([group, items]) => (
              <div key={group}>
                <h3 className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-3 px-1">{group}</h3>
                <div className="space-y-3">
                  {items.map((notification, index) => {
                    const typeInfo = NOTIFICATION_TYPES[notification.type] || NOTIFICATION_TYPES.system;

                    return (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.03 }}
                        onClick={() => !notification.read && markAsRead(notification.id)}
                        className={`glass-card rounded-2xl p-4 md:p-6 border transition cursor-pointer hover:border-white/30 ${
                          notification.read
                            ? "border-white/10 opacity-60"
                            : "border-cyan-400/50 bg-cyan-500/5"
                        }`}
                      >
                        <div className="flex items-start gap-3 md:gap-4">
                          {/* Icon */}
                          <div className="flex-shrink-0">
                            <NotificationIcon type={notification.type} className="w-5 h-5 md:w-6 md:h-6 text-cyan-400" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm md:text-lg text-white mb-1">
                              {notification.title}
                            </h3>
                            <p className="text-gray-400 text-xs md:text-sm mb-2 md:mb-3">
                              {notification.message}
                            </p>
                            <p className="text-[10px] md:text-xs text-gray-500">
                              {new Date(
                                notification.createdAt?.toDate?.() ||
                                  notification.createdAt
                              ).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {!notification.read && (
                              <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-cyan-400" />
                            )}

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                              className="ml-2 text-[10px] text-red-400 hover:text-red-300 transition font-medium px-2 py-1 rounded-lg hover:bg-white/5"
                              title="Delete"
                            >
                              ✕
                            </button>

                            {notification.actionUrl && (
                              <Link
                                href={notification.actionUrl}
                                onClick={(e) => e.stopPropagation()}
                                className="ml-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium transition whitespace-nowrap"
                              >
                                View →
                              </Link>
                            )}
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
      </motion.div>
    </div>
  );
}
