"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/firebase";
import {
  doc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  orderBy,
  writeBatch
} from "firebase/firestore";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  GoogleAuthProvider,
  updateProfile
} from "firebase/auth";
import { auth } from "@/firebase";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const TABS = [
  { key: "overview", label: "Overview", icon: "👤" },
  { key: "activity", label: "My Activity", icon: "📊" },
  { key: "wishlist", label: "My List", icon: "❤️" },
  { key: "tickets", label: "Tickets", icon: "🎟️" },
  { key: "support", label: "Support Tickets", icon: "💬" },
  { key: "notifications", label: "Notifications", icon: "🔔" },
  { key: "achievements", label: "Achievements", icon: "🏆" },
  { key: "payments", label: "Payments", icon: "💳" },
  { key: "settings", label: "Settings", icon: "⚙️" },
  { key: "security", label: "Security", icon: "🔒" },
];

const defaultSettings = {
  premiereReminders: true,
  emailNotifications: true,
  autoplayTrailers: false,
  dataSaver: false,
  subtitlesDefault: "English",
  playbackQuality: "Auto",
};

// Achievement library definition
const ACHIEVEMENT_LIST = [
  { id: "first_movie", title: "First Premiere", desc: "Watched your first movie segment!", icon: "🎬" },
  { id: "super_fan", title: "Super Fan", desc: "Added 10 or more movies to your continue watching history!", icon: "🌟" },
  { id: "marathoner", title: "Marathoner", desc: "Completed 50 hours of playback watch-time!", icon: "🏃" },
  { id: "binge_master", title: "Binge Master", desc: "Completed 100 hours of playback watch-time!", icon: "👑" },
  { id: "weekly_streak", title: "Loyal Streamer", desc: "Maintained a 7-day daily login streak!", icon: "🔥" },
  { id: "first_ticket", title: "Reporter", desc: "Filed your first support ticket!", icon: "📞" },
];

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("overview");
  const [loadingPage, setLoadingPage] = useState(true);

  const [wishlist, setWishlist] = useState([]);
  const [comments, setComments] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [watchHistory, setWatchHistory] = useState([]);
  const [continueWatching, setContinueWatching] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [supportTickets, setSupportTickets] = useState([]);
  const [selectedSupportTicket, setSelectedSupportTicket] = useState(null);
  
  // Real-time states
  const [notifications, setNotifications] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [userStats, setUserStats] = useState(null);

  const [profile, setProfile] = useState({
    name: "",
    firstName: "",
    lastName: "",
    bio: "",
    mobile: "",
    dob: "",
    photoURL: "",
  });

  const [settings, setSettings] = useState(defaultSettings);
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  // Security Form States
  const [pwdForm, setPwdForm] = useState({ current: "", new: "", confirm: "" });
  const [pwdLoading, setPwdLoading] = useState(false);

  useEffect(() => {
    if (user === null) {
      router.push("/login");
    }
  }, [user, router]);

  // Real-time onSnapshot Synchronization Setup
  useEffect(() => {
    if (!user?.uid) return;

    // 1. Real-time Profile & Achievements Listener
    const userRef = doc(db, "users", user.uid);
    const unsubUser = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const userData = snap.data();
        setProfile({
          name: userData.name || user.displayName || "",
          firstName: userData.firstName || "",
          lastName: userData.lastName || "",
          bio: userData.bio || "",
          mobile: userData.mobile || "",
          dob: userData.dob || "",
          photoURL: userData.photoURL || user.photoURL || "",
        });
        setSettings({
          ...defaultSettings,
          ...(userData.settings || {}),
        });
        setAchievements(userData.achievements || []);
      }
    });

    // 2. Real-time Notifications Listener
    const notifQuery = query(
      collection(db, "users", user.uid, "notifications"),
      orderBy("createdAt", "desc")
    );
    const unsubNotif = onSnapshot(notifQuery, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.warn("Notifications listener failed:", err);
    });

    // 3. Real-time Support Tickets Listener (Unified by UID or email)
    const ticketsQuery = query(
      collection(db, "contacts"),
      where("email", "==", user.email.toLowerCase())
    );
    const unsubTickets = onSnapshot(ticketsQuery, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSupportTickets(
        all.sort((a, b) => {
          const aDate = a.createdAt?.toDate?.()?.getTime?.() || new Date(a.createdAt).getTime() || 0;
          const bDate = b.createdAt?.toDate?.()?.getTime?.() || new Date(b.createdAt).getTime() || 0;
          return bDate - aDate;
        })
      );
    }, (err) => {
      console.warn("Support tickets listener failed:", err);
    });

    // 4. Real-time User Playback Stats Listener
    const statsRef = doc(db, "userStats", user.uid);
    const unsubStats = onSnapshot(statsRef, (snap) => {
      if (snap.exists()) {
        setUserStats(snap.data());
      }
    });

    // 5. Fetch other static snapshot items once
    const loadProfileData = async () => {
      try {
        setLoadingPage(true);
        const [wishlistSnap, commentSnap, ratingSnap, watchSnap, ticketsSnap, continueSnap] = await Promise.all([
          getDocs(collection(db, "users", user.uid, "wishlist")),
          getDocs(query(collection(db, "comments"), where("userId", "==", user.uid))),
          getDocs(query(collection(db, "ratings"), where("userId", "==", user.uid))),
          getDocs(collection(db, "users", user.uid, "watchHistory")),
          getDocs(collection(db, "users", user.uid, "tickets")),
          getDocs(collection(db, "users", user.uid, "continueWatching")),
        ]);

        setWishlist(wishlistSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setComments(commentSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setRatings(ratingSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setWatchHistory(watchSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setContinueWatching(continueSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        
        const allTickets = ticketsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setTickets(
          allTickets.sort((a, b) => {
            const aDate = a.createdAt?.toDate?.()?.getTime?.() || 0;
            const bDate = b.createdAt?.toDate?.()?.getTime?.() || 0;
            return bDate - aDate;
          })
        );
        setPaymentHistory(
          allTickets.filter((t) => t.purchasedAt).sort((a, b) => {
            const aDate = a.purchasedAt?.toDate?.()?.getTime?.() || 0;
            const bDate = b.purchasedAt?.toDate?.()?.getTime?.() || 0;
            return bDate - aDate;
          })
        );
      } catch (error) {
        console.error("Profile static loads error:", error);
      } finally {
        setLoadingPage(false);
      }
    };

    loadProfileData();

    return () => {
      unsubUser();
      unsubNotif();
      unsubTickets();
      unsubStats();
    };
  }, [user]);

  // Compute watch time aggregates dynamically from logs (in hours)
  const watchHours = useMemo(() => {
    let daily = 0, weekly = 0, monthly = 0, lifetime = 0;
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

    watchHistory.forEach((log) => {
      const secs = log.activeTime || 0;
      lifetime += secs;

      const dateObj = log.watchedAt ? (log.watchedAt.toDate ? log.watchedAt.toDate() : new Date(log.watchedAt)) : null;
      if (!dateObj) return;

      const dateStr = dateObj.toISOString().split("T")[0];
      if (dateStr === todayStr) {
        daily += secs;
      }
      if (dateObj >= oneWeekAgo) {
        weekly += secs;
      }
      if (dateObj >= oneMonthAgo) {
        monthly += secs;
      }
    });

    return {
      daily: (daily / 3600).toFixed(2),
      weekly: (weekly / 3600).toFixed(2),
      monthly: (monthly / 3600).toFixed(2),
      lifetime: (lifetime / 3600).toFixed(2),
    };
  }, [watchHistory]);

  const stats = useMemo(
    () => [
      { label: "Wishlist", value: wishlist.length, color: "from-pink-500 to-rose-600" },
      { label: "Comments", value: comments.length, color: "from-cyan-500 to-blue-600" },
      { label: "Ratings", value: ratings.length, color: "from-amber-500 to-orange-600" },
      { label: "Tickets", value: tickets.length, color: "from-emerald-500 to-green-600" },
    ],
    [wishlist.length, comments.length, ratings.length, tickets.length]
  );

  const getAccountType = () => {
    if (!user) return { label: "Guest", color: "bg-gray-600" };
    if (user.uid?.startsWith("demo_")) return { label: "Demo Guest", color: "bg-amber-600" };
    const provider = user.providerData?.[0]?.providerId;
    if (provider === "google.com") return { label: "Google", color: "bg-red-600" };
    return { label: "Email", color: "bg-blue-600" };
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;

    setUploadingPhoto(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const base64Data = reader.result;
      try {
        let finalUrl = base64Data;
        const res = await fetch("/api/cloudinary/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file: base64Data }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.secure_url) finalUrl = data.secure_url;
        }

        if (auth.currentUser) {
          await updateProfile(auth.currentUser, { photoURL: finalUrl });
        }
        await updateDoc(doc(db, "users", user.uid), { photoURL: finalUrl });
        setProfile((prev) => ({ ...prev, photoURL: finalUrl }));
      } catch (err) {
        console.error("Photo upload failed:", err);
      } finally {
        setUploadingPhoto(false);
      }
    };
  };

  const handleRemovePhoto = async () => {
    if (!user?.uid) return;
    if (!window.confirm("Are you sure you want to remove your profile photo?")) return;
    try {
      const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile.name || "User")}`;
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: defaultAvatar });
      }
      await updateDoc(doc(db, "users", user.uid), { photoURL: defaultAvatar });
      setProfile((prev) => ({ ...prev, photoURL: defaultAvatar }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSettings = async () => {
    if (!user?.uid) return;
    setSavingSettings(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { settings });
      alert("Settings saved successfully!");
    } catch (err) {
      console.error(err);
    } finally {
      setSavingSettings(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwdForm.new !== pwdForm.confirm) {
      alert("New password and confirm password fields do not match.");
      return;
    }
    setPwdLoading(true);
    try {
      const { updatePassword } = await import("firebase/auth");
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, pwdForm.new);
        alert("Password updated successfully!");
        setPwdForm({ current: "", new: "", confirm: "" });
      }
    } catch (err) {
      alert("Password update failed. Verify current credentials or try re-logging in.");
    } finally {
      setPwdLoading(false);
    }
  };

  const handleMarkNotificationsRead = async () => {
    if (!user?.uid || notifications.length === 0) return;
    try {
      const batch = writeBatch(db);
      notifications.forEach(n => {
        if (!n.read) {
          batch.update(doc(db, "users", user.uid, "notifications", n.id), { read: true });
        }
      });
      await batch.commit();
    } catch (err) {
      console.error(err);
    }
  };

  const unreadNotificationsCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  if (loadingPage) {
    return (
      <div className="text-center py-24 text-white">
        <div className="mx-auto h-10 w-10 rounded-full border-4 border-cyan-400/30 border-t-cyan-400 animate-spin" />
        <p className="mt-4 text-gray-400">Loading central dashboard feeds...</p>
      </div>
    );
  }

  const accountType = getAccountType();

  return (
    <div className="min-h-screen text-white pb-24 relative overflow-hidden text-left">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(0,212,255,0.18),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(255,77,141,0.12),_transparent_30%)]" />

      {/* DASHBOARD HERO HEADER */}
      <div className="relative z-10 px-4 md:px-10 lg:px-16 pt-10">
        <div className="glass-card rounded-[2.5rem] p-6 md:p-10 border border-white/10 flex flex-col md:flex-row items-center gap-8 justify-between">
          <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            <div className="relative group w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-2 border-cyan-300/40 shrink-0">
              {profile.photoURL ? (
                <img
                  src={profile.photoURL}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-cyan-950 flex items-center justify-center text-3xl font-black">
                  👤
                </div>
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex flex-col gap-1 items-center justify-center text-[10px]">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-cyan-300 font-bold hover:underline"
                >
                  Upload
                </button>
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="text-red-400 font-bold hover:underline"
                >
                  Remove
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={uploadingPhoto}
                className="hidden"
              />
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight">{profile.name}</h1>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-white ${accountType.color}`}>
                  {accountType.label}
                </span>
              </div>
              <p className="text-sm text-gray-400 font-medium font-mono">{user.email}</p>
              <p className="text-xs text-gray-300 italic max-w-md">{profile.bio || "No profile bio set yet. Click Edit Profile to update details."}</p>
            </div>
          </div>

          <div className="flex flex-col items-center md:items-end gap-3 shrink-0">
            <div className="flex gap-4">
              <div className="text-center p-3 rounded-2xl bg-zinc-950/65 border border-white/5 min-w-[70px]">
                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Streak</p>
                <p className="text-2xl font-black text-orange-400">🔥 {userStats?.watchStreak || 1}</p>
              </div>
              <div className="text-center p-3 rounded-2xl bg-zinc-950/65 border border-white/5 min-w-[70px]">
                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Badges</p>
                <p className="text-2xl font-black text-yellow-400">🏆 {achievements.length}</p>
              </div>
            </div>
            <Link
              href="/profile/edit"
              className="px-5 py-2.5 rounded-full border border-white/20 text-xs font-bold hover:bg-white/10 transition"
            >
              Edit Profile
            </Link>
          </div>
        </div>
      </div>

      {/* DASHBOARD CENTRAL WRAPPER */}
      <div className="relative z-10 px-4 md:px-10 lg:px-16 mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* TABS SELECTOR PANEL */}
        <div className="lg:col-span-3 glass-card rounded-[2rem] p-4 border border-white/10 space-y-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setSelectedSupportTicket(null);
                if (tab.key === "notifications") {
                  handleMarkNotificationsRead();
                }
              }}
              className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-xs font-bold transition ${
                activeTab === tab.key
                  ? "bg-gradient-to-r from-cyan-500/20 to-blue-600/10 text-cyan-300 border border-cyan-400/20"
                  : "hover:bg-white/5 text-gray-400 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-3">
                <span className="text-base">{tab.icon}</span>
                {tab.label}
              </span>
              {tab.key === "notifications" && unreadNotificationsCount > 0 ? (
                <span className="bg-cyan-500 text-black px-2 py-0.5 rounded-full text-[9px] font-black">
                  {unreadNotificationsCount}
                </span>
              ) : null}
            </button>
          ))}
          <button
            onClick={() => {
              if (window.confirm("Are you sure you want to logout?")) {
                logout();
                router.push("/login");
              }
            }}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-xs font-bold text-red-400 hover:bg-red-500/10 transition"
          >
            <span>🚪</span>
            Log Out
          </button>
        </div>

        {/* DETAILS WORKSPACE PANEL */}
        <div className="lg:col-span-9 glass-card rounded-[2rem] p-6 md:p-8 border border-white/10 min-h-[500px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              {/* OVERVIEW TAB */}
              {activeTab === "overview" && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-black mb-2">Workspace Overview</h2>
                    <p className="text-xs text-gray-400">Review your daily usage statistics, streaks, and platform summaries.</p>
                  </div>

                  {/* WATCH TIME METRICS SUMMARY */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: "Today Watch", value: `${watchHours.daily} hrs`, icon: "⏱️" },
                      { label: "Weekly Watch", value: `${watchHours.weekly} hrs`, icon: "📅" },
                      { label: "Monthly Watch", value: `${watchHours.monthly} hrs`, icon: "📊" },
                      { label: "Lifetime Watch", value: `${watchHours.lifetime} hrs`, icon: "♾️" }
                    ].map((m, i) => (
                      <div key={i} className="p-4 rounded-2xl bg-zinc-950 border border-white/5 text-center">
                        <span className="text-lg">{m.icon}</span>
                        <p className="text-[10px] uppercase font-black tracking-widest text-gray-400 mt-2">{m.label}</p>
                        <p className="text-base font-extrabold text-cyan-300 mt-1">{m.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid md:grid-cols-4 gap-5">
                    {stats.map((st, i) => (
                      <div key={i} className={`p-5 rounded-2xl bg-gradient-to-br ${st.color} border border-white/10`}>
                        <p className="text-[10px] uppercase font-black tracking-widest text-white/70">{st.label}</p>
                        <p className="text-3xl font-black mt-2 text-white">{st.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="p-6 rounded-2xl bg-gradient-to-r from-yellow-500/10 to-amber-500/5 border border-yellow-400/20 space-y-3">
                    <h3 className="font-extrabold text-yellow-300 text-sm flex items-center gap-2">
                      <span>🔥</span> Streak Milestones
                    </h3>
                    <p className="text-xs text-yellow-100/90 leading-relaxed">
                      Maintain your **Login Streak** and watch content regularly to complete milestones. A 7-day streak unlocks the **Loyal Streamer** badge!
                    </p>
                    <div className="flex gap-2">
                      <span className="text-xs px-3 py-1 rounded bg-yellow-400/25 text-yellow-200 border border-yellow-400/25 font-bold">
                        Current Watch Streak: {userStats?.watchStreak || 1} Days
                      </span>
                      <span className="text-xs px-3 py-1 rounded bg-yellow-400/25 text-yellow-200 border border-yellow-400/25 font-bold">
                        Longest Login Streak: {userStats?.longestStreak || 1} Days
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* MY ACTIVITY TAB */}
              {activeTab === "activity" && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-black">My Activity</h2>
                    <p className="text-xs text-gray-400 mt-1">Review continue watching list and raw movie playback logs.</p>
                  </div>

                  {/* CONTINUE WATCHING */}
                  <div className="space-y-3">
                    <h3 className="font-bold text-sm text-cyan-300">📺 Continue Watching</h3>
                    {continueWatching.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">No items currently in continue watching.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {continueWatching.map((item) => (
                          <div key={item.id} className="p-3 bg-zinc-950 border border-white/5 rounded-2xl flex gap-3 items-center">
                            <div className="w-12 h-16 rounded overflow-hidden relative shrink-0">
                              {item.posterImage ? (
                                <img src={item.posterImage} alt={item.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-cyan-950" />
                              )}
                            </div>
                            <div className="flex-1 space-y-1">
                              <p className="text-xs font-bold text-white truncate max-w-[200px]">{item.title}</p>
                              {item.progress !== undefined && item.duration !== undefined && (
                                <div className="space-y-1">
                                  <div className="w-full h-1 bg-white/10 rounded">
                                    <div className="bg-cyan-400 h-1 rounded" style={{ width: `${(item.progress / item.duration) * 100}%` }} />
                                  </div>
                                  <p className="text-[10px] text-gray-400">
                                    {Math.floor(item.progress / 60)}m / {Math.floor(item.duration / 60)}m
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* WATCH PLAYBACK LOGS */}
                  <div className="space-y-3">
                    <h3 className="font-bold text-sm text-cyan-300">⏳ Playback Logs</h3>
                    {watchHistory.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">No watch logs tracked yet.</p>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {watchHistory.slice(0, 30).map((log, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs p-2.5 rounded-lg bg-white/5 border border-white/5">
                            <div>
                              <p className="font-semibold text-white">{log.title || "Movie Playback"}</p>
                              <p className="text-[10px] text-gray-400">
                                Watched: {log.activeTime || 0} seconds segment
                              </p>
                            </div>
                            <span className="text-[10px] text-gray-500">
                              {log.watchedAt ? (log.watchedAt.toDate ? log.watchedAt.toDate().toLocaleString() : new Date(log.watchedAt).toLocaleString()) : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* WISHLIST TAB */}
              {activeTab === "wishlist" && (
                <div>
                  <h2 className="text-2xl md:text-3xl font-black mb-6">My Favorites List</h2>
                  {wishlist.length === 0 ? (
                    <div className="text-center py-16">
                      <p className="text-5xl mb-4">❤️</p>
                      <p className="text-gray-400">No items added to your list yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {wishlist.map((item) => (
                        <div
                          key={item.id}
                          className="group relative rounded-2xl overflow-hidden border border-white/10 bg-zinc-950"
                        >
                          <div className="aspect-[2/3] relative">
                            {item.posterImage ? (
                              <img
                                src={item.posterImage}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-cyan-950 flex items-center justify-center">🎬</div>
                            )}
                          </div>
                          <div className="p-3">
                            <p className="font-semibold text-xs truncate">{item.title}</p>
                            <Link
                              href={`/movie/${item.movieId || item.id}`}
                              className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold block mt-1.5"
                            >
                              Watch details →
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TICKETS TAB */}
              {activeTab === "tickets" && (
                <div>
                  <h2 className="text-2xl md:text-3xl font-black mb-6">Booked Premiere Tickets</h2>
                  {tickets.length === 0 ? (
                    <div className="text-center py-16">
                      <p className="text-5xl mb-4">🎟️</p>
                      <p className="text-gray-400">No premiere tickets booked yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {tickets.map((ticket) => (
                        <div
                          key={ticket.id}
                          className="rounded-2xl border border-white/10 bg-zinc-950/75 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div>
                            <h3 className="font-extrabold text-lg text-white">{ticket.title || "Premiere Room Entry"}</h3>
                            <p className="text-xs text-gray-400 mt-1">Ticket Code: <span className="font-mono text-cyan-300">{ticket.ticketCode}</span></p>
                            <p className="text-xs text-gray-500 mt-1">Booked: {ticket.purchasedAt ? new Date(ticket.purchasedAt.toDate ? ticket.purchasedAt.toDate() : ticket.purchasedAt).toLocaleString() : ""}</p>
                          </div>
                          {ticket.premiereId && (
                            <Link
                              href={`/premiere/${ticket.premiereId}/join`}
                              className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 transition text-xs font-black uppercase rounded-full tracking-wider text-center"
                            >
                              Join Premiere Room
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SUPPORT TICKETS TAB */}
              {activeTab === "support" && (
                <div>
                  <h2 className="text-2xl md:text-3xl font-black mb-2">Support Cases</h2>
                  <p className="text-xs text-gray-400 mb-6">
                    All support cases matching email **{user.email}** are automatically populated in real-time.
                  </p>

                  {selectedSupportTicket ? (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center border-b border-white/10 pb-4">
                        <button
                          onClick={() => setSelectedSupportTicket(null)}
                          className="text-xs text-cyan-400 hover:text-cyan-300 font-bold"
                        >
                          ← Back to Cases
                        </button>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                          (selectedSupportTicket.messageStatus || "New") === "New"
                            ? "border-blue-500/20 bg-blue-500/10 text-blue-400"
                            : (selectedSupportTicket.messageStatus || "New") === "Pending"
                            ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                            : (selectedSupportTicket.messageStatus || "New") === "Replied"
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                            : "border-gray-500/20 bg-gray-500/10 text-gray-400"
                        }`}>
                          {selectedSupportTicket.messageStatus || "New"}
                        </span>
                      </div>

                      <div className="p-4 bg-zinc-950 border border-white/5 rounded-2xl text-xs space-y-2">
                        <p className="font-extrabold text-gray-400">Your Complaint:</p>
                        <p className="text-white whitespace-pre-wrap leading-relaxed">{selectedSupportTicket.message}</p>
                        {selectedSupportTicket.imageUrl && (
                          <div className="pt-2">
                            <a href={selectedSupportTicket.imageUrl} target="_blank" rel="noreferrer" className="text-cyan-400 underline font-bold">
                              Attached Screenshot 📎
                            </a>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <p className="text-[10px] uppercase tracking-wider font-black text-gray-500">Replies & Conversations</p>
                        {selectedSupportTicket.replies && selectedSupportTicket.replies.length > 0 ? (
                          selectedSupportTicket.replies.map((reply, i) => (
                            <div key={i} className="bg-emerald-500/5 border border-emerald-500/15 p-4 rounded-2xl text-xs space-y-1">
                              <div className="flex justify-between items-center text-[9px] text-emerald-400 font-black uppercase">
                                <span>Agent Response ({reply.repliedBy?.split("@")[0] || "Support"})</span>
                                <span>{reply.repliedAt ? new Date(reply.repliedAt).toLocaleString() : ""}</span>
                              </div>
                              <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">{reply.content}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-gray-500 italic">No agent answers received yet. We will notify you here shortly.</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      {supportTickets.length === 0 ? (
                        <div className="text-center py-16">
                          <p className="text-5xl mb-4">💬</p>
                          <p className="text-gray-400">No support tickets found.</p>
                        </div>
                      ) : (
                        <div className="grid md:grid-cols-2 gap-4">
                          {supportTickets.map((ticket) => {
                            const date = ticket.createdAt ? (ticket.createdAt.toDate ? ticket.createdAt.toDate().toLocaleString() : new Date(ticket.createdAt).toLocaleString()) : "";
                            const status = ticket.messageStatus || "New";

                            return (
                              <div
                                key={ticket.id}
                                onClick={() => setSelectedSupportTicket(ticket)}
                                className="group cursor-pointer rounded-2xl border border-white/10 hover:border-cyan-400/35 bg-zinc-950 p-4 transition space-y-3 flex flex-col justify-between"
                              >
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center gap-2">
                                    <h4 className="font-bold text-xs text-cyan-300 truncate">Ticket #{ticket.id.slice(0, 10)}...</h4>
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                                      status === "New"
                                        ? "border-blue-500/20 bg-blue-500/10 text-blue-400"
                                        : status === "Pending"
                                        ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                                        : status === "Replied"
                                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                                        : "border-gray-500/20 bg-gray-500/10 text-gray-400"
                                    }`}>
                                      {status}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{ticket.message}</p>
                                </div>
                                <div className="flex justify-between items-center text-[10px] text-gray-500 border-t border-white/5 pt-2 mt-2">
                                  <span>Filed: {date}</span>
                                  <span className="text-cyan-400 font-bold group-hover:underline">Open Timeline →</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* NOTIFICATIONS TAB */}
              {activeTab === "notifications" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-white/10 pb-4">
                    <div>
                      <h2 className="text-2xl md:text-3xl font-black">Notification Center</h2>
                      <p className="text-xs text-gray-400">Receive real-time achievements, ticket replies, and account updates.</p>
                    </div>
                  </div>

                  {notifications.length === 0 ? (
                    <div className="text-center py-16">
                      <p className="text-5xl mb-4">🔔</p>
                      <p className="text-gray-400 font-medium">Your notification center is clear.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {notifications.map((notif) => {
                        const date = notif.createdAt ? (notif.createdAt.toDate ? notif.createdAt.toDate().toLocaleString() : new Date(notif.createdAt).toLocaleString()) : "";

                        return (
                          <div
                            key={notif.id}
                            className={`p-4 rounded-2xl border transition flex items-start gap-3.5 ${
                              notif.read
                                ? "bg-zinc-950/45 border-white/5 opacity-70"
                                : "bg-cyan-500/5 border-cyan-400/25"
                            }`}
                          >
                            <span className="text-2xl mt-0.5">
                              {notif.type === "achievement" ? "🏆" : "💬"}
                            </span>
                            <div className="flex-1 space-y-1">
                              <div className="flex justify-between items-start gap-2">
                                <h4 className={`text-xs font-extrabold ${notif.read ? "text-gray-300" : "text-cyan-200"}`}>
                                  {notif.title}
                                </h4>
                                {!notif.read && (
                                  <span className="h-2 w-2 rounded-full bg-cyan-400" />
                                )}
                              </div>
                              <p className="text-xs text-gray-300 leading-normal">{notif.message}</p>
                              <p className="text-[10px] text-gray-500">{date}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ACHIEVEMENTS TAB */}
              {activeTab === "achievements" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-black">Achievements & Badges</h2>
                    <p className="text-xs text-gray-400 mt-1">Unlock badges automatically by streaming movies, maintaining streaks, and interacting with support.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ACHIEVEMENT_LIST.map((ach) => {
                      const isUnlocked = achievements.includes(ach.id);

                      return (
                        <div
                          key={ach.id}
                          className={`p-5 rounded-[2rem] border transition flex items-center gap-5 ${
                            isUnlocked
                              ? "bg-gradient-to-br from-yellow-500/10 to-amber-500/5 border-yellow-400/25 shadow-lg shadow-yellow-500/5"
                              : "bg-zinc-950 border-white/5 opacity-55 grayscale"
                          }`}
                        >
                          <div className={`w-14 h-14 rounded-full shrink-0 flex items-center justify-center text-3xl ${
                            isUnlocked ? "bg-yellow-400/25 text-yellow-300 border border-yellow-400/40" : "bg-white/5 border border-white/10"
                          }`}>
                            {ach.icon}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-black text-white">{ach.title}</h4>
                              {isUnlocked ? (
                                <span className="text-[9px] font-black uppercase text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2 py-0.5 rounded-full">
                                  Unlocked ✓
                                </span>
                              ) : (
                                <span className="text-[9px] font-black uppercase text-gray-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                                  Locked 🔒
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-300 leading-normal">{ach.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* PAYMENTS TAB */}
              {activeTab === "payments" && (
                <div>
                  <h2 className="text-2xl md:text-3xl font-black mb-6">Payment History</h2>
                  {paymentHistory.length === 0 ? (
                    <div className="text-center py-16">
                      <p className="text-5xl mb-4">💳</p>
                      <p className="text-gray-400">No payment history found.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {paymentHistory.map((payment) => (
                        <div
                          key={payment.id}
                          className="rounded-2xl border border-green-600/35 bg-green-900/15 p-4"
                        >
                          <div className="flex flex-col md:flex-row md:justify-between gap-3">
                            <div>
                              <p className="font-semibold text-lg">{payment.title || "Premiere Ticket"}</p>
                              <p className="text-sm text-gray-300">
                                Ticket Code: <span className="font-mono text-green-300">{payment.ticketCode || "NA"}</span>
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                Purchased: {payment.purchasedAt?.toDate?.().toLocaleString?.() || "Unknown"}
                              </p>
                            </div>
                            {payment.premiereId ? (
                              <Link
                                href={`/premiere/${payment.premiereId}/join`}
                                className="h-fit bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 px-3 py-2 rounded-lg text-sm font-semibold text-center"
                              >
                                View Event
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SETTINGS TAB */}
              {activeTab === "settings" && (
                <div className="space-y-6">
                  <h2 className="text-2xl md:text-3xl font-black">Playback & Notification Settings</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <SettingToggle
                      label="Premiere Reminders"
                      hint="Email reminders before your booked events"
                      value={settings.premiereReminders}
                      onChange={(value) => setSettings((prev) => ({ ...prev, premiereReminders: value }))}
                    />
                    <SettingToggle
                      label="Email Notifications"
                      hint="Updates for releases and account alerts"
                      value={settings.emailNotifications}
                      onChange={(value) => setSettings((prev) => ({ ...prev, emailNotifications: value }))}
                    />
                    <SettingToggle
                      label="Autoplay Trailers"
                      hint="Autoplay preview trailers in browse pages"
                      value={settings.autoplayTrailers}
                      onChange={(value) => setSettings((prev) => ({ ...prev, autoplayTrailers: value }))}
                    />
                    <SettingToggle
                      label="Data Saver"
                      hint="Reduce streaming resolution to save bandwidth"
                      value={settings.dataSaver}
                      onChange={(value) => setSettings((prev) => ({ ...prev, dataSaver: value }))}
                    />
                  </div>
                  <div className="flex justify-end pt-4 border-t border-white/10">
                    <button
                      onClick={handleSaveSettings}
                      disabled={savingSettings}
                      className="px-6 py-2.5 rounded-full bg-cyan-500 text-black hover:bg-cyan-400 font-bold text-xs uppercase tracking-wider"
                    >
                      {savingSettings ? "Saving Settings..." : "Save Settings"}
                    </button>
                  </div>
                </div>
              )}

              {/* SECURITY TAB */}
              {activeTab === "security" && (
                <div>
                  <h2 className="text-2xl md:text-3xl font-black mb-6">Account Security</h2>
                  {user.providerData?.[0]?.providerId === "google.com" ? (
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/10 text-xs leading-relaxed text-gray-300">
                      🔒 Your account is authenticated via **Google Single Sign-On**. Credential management and password security are managed securely directly through your Google Account configurations.
                    </div>
                  ) : (
                    <form onSubmit={handlePasswordChange} className="space-y-5 max-w-md">
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">New Password</label>
                        <input
                          type="password"
                          value={pwdForm.new}
                          onChange={(e) => setPwdForm(prev => ({ ...prev, new: e.target.value }))}
                          placeholder="Min 6 characters"
                          required
                          className="w-full bg-white/5 border border-white/25 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">Confirm New Password</label>
                        <input
                          type="password"
                          value={pwdForm.confirm}
                          onChange={(e) => setPwdForm(prev => ({ ...prev, confirm: e.target.value }))}
                          placeholder="Retype password"
                          required
                          className="w-full bg-white/5 border border-white/25 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={pwdLoading}
                        className="px-6 py-2.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 transition text-xs font-black uppercase tracking-wider"
                      >
                        {pwdLoading ? "Saving password..." : "Change Password"}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// Visual Helper Components
function SettingToggle({ label, hint, value, onChange }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-950 border border-white/5 gap-4">
      <div>
        <p className="text-xs font-extrabold text-white">{label}</p>
        <p className="text-[10px] text-gray-400 mt-0.5 leading-normal">{hint}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`w-10 h-6 rounded-full transition relative shrink-0 ${
          value ? "bg-cyan-500" : "bg-white/10"
        }`}
      >
        <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
          value ? "left-5 bg-black" : "left-1"
        }`} />
      </button>
    </div>
  );
}
