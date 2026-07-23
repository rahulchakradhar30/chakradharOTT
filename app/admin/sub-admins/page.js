"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { LockIcon } from "@/components/Icon";
import { motion, AnimatePresence } from "framer-motion";

const ALL_MODULES = [
  { id: "movies", label: "Movies & Media", icon: "🎬" },
  { id: "premieres", label: "Live Premieres", icon: "🎪" },
  { id: "posters", label: "Posters & Gallery", icon: "🖼️" },
  { id: "discovery", label: "Discovery & Feature Toggles", icon: "🔍" },
  { id: "genres", label: "Genres Management", icon: "🏷️" },
  { id: "analytics", label: "Search & View Analytics", icon: "📈" },
  { id: "contacts", label: "Contact Inbox", icon: "📬" },
  { id: "users", label: "Subscriber Profiles", icon: "👥" },
  { id: "subAdmins", label: "Sub-Admins Desk", icon: "🔐" },
  { id: "drafts", label: "Drafts Manager", icon: "📝" },
  { id: "notifications", label: "Admin Notifications", icon: "🔔" },
  { id: "settings", label: "Platform Settings", icon: "⚙️" },
  { id: "mail", label: "Internal Admin Mail", icon: "✉️" },
];

const DEFAULT_PERMISSIONS = {
  movies: true,
  contacts: true,
  drafts: true,
  mail: true,
  notifications: true,
  premieres: false,
  posters: false,
  discovery: false,
  genres: false,
  analytics: false,
  users: false,
  subAdmins: false,
  settings: false,
};

export default function SubAdminsManagement() {
  const [admins, setAdmins] = useState([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("sub_admin");
  const [permissions, setPermissions] = useState(DEFAULT_PERMISSIONS);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminRole, setAdminRole] = useState("sub_admin");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Edit Permissions Modal state
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [editPermissions, setEditPermissions] = useState({});

  useEffect(() => {
    const checkRole = async () => {
      try {
        const res = await fetch("/api/admin/session");
        if (res.ok) {
          const data = await res.json();
          setAdminRole(data.role || "sub_admin");
        }
      } catch (err) {
        console.warn(err);
      }
    };
    checkRole();
  }, []);

  // Real-time listener for admins collection
  useEffect(() => {
    if (adminRole !== "super_admin") return;

    const unsubscribe = onSnapshot(
      collection(db, "admins"),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({
          email: d.id,
          ...d.data(),
        }));
        setAdmins(list);
        setLoading(false);
      },
      (err) => {
        console.error("Admins listener error:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [adminRole]);

  const handleTogglePerm = (modId, isEdit = false) => {
    if (isEdit) {
      setEditPermissions((prev) => ({ ...prev, [modId]: !prev[modId] }));
    } else {
      setPermissions((prev) => ({ ...prev, [modId]: !prev[modId] }));
    }
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;

    try {
      setSaving(true);

      const res = await fetch("/api/admin/sub-admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          role,
          name: name.trim(),
          permissions: role === "sub_admin" ? permissions : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Failed to add admin.");
        return;
      }

      setEmail("");
      setName("");
      setPermissions(DEFAULT_PERMISSIONS);

      setSuccessMsg(data.message || `Admin ${cleanEmail} added successfully!`);
      setTimeout(() => setSuccessMsg(""), 6000);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to add admin: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEditModal = (adm) => {
    setEditingAdmin(adm);
    setEditPermissions(adm.permissions || DEFAULT_PERMISSIONS);
  };

  const handleSaveEditPermissions = async () => {
    if (!editingAdmin) return;
    try {
      setSaving(true);
      setSuccessMsg("");
      setErrorMsg("");

      const res = await fetch("/api/admin/sub-admins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: editingAdmin.email,
          permissions: editPermissions,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Failed to update permissions.");
        return;
      }

      setSuccessMsg(data.message || "Permissions updated successfully.");
      setEditingAdmin(null);
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err) {
      setErrorMsg("Failed to save permissions: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAdmin = async (targetEmail) => {
    if (targetEmail.toLowerCase() === "thefifthagefilms@gmail.com") {
      alert("The Root Super Admin (thefifthagefilms@gmail.com) cannot be deleted.");
      return;
    }

    const confirmDelete = confirm(
      `Are you sure you want to remove ${targetEmail} from administrators?\n\nAn access revocation email will be sent and their active session terminated immediately.`
    );
    if (!confirmDelete) return;

    setSuccessMsg("");
    setErrorMsg("");

    try {
      const res = await fetch("/api/admin/sub-admins", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Failed to remove admin.");
        return;
      }

      setSuccessMsg(data.message || "Admin removed successfully.");
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to remove admin.");
    }
  };

  const handleResendInvite = async (targetEmail) => {
    try {
      setSaving(true);
      setSuccessMsg("");
      setErrorMsg("");

      const adminData = admins.find((a) => a.email === targetEmail);

      const res = await fetch("/api/admin/sub-admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: targetEmail,
          role: adminData?.role || "sub_admin",
          name: adminData?.name || "",
          permissions: adminData?.permissions || DEFAULT_PERMISSIONS,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMsg(`Invitation re-sent to ${targetEmail}.`);
      } else {
        setErrorMsg(data.error || "Failed to resend invitation.");
      }
    } catch (err) {
      setErrorMsg("Failed to resend: " + err.message);
    } finally {
      setSaving(false);
      setTimeout(() => setSuccessMsg(""), 5000);
    }
  };

  if (adminRole !== "super_admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
        <LockIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-red-400">Restricted Access</h2>
        <p className="text-sm text-gray-400 mt-2">Only Super-Admins can manage administrator roles and module restrictions.</p>
      </div>
    );
  }

  const activeAdmins = admins.filter((a) => a.status !== "disabled" && a.status !== "removed");

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* HEADER */}
      <div className="admin-section">
        <p className="admin-kicker text-cyan-300">Staff Credentials & Permissions</p>
        <h1 className="admin-title">Administrator Management Desk</h1>
        <p className="admin-lead">Authorize sub-admins with tailored module restrictions. Manage individual permissions for each sub-admin dynamically.</p>
      </div>

      {/* STATUS MESSAGES */}
      {successMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-green-400/30 bg-green-500/10 p-4 text-sm text-green-200 flex items-start gap-3"
        >
          <span className="text-green-400 text-lg">✓</span>
          <span>{successMsg}</span>
        </motion.div>
      )}

      {errorMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200 flex items-start gap-3"
        >
          <span className="text-red-400 text-lg">⚠️</span>
          <span>{errorMsg}</span>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ADD FORM */}
        <div className="lg:col-span-1 admin-surface p-5 md:p-6 rounded-3xl h-fit border border-white/5 space-y-4">
          <h2 className="text-lg font-bold text-white">Add New Administrator</h2>
          <form onSubmit={handleAddAdmin} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 font-bold uppercase mb-1">Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., John Doe"
                className="admin-input focus-ring text-white w-full"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 font-bold uppercase mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="admin-input focus-ring text-white w-full"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 font-bold uppercase mb-1">Access Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="admin-input focus-ring text-white w-full bg-zinc-900 border-white/10"
              >
                <option value="sub_admin">Sub-Admin (Restricted)</option>
                <option value="super_admin">Super-Admin (Full Unrestricted Access)</option>
              </select>
            </div>

            {role === "sub_admin" && (
              <div className="space-y-2 pt-2 border-t border-white/10">
                <label className="block text-xs text-cyan-300 font-bold uppercase">Granular Module Permissions</label>
                <p className="text-[11px] text-gray-400 mb-2">Check the specific features this sub-admin can access:</p>
                <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
                  {ALL_MODULES.map((mod) => (
                    <label
                      key={mod.id}
                      className="flex items-center gap-2 text-xs text-gray-300 bg-white/5 p-2 rounded-xl border border-white/5 hover:border-cyan-500/30 cursor-pointer transition"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(permissions[mod.id])}
                        onChange={() => handleTogglePerm(mod.id)}
                        className="rounded accent-cyan-500 w-4 h-4"
                      />
                      <span>{mod.icon}</span>
                      <span className="font-medium">{mod.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="admin-button admin-button-primary w-full py-2.5 font-bold uppercase text-xs tracking-wider disabled:opacity-60"
            >
              {saving ? "Processing..." : "Grant Access & Send Invite"}
            </button>
            <p className="text-[10px] text-gray-500 leading-relaxed">
              An invitation email with a password setup link will be sent to the sub-admin.
            </p>
          </form>
        </div>

        {/* LIST */}
        <div className="lg:col-span-2 admin-surface p-5 md:p-6 rounded-3xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-white">Authorized Administrators</h2>
            <span className="admin-chip text-xs">{activeAdmins.length} active</span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : activeAdmins.length === 0 ? (
            <p className="text-sm text-gray-500 p-6 text-center border border-dashed border-white/10 rounded-xl">
              No custom sub-admins registered. Root permanent super admin is active.
            </p>
          ) : (
            <div className="divide-y divide-white/5">
              {activeAdmins.map((adm) => {
                const isRoot = adm.email.toLowerCase() === "thefifthagefilms@gmail.com";
                const isSuper = adm.role === "super_admin";
                const permsCount = Object.values(adm.permissions || {}).filter(Boolean).length;

                return (
                  <motion.div
                    key={adm.email}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="py-4 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm text-gray-100 truncate">{adm.name || adm.email}</p>

                          {isRoot ? (
                            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/30 to-yellow-500/30 border border-amber-400/50 text-amber-200 font-black uppercase tracking-wider">
                              👑 Permanent Root Super Admin
                            </span>
                          ) : isSuper ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-bold uppercase">
                              Super Admin
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 font-bold uppercase">
                              Sub-Admin ({permsCount} Modules)
                            </span>
                          )}

                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 border border-green-400/20 text-green-300 font-medium">
                            Active
                          </span>
                        </div>

                        <p className="text-[11px] text-gray-400 mt-1 truncate">{adm.email}</p>
                      </div>

                      {!isRoot && (
                        <div className="flex gap-2 w-full sm:w-auto flex-wrap">
                          {!isSuper && (
                            <button
                              onClick={() => handleOpenEditModal(adm)}
                              className="px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-300 text-xs font-bold rounded-xl transition"
                            >
                              ⚙️ Permissions
                            </button>
                          )}
                          <button
                            onClick={() => handleResendInvite(adm.email)}
                            disabled={saving}
                            className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 text-blue-300 text-xs font-bold rounded-xl transition disabled:opacity-50"
                          >
                            Resend Invite
                          </button>
                          <button
                            onClick={() => handleDeleteAdmin(adm.email)}
                            className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 text-xs font-bold rounded-xl transition"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>

                    {/* PERMISSION TAGS PREVIEW FOR SUB ADMINS */}
                    {!isSuper && adm.permissions && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {ALL_MODULES.map((m) => {
                          const allowed = Boolean(adm.permissions[m.id]);
                          return (
                            <span
                              key={m.id}
                              className={`text-[10px] px-2 py-0.5 rounded-md border font-medium ${
                                allowed
                                  ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-200"
                                  : "bg-white/5 border-white/5 text-gray-600 line-through opacity-50"
                              }`}
                            >
                              {m.icon} {m.label}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* EDIT PERMISSIONS MODAL */}
      <AnimatePresence>
        {editingAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0b1329] border border-white/15 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 overflow-hidden"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Edit Sub-Admin Permissions</h3>
                  <p className="text-xs text-cyan-300 font-mono mt-0.5">{editingAdmin.email}</p>
                </div>
                <button
                  onClick={() => setEditingAdmin(null)}
                  className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-gray-300 mb-3">
                  Toggle which modules and controls this sub-admin can access:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                  {ALL_MODULES.map((mod) => (
                    <label
                      key={mod.id}
                      className="flex items-center gap-2.5 text-xs text-gray-200 bg-white/5 p-2.5 rounded-xl border border-white/5 hover:border-cyan-500/40 cursor-pointer transition"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(editPermissions[mod.id])}
                        onChange={() => handleTogglePerm(mod.id, true)}
                        className="rounded accent-cyan-500 w-4 h-4"
                      />
                      <span className="text-base">{mod.icon}</span>
                      <span className="font-semibold">{mod.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-white/10">
                <button
                  onClick={() => setEditingAdmin(null)}
                  className="flex-1 py-2.5 bg-white/10 hover:bg-white/15 text-gray-300 rounded-xl text-xs font-bold uppercase transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEditPermissions}
                  disabled={saving}
                  className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-bold uppercase transition disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Permissions"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

