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
  Timestamp,
} from "firebase/firestore";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { updateProfile } from "firebase/auth";
import { auth } from "@/firebase";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const TABS = [
  { key: "overview", label: "Overview", icon: "👤" },
  { key: "activity", label: "Activity", icon: "📊" },
  { key: "wishlist", label: "My List", icon: "❤️" },
  { key: "tickets", label: "Tickets", icon: "🎟️" },
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

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("overview");
  const [loadingPage, setLoadingPage] = useState(true);

  const [wishlist, setWishlist] = useState([]);
  const [comments, setComments] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [watchHistory, setWatchHistory] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);

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

  useEffect(() => {
    if (user === null) {
      router.push("/login");
    }
  }, [user, router]);

  useEffect(() => {
    if (!user?.uid) return;

    const loadProfileData = async () => {
      try {
        setLoadingPage(true);

        const userDocRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
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
        } else {
          setProfile((prev) => ({
            ...prev,
            name: user.displayName || "",
            photoURL: user.photoURL || "",
          }));
        }

        const [wishlistSnap, commentSnap, ratingSnap, watchSnap, ticketsSnap] = await Promise.all([
          getDocs(collection(db, "users", user.uid, "wishlist")),
          getDocs(query(collection(db, "comments"), where("userId", "==", user.uid))),
          getDocs(query(collection(db, "ratings"), where("userId", "==", user.uid))),
          getDocs(query(collection(db, "views"), where("userId", "==", user.uid))),
          getDocs(collection(db, "users", user.uid, "tickets")),
        ]);

        const allWishlist = wishlistSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const allComments = commentSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const allRatings = ratingSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const allWatch = watchSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const allTickets = ticketsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        setWishlist(allWishlist);
        setComments(allComments);
        setRatings(allRatings);
        setWatchHistory(allWatch);

        setTickets(
          allTickets.sort((a, b) => {
            const aDate = a.createdAt?.toDate?.()?.getTime?.() || 0;
            const bDate = b.createdAt?.toDate?.()?.getTime?.() || 0;
            return bDate - aDate;
          })
        );

        const paid = allTickets.filter((t) => t.purchasedAt);
        setPaymentHistory(
          paid.sort((a, b) => {
            const aDate = a.purchasedAt?.toDate?.()?.getTime?.() || 0;
            const bDate = b.purchasedAt?.toDate?.()?.getTime?.() || 0;
            return bDate - aDate;
          })
        );
      } catch (error) {
        console.error("Profile load error:", error);
      } finally {
        setLoadingPage(false);
      }
    };

    loadProfileData();
  }, [user]);

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
    if (user.uid?.startsWith("google_local")) return { label: "Guest", color: "bg-amber-600" };
    if (user.uid?.startsWith("local_")) return { label: "Email", color: "bg-blue-600" };
    const provider = user.providerData?.[0]?.providerId;
    if (provider === "google.com") return { label: "Google", color: "bg-red-600" };
    return { label: "Email", color: "bg-blue-600" };
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;

    setUploadingPhoto(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result;
      try {
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        let finalUrl = base64Data;

        if (cloudName) {
          const res = await fetch("/api/cloudinary/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ file: base64Data }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.secure_url) finalUrl = data.secure_url;
          }
        }

        // Save to Firebase Auth
        if (auth.currentUser) {
          await updateProfile(auth.currentUser, { photoURL: finalUrl });
        }

        // Save to Firestore
        await setDoc(doc(db, "users", user.uid), { photoURL: finalUrl }, { merge: true });

        setProfile((prev) => ({ ...prev, photoURL: finalUrl }));
      } catch (err) {
        console.error("Photo upload failed:", err);
        alert("Failed to upload photo. Please try again.");
      } finally {
        setUploadingPhoto(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = async () => {
    if (!user?.uid) return;

    try {
      setSavingSettings(true);
      await setDoc(
        doc(db, "users", user.uid),
        {
          settings,
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Settings save failed:", error);
      alert("Failed to save settings. Please try again.");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    const consent = window.confirm("This action permanently deletes your account. Continue?");
    if (!consent) return;

    try {
      if (user.providerData[0]?.providerId === "password") {
        const password = window.prompt("Enter your password to confirm account deletion:");
        if (!password) return;

        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);
      } else {
        const provider = new GoogleAuthProvider();
        await reauthenticateWithPopup(user, provider);
      }

      await deleteDoc(doc(db, "users", user.uid));
      await user.delete();
      router.push("/");
    } catch (error) {
      console.error("Delete account failed:", error);
      alert("Reauthentication failed. Account was not deleted.");
    }
  };

  const getInitials = (str = "U") => {
    const parts = str.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return str.slice(0, 2).toUpperCase();
  };

  const displayName = profile.firstName
    ? `${profile.firstName} ${profile.lastName}`.trim()
    : profile.name || user?.displayName || "User";

  const avatarUrl = profile.photoURL && profile.photoURL.startsWith("http") ? profile.photoURL : null;

  if (user === undefined || loadingPage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card rounded-3xl px-6 py-5 shadow-2xl text-center max-w-sm w-full">
          <div className="mx-auto mb-4 h-10 w-10 rounded-full border-4 border-cyan-400/30 border-t-cyan-400 animate-spin" />
          <p className="font-semibold text-white">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const accountType = getAccountType();

  return (
    <div className="min-h-screen text-white px-4 md:px-8 lg:px-12 py-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(0,212,255,0.12),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(255,77,141,0.08),_transparent_24%)]" />
      <div className="max-w-7xl mx-auto grid lg:grid-cols-[300px,1fr] gap-6">

        {/* SIDEBAR */}
        <aside className="relative z-10 glass-card rounded-[2rem] p-5 md:p-6 h-fit lg:sticky lg:top-24">
          {/* Avatar + Upload */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative group mb-4">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="avatar"
                  width={96}
                  height={96}
                  className="rounded-full object-cover w-24 h-24 border-[3px] border-cyan-400/50 shadow-lg shadow-cyan-500/20"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-400 to-blue-700 flex items-center justify-center font-black text-2xl border-[3px] border-cyan-400/50 shadow-lg shadow-cyan-500/20">
                  {getInitials(displayName)}
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute bottom-0 right-0 w-8 h-8 bg-cyan-500 hover:bg-cyan-400 rounded-full flex items-center justify-center text-xs font-bold transition shadow-lg border-2 border-[#0a1020] group-hover:scale-110"
              >
                {uploadingPhoto ? "…" : "📷"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>

            <h3 className="font-bold text-lg text-center line-clamp-1">{displayName}</h3>
            <p className="text-xs text-gray-400 mt-1 break-all text-center">{user.email}</p>

            {/* Account Badge */}
            <span className={`mt-2 text-[10px] uppercase tracking-[0.2em] font-bold px-3 py-1 rounded-full ${accountType.color} text-white`}>
              {accountType.label} Account
            </span>
          </div>

          {/* Nav Tabs */}
          <div className="space-y-1.5 text-sm">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`w-full text-left px-4 py-2.5 rounded-2xl capitalize transition flex items-center gap-3 ${
                  activeTab === tab.key
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/15"
                    : "hover:bg-white/10 text-gray-300"
                }`}
              >
                <span className="text-base">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={logout}
            className="mt-6 w-full bg-white/10 hover:bg-red-600/80 px-4 py-2.5 rounded-2xl transition text-sm font-semibold"
          >
            Logout
          </button>
        </aside>

        {/* MAIN CONTENT */}
        <main>
          <AnimatePresence mode="wait">
            <motion.section
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
              className="relative z-10 glass-card rounded-[2rem] p-5 md:p-8"
            >
              {/* OVERVIEW TAB */}
              {activeTab === "overview" && (
                <div className="space-y-8">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-cyan-300 mb-2">Profile</p>
                    <h2 className="text-3xl md:text-4xl font-black tracking-tight">Account Overview</h2>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {stats.map((item) => (
                      <div key={item.label} className="rounded-2xl border border-white/15 bg-black/20 p-4 group hover:border-cyan-300/30 transition">
                        <p className="text-xs uppercase tracking-wide text-gray-400">{item.label}</p>
                        <p className={`text-3xl font-black mt-2 bg-gradient-to-r ${item.color} bg-clip-text text-transparent`}>{item.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Profile Details Card */}
                  <div className="rounded-2xl border border-white/15 bg-black/20 p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* Avatar Section */}
                      <div className="flex-shrink-0 flex flex-col items-center">
                        {avatarUrl ? (
                          <Image
                            src={avatarUrl}
                            alt="avatar"
                            width={120}
                            height={120}
                            className="rounded-2xl object-cover w-[120px] h-[120px] border border-white/15"
                          />
                        ) : (
                          <div className="w-[120px] h-[120px] rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-700 flex items-center justify-center font-black text-3xl">
                            {getInitials(displayName)}
                          </div>
                        )}
                      </div>

                      {/* Details Grid */}
                      <div className="flex-1 grid sm:grid-cols-2 gap-4 text-sm">
                        <InfoRow label="Full Name" value={displayName} />
                        {profile.firstName && <InfoRow label="First Name" value={profile.firstName} />}
                        {profile.lastName && <InfoRow label="Last Name" value={profile.lastName} />}
                        <InfoRow label="Email" value={user.email} />
                        <InfoRow label="Date of Birth" value={profile.dob ? new Date(profile.dob).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "Not set"} />
                        <InfoRow label="Bio" value={profile.bio || "No bio added"} />
                        <InfoRow label="Mobile" value={profile.mobile || "Not set"} />
                        <InfoRow label="Account Type" value={accountType.label} />
                      </div>
                    </div>

                    <Link
                      href="/profile/edit"
                      className="inline-flex items-center gap-2 mt-6 bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 px-5 py-2.5 rounded-xl text-sm font-semibold transition shadow-lg shadow-cyan-500/15"
                    >
                      ✏️ Edit Profile
                    </Link>
                  </div>
                </div>
              )}

              {/* ACTIVITY TAB */}
              {activeTab === "activity" && (
                <div className="space-y-7">
                  <h2 className="text-2xl md:text-3xl font-black">Activity Feed</h2>

                  <div className="grid md:grid-cols-3 gap-4">
                    <StatCard label="Watch Events" value={watchHistory.length} icon="📺" />
                    <StatCard label="Comments Posted" value={comments.length} icon="💬" />
                    <StatCard label="Ratings Shared" value={ratings.length} icon="⭐" />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-white/15 bg-black/20 p-4">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">📺 Recent Watch IDs</h3>
                      {watchHistory.length === 0 ? (
                        <p className="text-sm text-gray-400">No watch history found.</p>
                      ) : (
                        <ul className="space-y-2 text-sm text-gray-300 max-h-64 overflow-y-auto pr-1">
                          {watchHistory.slice(0, 12).map((item) => (
                            <li key={item.id} className="border-b border-white/10 pb-2">{item.movieId || "Unknown movie"}</li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="rounded-2xl border border-white/15 bg-black/20 p-4">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">💬 Recent Comments</h3>
                      {comments.length === 0 ? (
                        <p className="text-sm text-gray-400">No comments yet.</p>
                      ) : (
                        <ul className="space-y-2 text-sm text-gray-300 max-h-64 overflow-y-auto pr-1">
                          {comments.slice(0, 10).map((item) => (
                            <li key={item.id} className="border-b border-white/10 pb-2 line-clamp-2">{item.comment || "No text"}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* WISHLIST TAB */}
              {activeTab === "wishlist" && (
                <div>
                  <h2 className="text-2xl md:text-3xl font-black mb-6">My List</h2>
                  {wishlist.length === 0 ? (
                    <div className="text-center py-16">
                      <p className="text-5xl mb-4">❤️</p>
                      <p className="text-gray-400">Your wishlist is empty. Start adding movies you love!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
                      {wishlist.map((movie) => (
                        <Link key={movie.id} href={`/movie/${movie.movieId}`} className="group">
                          <div className="relative aspect-[2/3] rounded-2xl overflow-hidden border border-white/15 group-hover:border-cyan-300/45 transition">
                            <Image
                              src={movie.posterImage || "https://images.unsplash.com/photo-1524985069026-dd778a71c7b4"}
                              alt={movie.title || "Wishlist movie"}
                              fill
                              loading="lazy"
                              className="object-cover group-hover:scale-105 transition duration-500"
                            />
                          </div>
                          <p className="mt-2 text-sm line-clamp-1 text-gray-200">{movie.title || "Untitled"}</p>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TICKETS TAB */}
              {activeTab === "tickets" && (
                <div>
                  <h2 className="text-2xl md:text-3xl font-black mb-6">Ticket History</h2>
                  {tickets.length === 0 ? (
                    <div className="text-center py-16">
                      <p className="text-5xl mb-4">🎟️</p>
                      <p className="text-gray-400">No tickets yet. Book a premiere to get started!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {tickets.map((t) => (
                        <div
                          key={t.id}
                          className="rounded-2xl border border-white/15 bg-black/20 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                        >
                          <div>
                            <p className="font-semibold text-lg line-clamp-1">{t.title || "Premiere"}</p>
                            <p className="text-sm text-gray-400">Code: <span className="font-mono text-cyan-300">{t.ticketCode || "NA"}</span></p>
                            <p className="text-xs text-gray-500 mt-1">
                              Purchased: {t.purchasedAt?.toDate?.().toLocaleString?.() || "Not available"}
                            </p>
                          </div>
                          {t.premiereId ? (
                            <Link
                              href={`/premiere/${t.premiereId}/join`}
                              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 px-4 py-2 rounded-lg text-sm font-semibold"
                            >
                              Join Premiere
                            </Link>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
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
                                className="h-fit bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 px-3 py-2 rounded-lg text-sm font-semibold"
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
                      hint="Prefer lower bandwidth playback when possible"
                      value={settings.dataSaver}
                      onChange={(value) => setSettings((prev) => ({ ...prev, dataSaver: value }))}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <label className="rounded-xl border border-white/15 bg-black/20 p-4 text-sm">
                      <p className="mb-2 text-gray-300">Default Subtitle Language</p>
                      <select
                        value={settings.subtitlesDefault}
                        onChange={(e) =>
                          setSettings((prev) => ({ ...prev, subtitlesDefault: e.target.value }))
                        }
                        className="w-full bg-black/40 border border-white/20 rounded-lg px-3 py-2"
                      >
                        <option>English</option>
                        <option>Hindi</option>
                        <option>Telugu</option>
                        <option>Tamil</option>
                        <option>None</option>
                      </select>
                    </label>

                    <label className="rounded-xl border border-white/15 bg-black/20 p-4 text-sm">
                      <p className="mb-2 text-gray-300">Preferred Playback Quality</p>
                      <select
                        value={settings.playbackQuality}
                        onChange={(e) =>
                          setSettings((prev) => ({ ...prev, playbackQuality: e.target.value }))
                        }
                        className="w-full bg-black/40 border border-white/20 rounded-lg px-3 py-2"
                      >
                        <option>Auto</option>
                        <option>1080p</option>
                        <option>720p</option>
                        <option>480p</option>
                      </select>
                    </label>
                  </div>

                  <button
                    onClick={handleSaveSettings}
                    disabled={savingSettings}
                    className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 disabled:opacity-70 px-5 py-2.5 rounded-lg font-semibold"
                  >
                    {savingSettings ? "Saving settings..." : "Save Settings"}
                  </button>
                </div>
              )}

              {/* SECURITY TAB */}
              {activeTab === "security" && (
                <div className="space-y-5">
                  <h2 className="text-2xl md:text-3xl font-black">Security</h2>
                  <div className="rounded-2xl border border-red-500/35 bg-red-900/15 p-5">
                    <h3 className="font-bold text-red-300 mb-2">⚠️ Danger Zone</h3>
                    <p className="text-sm text-gray-200 mb-4">
                      Delete your account permanently. This action cannot be undone. All your data, watchlist, tickets, and comments will be erased.
                    </p>
                    <button
                      onClick={handleDeleteAccount}
                      className="bg-red-700 hover:bg-red-600 px-5 py-2 rounded-lg font-semibold transition"
                    >
                      Delete Account
                    </button>
                  </div>
                </div>
              )}
            </motion.section>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

/* Sub-components */
function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-gray-100 font-medium">{value}</p>
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-black/20 p-4">
      <p className="text-sm text-gray-300 flex items-center gap-2">{icon} {label}</p>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}

function SettingToggle({ label, hint, value, onChange }) {
  return (
    <div className="rounded-xl border border-white/15 bg-black/20 p-4 flex items-start justify-between gap-4">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-xs text-gray-400 mt-1">{hint}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative h-7 w-12 rounded-full transition flex-shrink-0 ${value ? "bg-cyan-500" : "bg-white/20"}`}
        aria-pressed={value}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${value ? "left-6" : "left-1"}`}
        />
      </button>
    </div>
  );
}
