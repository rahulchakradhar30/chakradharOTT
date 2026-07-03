"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { updateProfile } from "firebase/auth";
import { auth, db } from "@/firebase";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { motion } from "framer-motion";

export default function EditProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [bio, setBio] = useState(""); // ✅ NEW
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }

    if (user) {
      setName(user.displayName || "");

      const fetchUserData = async () => {
        const snapshot = await getDoc(doc(db, "users", user.uid));
        if (snapshot.exists()) {
          const data = snapshot.data();
          setMobile(data.mobile || "");
          setBio(data.bio || ""); // ✅ NEW
        }
      };

      fetchUserData();
    }
  }, [user, loading, router]);

  const handleSave = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);

      // Update Firebase Auth name
      await updateProfile(auth.currentUser, {
        displayName: name,
      });

      // Save to Firestore
      await setDoc(
        doc(db, "users", user.uid),
        {
          name,
          mobile,
          bio,
          email: user.email,
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      );

      router.push("/profile");
    } catch (err) {
      console.error(err);
      alert("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center">
        <div className="admin-empty">Loading profile editor...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white px-4 md:px-10 py-10 md:py-14 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(0,212,255,0.12),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(255,77,141,0.08),_transparent_24%)]" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative z-10 max-w-2xl mx-auto glass-card rounded-[2rem] p-6 md:p-10 shadow-2xl"
      >
        <p className="admin-kicker mb-2">Profile</p>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-8">
          Edit Profile
        </h1>

        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-sm mb-2 text-gray-400">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="admin-input focus-ring"
            />
          </div>

          <div>
            <label className="block text-sm mb-2 text-gray-400">
              Mobile Number (Optional)
            </label>
            <input
              type="text"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              maxLength={15}
              className="admin-input focus-ring"
            />
          </div>

          <div>
            <label className="block text-sm mb-2 text-gray-400">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell something about yourself..."
              rows={4}
              maxLength={280}
              className="admin-textarea focus-ring"
            />
            <p className="text-xs text-gray-400 mt-1">{bio.length}/280</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="admin-button admin-button-primary disabled:opacity-70 w-full"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/profile")}
              className="admin-button admin-button-secondary w-full"
            >
              Cancel
            </button>
          </div>
        </form>

      </motion.div>
    </div>
  );
}