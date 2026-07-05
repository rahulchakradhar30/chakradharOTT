"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [saving, setSaving] = useState(false);

  // Fetch users list
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      } else {
        console.error("Failed to load users:", res.status);
      }
    } catch (err) {
      console.error("Error loading users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEditClick = (user) => {
    setEditingUser(user);
    setEditName(user.name || "");
    setEditBio(user.bio || "");
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit-profile",
          targetUid: editingUser.uid,
          data: { name: editName, bio: editBio },
        }),
      });

      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.uid === editingUser.uid ? { ...u, name: editName, bio: editBio } : u
          )
        );
        setEditingUser(null);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update profile");
      }
    } catch (err) {
      console.error("Edit profile error:", err);
      alert("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleRemovePhoto = async (user) => {
    const confirm = window.confirm(`Remove profile photo for ${user.name || user.email}?`);
    if (!confirm) return;

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove-photo",
          targetUid: user.uid,
        }),
      });

      if (res.ok) {
        // Automatically fallback to DiceBear initials locally
        const fallbackAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name || user.email)}`;
        setUsers((prev) =>
          prev.map((u) => (u.uid === user.uid ? { ...u, photoURL: fallbackAvatar } : u))
        );
        alert("Profile photo removed successfully!");
      } else {
        alert("Failed to remove photo");
      }
    } catch (err) {
      console.error("Remove photo error:", err);
    }
  };

  const handleDeleteUser = async (user) => {
    const confirm = window.confirm(
      `CRITICAL ACTION: Are you sure you want to delete the user account for ${user.name || user.email}? This deletes both Firestore profile documents and Firebase Auth records!`
    );
    if (!confirm) return;

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete-user",
          targetUid: user.uid,
        }),
      });

      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.uid !== user.uid));
        alert("User deleted successfully.");
      } else {
        alert("Failed to delete user account.");
      }
    } catch (err) {
      console.error("Delete user error:", err);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.bio?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-16 text-white">
      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end md:justify-between gap-4"
      >
        <div>
          <p className="admin-kicker text-cyan-300 text-sm tracking-widest">✦ User Controls</p>
          <h1 className="text-4xl font-black bg-gradient-to-r from-white via-gray-100 to-cyan-300 bg-clip-text text-transparent">
            Chakradhar Stream Users
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage profile information, bios, avatar references, and access rights of members.
          </p>
        </div>

        {/* SEARCH */}
        <div className="max-w-xs w-full">
          <input
            type="text"
            placeholder="Search name, email, or bio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-input focus-ring text-sm w-full"
          />
        </div>
      </motion.div>

      {/* USER LIST TABLE */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-cyan-400/30 border-t-cyan-400 animate-spin mb-4" />
          <p className="text-sm text-gray-400">Loading subscriber profiles...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="glass-card rounded-[2rem] p-12 text-center border border-white/10">
          <p className="text-gray-400 text-lg">No registered users matching search.</p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card rounded-[2rem] border border-white/10 overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/10 text-xs uppercase tracking-wider font-bold text-gray-400">
                  <th className="py-4 px-6">User</th>
                  <th className="py-4 px-6">Bio</th>
                  <th className="py-4 px-6 text-center">XP Points</th>
                  <th className="py-4 px-6">Joined Date</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {filteredUsers.map((user) => {
                  const avatarUrl = user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name || user.email)}`;
                  return (
                    <tr key={user.uid} className="hover:bg-white/2 transition">
                      {/* USER INFO */}
                      <td className="py-4 px-6 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 bg-white/5 relative shrink-0">
                          <img
                            src={avatarUrl}
                            alt={user.name || "avatar"}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-bold text-gray-100">{user.name || "Critic"}</p>
                          <p className="text-xs text-gray-400 break-all">{user.email}</p>
                        </div>
                      </td>

                      {/* BIO */}
                      <td className="py-4 px-6 max-w-xs">
                        <p className="line-clamp-2 text-gray-300 text-xs">
                          {user.bio || <span className="text-gray-500 italic">No bio written</span>}
                        </p>
                      </td>

                      {/* XP */}
                      <td className="py-4 px-6 text-center font-semibold text-cyan-400">
                        ⭐ {user.totalXP || 0} XP
                      </td>

                      {/* JOIN DATE */}
                      <td className="py-4 px-6 text-xs text-gray-400">
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "Unknown"}
                      </td>

                      {/* ACTIONS */}
                      <td className="py-4 px-6 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => handleEditClick(user)}
                          className="bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                        >
                          Edit Profile
                        </button>
                        {user.photoURL && (
                          <button
                            onClick={() => handleRemovePhoto(user)}
                            className="bg-orange-500/10 hover:bg-orange-500/15 text-orange-400 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                          >
                            Remove Photo
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="bg-red-500/10 hover:bg-red-500/15 text-red-400 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* EDIT MODAL DIALOG */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingUser(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-md glass-card rounded-[2.5rem] border border-white/10 p-6 md:p-8 bg-[#04070f]/95 shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
            >
              <h3 className="text-xl font-bold mb-1">Edit User Profile</h3>
              <p className="text-xs text-gray-400 mb-6">Editing profile details for {editingUser.email}</p>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="admin-input focus-ring text-sm w-full"
                    placeholder="E.g. John Doe"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">
                    Bio Description
                  </label>
                  <textarea
                    rows={4}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    className="admin-input focus-ring text-sm w-full resize-none"
                    placeholder="Short bio details..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setEditingUser(null)}
                    className="bg-white/10 hover:bg-white/15 px-4 py-2 rounded-xl text-xs font-bold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-cyan-500 hover:bg-cyan-400 text-black px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2"
                  >
                    {saving ? "Saving Changes..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
