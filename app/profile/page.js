"use client";

import { useMemo, useState, useEffect } from "react";
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
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const TABS = [
  "overview",
  "activity",
  "wishlist",
  "tickets",
  "payments",
  "settings",
  "security",
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
    bio: "",
    mobile: "",
  });

  const [settings, setSettings] = useState(defaultSettings);
  const [savingSettings, setSavingSettings] = useState(false);

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
            bio: userData.bio || "",
            mobile: userData.mobile || "",
          });
          setSettings({
            ...defaultSettings,
            ...(userData.settings || {}),
          });
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
      { label: "Wishlist", value: wishlist.length },
      { label: "Comments", value: comments.length },
      { label: "Ratings", value: ratings.length },
      { label: "Tickets", value: tickets.length },
    ],
    [wishlist.length, comments.length, ratings.length, tickets.length]
  );

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

  const getInitials = (email = "U") => email.slice(0, 2).toUpperCase();

  if (user === undefined || loadingPage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="admin-empty">Loading profile...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen text-white px-4 md:px-8 lg:px-12 py-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(0,212,255,0.12),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(255,77,141,0.08),_transparent_24%)]" />
      <div className="max-w-7xl mx-auto grid lg:grid-cols-[280px,1fr] gap-6">
        <aside className="relative z-10 glass-card rounded-[2rem] p-5 md:p-6 h-fit lg:sticky lg:top-24">
          <div className="flex items-center gap-3 mb-6">
            {user.photoURL ? (
              <Image
                src={user.photoURL}
                alt="avatar"
                width={52}
                height={52}
                className="rounded-full object-cover border border-cyan-300/40"
              />
            ) : (
              <div className="w-13 h-13 rounded-full bg-gradient-to-br from-cyan-400 to-blue-700 flex items-center justify-center font-bold">
                {getInitials(user.email)}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold line-clamp-1">{profile.name || "Profile"}</p>
              <p className="text-xs text-gray-400 break-all">{user.email}</p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`w-full text-left px-4 py-2.5 rounded-2xl capitalize transition ${
                  activeTab === tab
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                    : "hover:bg-white/10"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <button
            onClick={logout}
            className="mt-6 w-full admin-button admin-button-secondary"
          >
            Logout
          </button>
        </aside>

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
              {activeTab === "overview" && (
                <div className="space-y-8">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-cyan-300 mb-2">Profile</p>
                    <h2 className="text-3xl md:text-4xl font-black tracking-tight">Account Overview</h2>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {stats.map((item) => (
                      <div key={item.label} className="rounded-2xl border border-white/15 bg-black/20 p-4">
                        <p className="text-xs uppercase tracking-wide text-gray-400">{item.label}</p>
                        <p className="text-2xl font-black mt-2">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-white/15 bg-black/20 p-5 space-y-3">
                    <p><span className="text-gray-400">Email:</span> {user.email}</p>
                    <p><span className="text-gray-400">Name:</span> {profile.name || "Not set"}</p>
                    <p><span className="text-gray-400">Bio:</span> {profile.bio || "No bio added"}</p>
                    <p><span className="text-gray-400">Mobile:</span> {profile.mobile || "Not set"}</p>
                    <Link
                      href="/profile/edit"
                      className="inline-block mt-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 px-4 py-2 rounded-lg text-sm font-semibold"
                    >
                      Edit Profile
                    </Link>
                  </div>
                </div>
              )}

              {activeTab === "activity" && (
                <div className="space-y-7">
                  <h2 className="text-2xl md:text-3xl font-black">Activity Feed</h2>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="rounded-2xl border border-white/15 bg-black/20 p-4">
                      <p className="text-sm text-gray-300">Watch Events</p>
                      <p className="text-2xl font-bold mt-2">{watchHistory.length}</p>
                    </div>
                    <div className="rounded-2xl border border-white/15 bg-black/20 p-4">
                      <p className="text-sm text-gray-300">Comments Posted</p>
                      <p className="text-2xl font-bold mt-2">{comments.length}</p>
                    </div>
                    <div className="rounded-2xl border border-white/15 bg-black/20 p-4">
                      <p className="text-sm text-gray-300">Ratings Shared</p>
                      <p className="text-2xl font-bold mt-2">{ratings.length}</p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-white/15 bg-black/20 p-4">
                      <h3 className="font-semibold mb-3">Recent Watch IDs</h3>
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
                      <h3 className="font-semibold mb-3">Recent Comments</h3>
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

              {activeTab === "wishlist" && (
                <div>
                  <h2 className="text-2xl md:text-3xl font-black mb-6">My List</h2>
                  {wishlist.length === 0 ? (
                    <p className="text-gray-400">Your wishlist is empty.</p>
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

              {activeTab === "tickets" && (
                <div>
                  <h2 className="text-2xl md:text-3xl font-black mb-6">Ticket History</h2>
                  {tickets.length === 0 ? (
                    <p className="text-gray-400">No tickets yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {tickets.map((t) => (
                        <div
                          key={t.id}
                          className="rounded-2xl border border-white/15 bg-black/20 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                        >
                          <div>
                            <p className="font-semibold text-lg line-clamp-1">{t.title || "Premiere"}</p>
                            <p className="text-sm text-gray-400">Code: {t.ticketCode || "NA"}</p>
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

              {activeTab === "payments" && (
                <div>
                  <h2 className="text-2xl md:text-3xl font-black mb-6">Payment History</h2>

                  {paymentHistory.length === 0 ? (
                    <p className="text-gray-400">No payment history found.</p>
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

              {activeTab === "security" && (
                <div className="space-y-5">
                  <h2 className="text-2xl md:text-3xl font-black">Security</h2>
                  <div className="rounded-2xl border border-red-500/35 bg-red-900/15 p-5">
                    <p className="text-sm text-gray-200 mb-4">
                      Delete your account permanently. This action cannot be undone.
                    </p>
                    <button
                      onClick={handleDeleteAccount}
                      className="bg-red-700 hover:bg-red-600 px-5 py-2 rounded-lg font-semibold"
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
        className={`relative h-7 w-12 rounded-full transition ${value ? "bg-cyan-500" : "bg-white/20"}`}
        aria-pressed={value}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${value ? "left-6" : "left-1"}`}
        />
      </button>
    </div>
  );
}
