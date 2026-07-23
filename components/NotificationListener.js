"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";
import { db } from "@/firebase";
import { doc, collection, onSnapshot, query, orderBy } from "firebase/firestore";

export default function NotificationListener() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const sessionStartTime = useRef(new Date());

  useEffect(() => {
    if (!user?.uid) return;

    // Ask for Notification permission on load if default
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }

    // 1. Listen to user settings in real-time
    let browserNotificationsEnabled = true;
    const userRef = doc(db, "users", user.uid);
    const unsubUser = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const userData = snap.data();
        const settings = userData.settings || {};
        browserNotificationsEnabled = settings.browserNotifications !== false;
      }
    });

    // 2. Listen to user notifications in real-time
    const notifQuery = query(
      collection(db, "users", user.uid, "notifications"),
      orderBy("createdAt", "desc")
    );

    const unsubNotif = onSnapshot(notifQuery, (snap) => {
      snap.docChanges().forEach((change) => {
        // We only care about newly added documents
        if (change.type === "added") {
          const notif = change.doc.data();
          const notifDate = notif.createdAt ? (notif.createdAt.toDate ? notif.createdAt.toDate() : new Date(notif.createdAt)) : new Date();
          
          // Verify it's a new notification since session started, and not marked read
          if (notifDate >= sessionStartTime.current && !notif.read) {
            // Trigger in-app toast
            if (addToast) {
              addToast(`${notif.title}: ${notif.message}`, "info", 5000);
            }

            // Check if settings allow browser notifications
            if (browserNotificationsEnabled && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
              try {
                new Notification(notif.title, {
                  body: notif.message,
                  icon: "/favicon.ico",
                });
              } catch (err) {
                console.warn("Failed to fire browser notification:", err);
              }
            }
          }
        }
      });
    });

    return () => {
      unsubUser();
      unsubNotif();
    };
  }, [user, addToast]);

  return null;
}

