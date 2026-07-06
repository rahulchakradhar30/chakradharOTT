"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebase";
import { collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";

export default function SubAdminsManagement() {
  const [admins, setAdmins] = useState([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("sub_admin");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminRole, setAdminRole] = useState("sub_admin");

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

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, "admins"));
      const list = snap.docs.map((d) => ({
        email: d.id,
        ...d.data(),
      }));
      setAdmins(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminRole === "super_admin") {
      fetchAdmins();
    }
  }, [adminRole]);

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;

    try {
      setSaving(true);
      const docRef = doc(db, "admins", cleanEmail);
      await setDoc(docRef, {
        email: cleanEmail,
        role,
        createdAt: new Date(),
      });
      setEmail("");
      alert(`Admin ${cleanEmail} added successfully!`);
      fetchAdmins();
    } catch (err) {
      console.error(err);
      alert("Failed to add admin: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAdmin = async (targetEmail) => {
    const confirmDelete = confirm(`Are you sure you want to remove ${targetEmail} from administrators?`);
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "admins", targetEmail));
      alert("Admin removed successfully.");
      fetchAdmins();
    } catch (err) {
      console.error(err);
      alert("Failed to remove admin.");
    }
  };

  if (adminRole !== "super_admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-xl font-bold text-red-400">Restricted Access</h2>
        <p className="text-sm text-gray-400 mt-2">Only Super-Admins can manage administrator roles.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      {/* HEADER */}
      <div className="admin-section">
        <p className="admin-kicker text-cyan-300">Staff Credentials</p>
        <h1 className="admin-title">Manage Administrators</h1>
        <p className="admin-lead">Authorize new sub-admins or super-admins by their email address to grant control center access.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* ADD FORM */}
        <div className="md:col-span-1 admin-surface p-6 rounded-3xl h-fit border border-white/5 space-y-4">
          <h2 className="text-lg font-bold text-white">Add New Admin</h2>
          <form onSubmit={handleAddAdmin} className="space-y-4">
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
              className="admin-button admin-button-primary w-full py-2.5 font-bold uppercase text-xs tracking-wider"
            >
              {saving ? "Saving..." : "Grant Access"}
            </button>
          </form>
        </div>

        {/* LIST */}
        <div className="md:col-span-2 admin-surface p-6 rounded-3xl border border-white/5 space-y-4">
          <h2 className="text-lg font-bold text-white">Authorized Administrators</h2>
          {loading ? (
            <p className="text-sm text-gray-400">Loading administrators...</p>
          ) : admins.length === 0 ? (
            <p className="text-sm text-gray-500">No custom sub-admins registered. Default environment super-admins are active.</p>
          ) : (
            <div className="divide-y divide-white/5">
              {admins.map((adm) => (
                <div key={adm.email} className="py-3 flex justify-between items-center gap-4">
                  <div>
                    <p className="font-semibold text-sm text-gray-100">{adm.email}</p>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                      Role: <span className={adm.role === "super_admin" ? "text-cyan-400 font-bold" : "text-amber-400"}>{adm.role}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteAdmin(adm.email)}
                    className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 text-xs font-bold rounded-xl transition"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
