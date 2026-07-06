"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { updateProfile } from "firebase/auth";
import { auth, db } from "@/firebase";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { motion } from "framer-motion";
import ImageUploadSelector from "@/components/ImageUploadSelector";

export default function ProfileEditClient() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [bio, setBio] = useState("");
  const [dob, setDob] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }

    if (user) {
      setName(user.displayName || "");

      const fetchUserData = async () => {
        try {
          const snapshot = await getDoc(doc(db, "users", user.uid));
          if (snapshot.exists()) {
            const data = snapshot.data();
            setFirstName(data.firstName || "");
            setLastName(data.lastName || "");
            setName(data.name || user.displayName || "");
            setMobile(data.mobile || "");
            setBio(data.bio || "");
            setDob(data.dob || "");
            setPhotoURL(data.photoURL || user.photoURL || "");
          }
        } catch (err) {
          console.error("Failed to load profile:", err);
        }
      };

      fetchUserData();
    }
  }, [user, loading, router]);

  const handleSave = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);

      const displayName = firstName
        ? `${firstName} ${lastName}`.trim()
        : name;

      // Update Firebase Auth display name and photo
      const authUpdates = { displayName };
      if (photoURL && photoURL.startsWith("http")) {
        authUpdates.photoURL = photoURL;
      }
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, authUpdates);
      }

      // Save to Firestore
      await setDoc(
        doc(db, "users", user.uid),
        {
          name: displayName,
          firstName,
          lastName,
          mobile,
          bio,
          dob,
          photoURL,
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
        <div className="glass-card rounded-3xl px-6 py-5 shadow-2xl text-center max-w-sm w-full">
          <div className="mx-auto mb-4 h-10 w-10 rounded-full border-4 border-cyan-400/30 border-t-cyan-400 animate-spin" />
          <p className="font-semibold">Loading profile editor...</p>
        </div>
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
          {/* Profile Photo */}
          <ImageUploadSelector
            label="Profile Photo"
            value={photoURL}
            onChange={(val) => setPhotoURL(val)}
            placeholder="Profile photo URL (or upload)"
          />

          {/* First & Last Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-2 text-gray-400">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                className="admin-input focus-ring"
              />
            </div>
            <div>
              <label className="block text-sm mb-2 text-gray-400">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                className="admin-input focus-ring"
              />
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm mb-2 text-gray-400">
              Display Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="admin-input focus-ring"
            />
            <p className="text-xs text-gray-500 mt-1">This is shown publicly on comments and reviews</p>
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-sm mb-2 text-gray-400">
              Date of Birth
            </label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="admin-input focus-ring"
            />
          </div>

          {/* Mobile */}
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

          {/* Bio */}
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
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 disabled:opacity-70 px-5 py-2.5 rounded-xl font-semibold w-full transition shadow-lg shadow-cyan-500/15"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/profile")}
              className="bg-white/10 hover:bg-white/20 px-5 py-2.5 rounded-xl font-semibold w-full transition"
            >
              Cancel
            </button>
          </div>
        </form>

      </motion.div>
    </div>
  );
}