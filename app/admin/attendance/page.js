"use client";

import { useEffect, useState, useMemo } from "react";

export default function SuperAdminAttendanceDesk() {
  const [activeTab, setActiveTab] = useState("matrix"); // "matrix" | "leaves" | "regularizations"
  const [admins, setAdmins] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [regularizations, setRegularizations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Override Modal State
  const [overrideModal, setOverrideModal] = useState(null); // { email, date, currentStatus }
  const [newStatus, setNewStatus] = useState("present");
  const [notes, setNotes] = useState("");
  const [updating, setUpdating] = useState(false);

  // Bulk Delete Attendance State (Past 3 Months)
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkEmail, setBulkEmail] = useState("");
  const [bulkStartDate, setBulkStartDate] = useState("");
  const [bulkEndDate, setBulkEndDate] = useState("");
  const [deletingBulk, setDeletingBulk] = useState(false);

  // Reject Modal State
  const [rejectModal, setRejectModal] = useState(null); // leave or reg object
  const [rejectType, setRejectType] = useState(""); // "leave" | "reg"
  const [rejectionReason, setRejectionReason] = useState("");

  // Status Alerts
  const [alertMsg, setAlertMsg] = useState({ text: "", type: "" });

  const showAlert = (text, type = "success") => {
    setAlertMsg({ text, type });
    setTimeout(() => setAlertMsg({ text: "", type: "" }), 5000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [adminsRes, leavesRes, regRes] = await Promise.all([
        fetch("/api/admin/sub-admins"),
        fetch("/api/admin/leaves"),
        fetch("/api/admin/attendance/regularization"),
      ]);

      if (adminsRes.ok) {
        const d = await adminsRes.json();
        setAdmins(d.admins || []);
      }

      if (leavesRes.ok) {
        const d = await leavesRes.json();
        setLeaves(d.leaves || []);
      }

      if (regRes.ok) {
        const d = await regRes.json();
        setRegularizations(d.requests || []);
      }
    } catch (err) {
      console.warn("Failed to load attendance desk data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /* ── 1. Execute Manual Override ── */
  const handleSaveOverride = async (e) => {
    e.preventDefault();
    if (!overrideModal) return;

    try {
      setUpdating(true);
      const res = await fetch("/api/admin/attendance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: overrideModal.email,
          date: overrideModal.date,
          status: newStatus,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showAlert(data.error || "Failed to update attendance.", "error");
        return;
      }

      showAlert(`Attendance updated to ${newStatus.toUpperCase()} for ${overrideModal.email}`);
      setOverrideModal(null);
      loadData();
    } catch (err) {
      showAlert("Error updating attendance: " + err.message, "error");
    } finally {
      setUpdating(false);
    }
  };

  /* ── 2. Super Admin Approve / Reject Leave ── */
  const handleLeaveDecision = async (leaveId, action, reasonText = "") => {
    try {
      setUpdating(true);
      const res = await fetch("/api/admin/leaves", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveId,
          action,
          rejectionReason: reasonText,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showAlert(data.error || "Failed to process leave decision.", "error");
        return;
      }

      showAlert(`Leave request ${action === "approve" ? "APPROVED" : "REJECTED"}!`);
      setRejectModal(null);
      loadData();
    } catch (err) {
      showAlert("Error: " + err.message, "error");
    } finally {
      setUpdating(false);
    }
  };

  /* ── 3. Super Admin Approve / Reject Regularization ── */
  const handleRegDecision = async (regId, action, reasonText = "") => {
    try {
      setUpdating(true);
      const res = await fetch("/api/admin/attendance/regularization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          regId,
          action,
          rejectionReason: reasonText,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showAlert(data.error || "Failed to process regularization decision.", "error");
        return;
      }

      showAlert(`Regularization request ${action === "approve" ? "APPROVED (Dates marked PRESENT 🟢)" : "REJECTED"}!`);
      setRejectModal(null);
      loadData();
    } catch (err) {
      showAlert("Error: " + err.message, "error");
    } finally {
      setUpdating(false);
    }
  };

  /* ── 4. Bulk Delete Attendance Records (Past 3 Months) ── */
  const handleBulkDeleteAttendance = async (e) => {
    e.preventDefault();
    if (!bulkEmail || !bulkStartDate || !bulkEndDate) {
      showAlert("Target Email, Start Date, and End Date are required.", "error");
      return;
    }

    if (!confirm(`Are you sure you want to BULK DELETE attendance records for ${bulkEmail} from ${bulkStartDate} to ${bulkEndDate}? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingBulk(true);
      const res = await fetch("/api/admin/attendance", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: bulkEmail,
          startDate: bulkStartDate,
          endDate: bulkEndDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showAlert(data.error || "Failed to delete attendance records.", "error");
        return;
      }

      showAlert(`Bulk Purge Complete! Removed ${data.deletedCount || 0} attendance records.`);
      setShowBulkDeleteModal(false);
      setBulkStartDate("");
      setBulkEndDate("");
      loadData();
    } catch (err) {
      showAlert("Error in bulk deletion: " + err.message, "error");
    } finally {
      setDeletingBulk(false);
    }
  };

  const pendingLeavesCount = useMemo(() => leaves.filter((l) => l.status === "pending").length, [leaves]);
  const pendingRegsCount = useMemo(() => regularizations.filter((r) => r.status === "pending").length, [regularizations]);

  const todayStr = new Date().toISOString().split("T")[0];

  // 90-day past limit for bulk cleanup
  const ninetyDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d.toISOString().split("T")[0];
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="admin-kicker text-cyan-300">Staff Operations & Duty Control</p>
          <h1 className="admin-title flex items-center gap-2">
            <span>📅</span> Attendance & Leave Control Center
          </h1>
          <p className="admin-lead">Track daily login attendance, approve 15-day regularization requests, handle leave applications, and manage 3-month attendance purges.</p>
        </div>

        <button
          onClick={() => setShowBulkDeleteModal(true)}
          className="admin-button bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2"
        >
          <span>🗑️</span> Bulk Remove Attendance (Past 3 Months)
        </button>
      </div>

      {/* ALERT NOTIFICATION */}
      {alertMsg.text && (
        <div
          className={`p-4 rounded-2xl border text-sm flex items-center gap-3 ${
            alertMsg.type === "error"
              ? "bg-rose-500/10 border-rose-500/30 text-rose-200"
              : "bg-cyan-500/10 border-cyan-500/30 text-cyan-200"
          }`}
        >
          <span>{alertMsg.type === "error" ? "⚠️" : "✓"}</span>
          <span>{alertMsg.text}</span>
        </div>
      )}

      {/* TAB NAVIGATION */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        <button
          onClick={() => setActiveTab("matrix")}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "matrix"
              ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20"
              : "bg-white/5 text-gray-300 hover:bg-white/10"
          }`}
        >
          <span>📊</span> Staff Attendance Matrix
        </button>

        <button
          onClick={() => setActiveTab("regularizations")}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "regularizations"
              ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20"
              : "bg-white/5 text-gray-300 hover:bg-white/10"
          }`}
        >
          <span>📝</span> Attendance Regularization Desk
          {pendingRegsCount > 0 && (
            <span className="bg-amber-400 text-black px-2 py-0.5 rounded-full text-[10px] font-black">
              {pendingRegsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("leaves")}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "leaves"
              ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20"
              : "bg-white/5 text-gray-300 hover:bg-white/10"
          }`}
        >
          <span>🌴</span> Leave Requests Desk
          {pendingLeavesCount > 0 && (
            <span className="bg-amber-400 text-black px-2 py-0.5 rounded-full text-[10px] font-black">
              {pendingLeavesCount}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: ATTENDANCE MATRIX */}
      {activeTab === "matrix" && (
        <div className="space-y-6">
          <div className="admin-surface p-6 rounded-3xl space-y-4 border border-white/10">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Sub-Admins Today&apos;s Status ({todayStr})</h2>

            {loading ? (
              <div className="p-8 text-center text-xs text-gray-400">Loading attendance data...</div>
            ) : admins.length === 0 ? (
              <div className="admin-empty text-xs text-gray-400">No registered sub-admins.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {admins.map((adm) => {
                  const isOnLeave = adm.onLeave === true;
                  const delegate = adm.activeDelegate;

                  return (
                    <div
                      key={adm.email}
                      className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-cyan-400 uppercase">{adm.role}</span>
                          {isOnLeave ? (
                            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold">
                              🔴 On Approved Leave
                            </span>
                          ) : (
                            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-green-500/20 border border-green-500/40 text-green-300 font-bold">
                              🟢 Active Duty
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm font-bold text-white truncate">{adm.name || adm.email.split("@")[0]}</h3>
                        <p className="text-xs text-gray-400 truncate">{adm.email}</p>

                        {delegate && (
                          <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300">
                            👤 Acting Delegate: <strong>{delegate}</strong>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() =>
                          setOverrideModal({
                            email: adm.email,
                            date: todayStr,
                            currentStatus: isOnLeave ? "leave" : "present",
                          })
                        }
                        className="admin-button bg-white/10 hover:bg-white/15 text-xs font-semibold py-2 px-3 rounded-xl w-full text-center"
                      >
                        ✏️ Override Attendance Status
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: REGULARIZATION DESK */}
      {activeTab === "regularizations" && (
        <div className="space-y-6">
          <div className="admin-surface p-6 rounded-3xl space-y-4 border border-white/10">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Attendance Regularization Applications ({regularizations.length})</h2>

            {loading ? (
              <div className="p-8 text-center text-xs text-gray-400">Loading regularization requests...</div>
            ) : regularizations.length === 0 ? (
              <div className="admin-empty text-xs text-gray-400">No attendance regularization requests submitted.</div>
            ) : (
              <div className="space-y-4">
                {regularizations.map((r) => (
                  <div key={r.id} className="p-5 rounded-2xl bg-black/30 border border-white/10 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-amber-400">15-Day Regularization Request</span>
                        <h3 className="text-sm font-bold text-white">{r.applicantEmail}</h3>
                      </div>

                      <span
                        className={`text-[10px] px-3 py-1 rounded-full font-black uppercase ${
                          r.status === "approved"
                            ? "bg-green-500/20 text-green-300 border border-green-500/30"
                            : r.status === "rejected"
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>

                    <div className="text-xs text-gray-300 space-y-1">
                      <p><strong>Requested Dates:</strong> {r.startDate} to {r.endDate}</p>
                      <p><strong>Stated Reason:</strong> {r.reason}</p>
                      {r.proofImage && (
                        <p className="pt-1">
                          <a href={r.proofImage} target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline font-bold flex items-center gap-1">
                            <span>🖼️ Click to Inspect Attached Proof Document</span>
                          </a>
                        </p>
                      )}
                    </div>

                    {r.status === "pending" && (
                      <div className="flex gap-3 pt-2 border-t border-white/10">
                        <button
                          onClick={() => handleRegDecision(r.id, "approve")}
                          disabled={updating}
                          className="flex-1 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-black font-black text-xs uppercase rounded-xl shadow-md shadow-green-500/20"
                        >
                          ✓ Satisfied & Mark Present (Green)
                        </button>
                        <button
                          onClick={() => {
                            setRejectModal(r);
                            setRejectType("reg");
                          }}
                          disabled={updating}
                          className="flex-1 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 font-bold text-xs uppercase rounded-xl"
                        >
                          ✕ Reject Regularization
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: LEAVE REQUESTS DESK */}
      {activeTab === "leaves" && (
        <div className="space-y-6">
          <div className="admin-surface p-6 rounded-3xl space-y-4 border border-white/10">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Leave Applications ({leaves.length})</h2>

            {loading ? (
              <div className="p-8 text-center text-xs text-gray-400">Loading leave requests...</div>
            ) : leaves.length === 0 ? (
              <div className="admin-empty text-xs text-gray-400">No leave applications submitted.</div>
            ) : (
              <div className="space-y-4">
                {leaves.map((l) => (
                  <div key={l.id} className="p-5 rounded-2xl bg-black/30 border border-white/10 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-cyan-400">{l.leaveType}</span>
                        <h3 className="text-sm font-bold text-white">{l.applicantEmail}</h3>
                      </div>

                      <span
                        className={`text-[10px] px-3 py-1 rounded-full font-black uppercase ${
                          l.status === "approved"
                            ? "bg-green-500/20 text-green-300 border border-green-500/30"
                            : l.status === "rejected"
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            : l.status === "cancelled_resumed"
                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        {l.status}
                      </span>
                    </div>

                    <div className="text-xs text-gray-300 space-y-1">
                      <p><strong>Duration:</strong> {l.startDate?.split("T")[0]} to {l.endDate?.split("T")[0]}</p>
                      <p><strong>Reason:</strong> {l.reason}</p>
                      {l.actingSubAdminEmail && (
                        <p className="text-cyan-300 font-bold"><strong>Nominated Acting Delegate:</strong> {l.actingSubAdminEmail}</p>
                      )}
                    </div>

                    {l.status === "pending" && (
                      <div className="flex gap-3 pt-2 border-t border-white/10">
                        <button
                          onClick={() => handleLeaveDecision(l.id, "approve")}
                          disabled={updating}
                          className="flex-1 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-black font-black text-xs uppercase rounded-xl shadow-md shadow-green-500/20"
                        >
                          ✓ Accept Leave
                        </button>
                        <button
                          onClick={() => {
                            setRejectModal(l);
                            setRejectType("leave");
                          }}
                          disabled={updating}
                          className="flex-1 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 font-bold text-xs uppercase rounded-xl"
                        >
                          ✕ Reject Leave
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* OVERRIDE ATTENDANCE MODAL */}
      {overrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0b1329] border border-white/15 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">Override Attendance Status</h3>
              <button onClick={() => setOverrideModal(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveOverride} className="space-y-4 text-xs">
              <div>
                <label className="block text-cyan-300 font-bold uppercase mb-1">Target Sub-Admin</label>
                <input type="text" disabled value={overrideModal.email} className="admin-input" />
              </div>

              <div>
                <label className="block text-cyan-300 font-bold uppercase mb-1">Date</label>
                <input type="date" value={overrideModal.date} onChange={(e) => setOverrideModal((p) => ({ ...p, date: e.target.value }))} className="admin-input" />
              </div>

              <div>
                <label className="block text-cyan-300 font-bold uppercase mb-1">Attendance Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="admin-input bg-zinc-900"
                >
                  <option value="present">🟢 PRESENT (Green)</option>
                  <option value="absent">🔴 ABSENT / LEAVE (Red)</option>
                  <option value="off_day">🟡 OFF-DAY / HOLIDAY (Yellow)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOverrideModal(null)} className="flex-1 py-2.5 bg-white/10 text-gray-300 rounded-xl font-bold">Cancel</button>
                <button type="submit" disabled={updating} className="flex-1 py-2.5 bg-cyan-500 text-black font-black uppercase rounded-xl">{updating ? "Saving..." : "Save Override"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK DELETE ATTENDANCE MODAL (PAST 3 MONTHS) */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0b1329] border border-white/15 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>🗑️</span> Bulk Remove Attendance (Past 3 Months)
              </h3>
              <button onClick={() => setShowBulkDeleteModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300">
              ⚠️ Select a Sub-Admin and a date range within the past 90 days to purge/reset past attendance records.
            </div>

            <form onSubmit={handleBulkDeleteAttendance} className="space-y-4 text-xs">
              <div>
                <label className="block text-cyan-300 font-bold uppercase mb-1">Target Sub-Admin</label>
                <select
                  required
                  value={bulkEmail}
                  onChange={(e) => setBulkEmail(e.target.value)}
                  className="admin-input bg-zinc-900"
                >
                  <option value="">-- Select Sub-Admin --</option>
                  {admins.map((a) => (
                    <option key={a.email} value={a.email}>
                      👤 {a.name ? `${a.name} (${a.email})` : a.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-cyan-300 font-bold uppercase mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    min={ninetyDaysAgo}
                    max={todayStr}
                    value={bulkStartDate}
                    onChange={(e) => setBulkStartDate(e.target.value)}
                    className="admin-input"
                  />
                </div>

                <div>
                  <label className="block text-cyan-300 font-bold uppercase mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    min={ninetyDaysAgo}
                    max={todayStr}
                    value={bulkEndDate}
                    onChange={(e) => setBulkEndDate(e.target.value)}
                    className="admin-input"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowBulkDeleteModal(false)} className="flex-1 py-2.5 bg-white/10 text-gray-300 rounded-xl font-bold">Cancel</button>
                <button
                  type="submit"
                  disabled={deletingBulk}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black uppercase rounded-xl disabled:opacity-50"
                >
                  {deletingBulk ? "Purging..." : "Confirm Bulk Purge"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0b1329] border border-white/15 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Decline Application</h3>
            <textarea
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="State reason for declining..."
              className="admin-input focus-ring text-xs text-white w-full resize-none"
            />
            <div className="flex gap-3">
              <button onClick={() => setRejectModal(null)} className="flex-1 py-2 bg-white/10 text-gray-300 rounded-xl text-xs font-bold">Cancel</button>
              <button
                onClick={() => {
                  if (rejectType === "reg") {
                    handleRegDecision(rejectModal.id, "reject", rejectionReason);
                  } else {
                    handleLeaveDecision(rejectModal.id, "reject", rejectionReason);
                  }
                }}
                disabled={updating}
                className="flex-1 py-2 bg-rose-500 text-white rounded-xl text-xs font-bold uppercase"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
