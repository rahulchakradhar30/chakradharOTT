"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { LockIcon } from "@/components/Icon";
import { motion } from "framer-motion";

export default function SubAdminsManagement() {
  const [admins, setAdmins] = useState([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("sub_admin");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminRole, setAdminRole] = useState("sub_admin");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

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
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Failed to add admin.");
        return;
      }

      setEmail("");
      setName("");

      if (data.warning) {
        setErrorMsg(data.message);
      } else {
        setSuccessMsg(data.message || `Admin ${cleanEmail} added successfully!`);
        setTimeout(() => setSuccessMsg(""), 6000);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to add admin: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAdmin = async (targetEmail) => {
    const confirmDelete = confirm(
      `Are you sure you want to remove ${targetEmail} from administrators?\n\nIf they are currently logged in, they will be logged out immediately.`
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

      // Re-create triggers a new password reset email
      const adminData = admins.find((a) => a.email === targetEmail);

      const res = await fetch("/api/admin/sub-admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: targetEmail,
          role: adminData?.role || "sub_admin",
          name: adminData?.name || "",
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
        <p className="text-sm text-gray-400 mt-2">Only Super-Admins can manage administrator roles.</p>
      </div>
    );
  }

  const activeAdmins = admins.filter((a) => a.status !== "disabled" && a.status !== "removed");

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* HEADER */}
      <div className="admin-section">
        <p className="admin-kicker text-cyan-300">Staff Credentials</p>
        <h1 className="admin-title">Manage Administrators</h1>
        <p className="admin-lead">Authorize new sub-admins by their email address. They will receive an email to set their password and access the control center.</p>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ADD FORM */}
        <div className="md:col-span-1 admin-surface p-5 md:p-6 rounded-3xl h-fit border border-white/5 space-y-4">
          <h2 className="text-lg font-bold text-white">Add New Admin</h2>
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
                <option value="super_admin">Super-Admin (Full Access)</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="admin-button admin-button-primary w-full py-2.5 font-bold uppercase text-xs tracking-wider disabled:opacity-60"
            >
              {saving ? "Processing..." : "Grant Access & Send Invite"}
            </button>
            <p className="text-[10px] text-gray-500 leading-relaxed">
              An email with a password setup link will be sent to the new admin.
            </p>
          </form>
        </div>

        {/* LIST */}
        <div className="md:col-span-2 admin-surface p-5 md:p-6 rounded-3xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-white">Authorized Administrators</h2>
            <span className="admin-chip text-xs">{activeAdmins.length} active</span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : activeAdmins.length === 0 ? (
            <p className="text-sm text-gray-500 p-4 text-center border border-dashed border-white/10 rounded-xl">
              No custom sub-admins registered. Default environment super-admins are active.
            </p>
          ) : (
            <div className="divide-y divide-white/5">
              {activeAdmins.map((adm) => (
                <motion.div
                  key={adm.email}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-gray-100 truncate">{adm.name || adm.email}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        adm.role === "super_admin"
                          ? "bg-cyan-500/20 border border-cyan-400/30 text-cyan-300"
                          : "bg-amber-500/20 border border-amber-400/30 text-amber-300"
                      }`}>
                        {(adm.role || "sub_admin").replace("_", " ")}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 border border-green-400/20 text-green-300 font-medium">
                        Active
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1 truncate">{adm.email}</p>
                    {adm.createdAt && (
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        Added {new Date(adm.createdAt?.toDate?.() || adm.createdAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleResendInvite(adm.email)}
                      disabled={saving}
                      className="flex-1 sm:flex-none px-3 py-2 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 text-blue-300 text-xs font-bold rounded-xl transition disabled:opacity-50"
                    >
                      Resend Invite
                    </button>
                    <button
                      onClick={() => handleDeleteAdmin(adm.email)}
                      className="flex-1 sm:flex-none px-3 py-2 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 text-xs font-bold rounded-xl transition"
                    >
                      Remove
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
