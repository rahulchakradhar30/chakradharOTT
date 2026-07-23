"use client";

import { useEffect, useRef, useState } from "react";
import { db } from "@/firebase";
import { collection, doc, onSnapshot, query, orderBy, limit } from "firebase/firestore";

export default function AdminNotificationListener({ adminEmail }) {
  const sessionStartTime = useRef(new Date());
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!adminEmail) return;

    const normalizedEmail = adminEmail.toLowerCase();

    // Ask for Notification permission
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }

    // Listen to admin notifications in real-time
    const notifQuery = query(
      collection(db, "admins", normalizedEmail, "notifications"),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsubNotif = onSnapshot(notifQuery, (snap) => {
      let newUnread = 0;

      snap.docChanges().forEach((change) => {
        if (change.type === "added") {
          const notif = change.doc.data();
          const notifDate = notif.createdAt
            ? (notif.createdAt.toDate ? notif.createdAt.toDate() : new Date(notif.createdAt))
            : new Date();

          if (!notif.read) {
            newUnread++;
          }

          // Show browser notification for new items
          if (
            notifDate >= sessionStartTime.current &&
            !notif.read &&
            typeof window !== "undefined" &&
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            try {
              new Notification(notif.title || "Admin Alert", {
                body: notif.message || "",
                icon: "/favicon.ico",
              });
            } catch (err) {
              console.warn("Browser notification failed:", err);
            }
          }
        }
      });

      // Count total unread
      const totalUnread = snap.docs.filter((d) => !d.data().read).length;
      setUnreadCount(totalUnread);
    });

    return () => unsubNotif();
  }, [adminEmail]);

  // This component doesn't render anything visible — unread count is for parent consumption
  return null;
}

export { AdminNotificationListener };
