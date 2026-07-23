"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import SubAdminAccessGuard from "@/components/admin/SubAdminAccessGuard";
import ImageUploadSelector from "@/components/ImageUploadSelector";

export default function SubAdminAttendancePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [regularizations, setRegularizations] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

  // Leave Modal State
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [editingLeave, setEditingLeave] = useState(null); // null for new, leave object for edit
  const [leaveType, setLeaveType] = useState("Casual Leave");
  const [reason, setReason] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [actingSubAdmin, setActingSubAdmin] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Regularization Modal State
  const [showRegModal, setShowRegModal] = useState(false);
  const [regStartDate, setRegStartDate] = useState("");
  const [regEndDate, setRegEndDate] = useState("");
  const [regReason, setRegReason] = useState("");
  const [regProofImage, setRegProofImage] = useState("");

  // Status Alerts
  const [alertMsg, setAlertMsg] = useState({ text: "", type: "" });

  const showAlert = (text, type = "success") => {
    setAlertMsg({ text, type });
    setTimeout(() => setAlertMsg({ text: "", type: "" }), 5000);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, "0");
      const monthStr = `${year}-${month}`;

      const [attRes, leavesRes, adminsRes, regRes] = await Promise.all([
        fetch(`/api/admin/attendance?month=${monthStr}`),
        fetch("/api/admin/leaves"),
        fetch("/api/admin/sub-admins"),
        fetch("/api/admin/attendance/regularization"),
      ]);

      if (attRes.ok) {
        const d = await attRes.json();
        setAttendanceRecords(d.records || []);
      }

      if (leavesRes.ok) {
        const d = await leavesRes.json();
        setLeaves(d.leaves || []);
      }

      if (adminsRes.ok) {
        const d = await adminsRes.json();
        setAdmins(d.admins || []);
      }

      if (regRes.ok) {
        const d = await regRes.json();
        setRegularizations(d.requests || []);
      }
    } catch (err) {
      console.warn("Failed to load attendance calendar:", err);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ── Auto-log attendance for today on mount ── */
  useEffect(() => {
    fetch("/api/admin/attendance", { method: "POST" }).catch((e) => console.warn(e));
  }, []);

  /* ── 15-Day Date Bound Limits for Regularization ── */
  const { minRegDate, maxRegDate } = useMemo(() => {
    const today = new Date();
    const fifteenAgo = new Date();
    fifteenAgo.setDate(today.getDate() - 15);

    return {
      minRegDate: fifteenAgo.toISOString().split("T")[0],
      maxRegDate: today.toISOString().split("T")[0],
    };
  }, []);

  /* ── 1. Calculate Monthly Calendar Days Grid (including Future/Tomorrow Approved Leaves) ── */
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];

    // Padding empty cells before day 1
    for (let i = 0; i < firstDay; i++) {
      days.push({ empty: true });
    }

    const recordsMap = new Map(attendanceRecords.map((r) => [r.date, r]));

    // Approved leaves lookup
    const approvedLeaves = leaves.filter((l) => l.status === "approved");

    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = String(day).padStart(2, "0");
      const monthStr = String(month + 1).padStart(2, "0");
      const dateKey = `${year}-${monthStr}-${dayStr}`;

      const rec = recordsMap.get(dateKey);
      const isWeekend = new Date(year, month, day).getDay() === 0; // Sunday off-day

      // Check if date falls in approved leave
      const cellDate = new Date(year, month, day);
      const matchingLeave = approvedLeaves.find((l) => {
        const s = new Date(l.startDate.split("T")[0]);
        const e = new Date(l.endDate.split("T")[0]);
        s.setHours(0, 0, 0, 0);
        e.setHours(23, 59, 59, 999);
        return cellDate >= s && cellDate <= e;
      });

      let status = rec?.status;

      if (!status) {
        if (matchingLeave) {
          status = "leave";
        } else if (isWeekend) {
          status = "off_day";
        }
      }

      days.push({
        dayNumber: day,
        dateKey,
        status, // "present" | "leave" | "absent" | "off_day" | null
        notes: rec?.notes || (matchingLeave ? `Approved ${matchingLeave.leaveType}` : ""),
        loginTime: rec?.loginTime,
      });
    }

    return days;
  }, [currentDate, attendanceRecords, leaves]);

  /* ── 2. Statistics Bar ── */
  const stats = useMemo(() => {
    const present = calendarDays.filter((d) => d.status === "present").length;
    const leave = calendarDays.filter((d) => d.status === "leave" || d.status === "absent").length;
    const offDay = calendarDays.filter((d) => d.status === "off_day").length;
    const totalWorking = present + leave;
    const rate = totalWorking > 0 ? Math.round((present / totalWorking) * 100) : 100;

    return { present, leave, offDay, rate };
  }, [calendarDays]);

  /* ── 3. Submit / Modify Leave Application ── */
  const handleSubmitLeave = async (e) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason.trim()) {
      showAlert("Please fill in leave dates and reason.", "error");
      return;
    }

    try {
      setSubmitting(true);
      const isEditing = Boolean(editingLeave);
      const method = isEditing ? "PATCH" : "POST";
      const payload = {
        leaveType,
        reason: reason.trim(),
        startDate,
        endDate,
        actingSubAdminEmail: actingSubAdmin,
      };

      if (isEditing) {
        payload.leaveId = editingLeave.id;
        payload.action = "modify";
      }

      const res = await fetch("/api/admin/leaves", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        showAlert(data.error || "Failed to save leave application.", "error");
        return;
      }

      showAlert(isEditing ? "Leave application updated successfully!" : "Leave application submitted! Pending Super Admin approval.");
      setShowLeaveModal(false);
      setEditingLeave(null);
      setReason("");
      setStartDate("");
      setEndDate("");
      loadData();
    } catch (err) {
      showAlert("Error saving leave: " + err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── 4. Submit Attendance Regularization Request ── */
  const handleSubmitRegularization = async (e) => {
    e.preventDefault();
    if (!regStartDate || !regEndDate || !regReason.trim()) {
      showAlert("Please provide regularization date range and reason.", "error");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/admin/attendance/regularization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: regStartDate,
          endDate: regEndDate,
          reason: regReason.trim(),
          proofImage: regProofImage,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showAlert(data.error || "Failed to submit regularization request.", "error");
        return;
      }

      showAlert("Attendance regularization request submitted successfully! Awaiting Super Admin review.");
      setShowRegModal(false);
      setRegStartDate("");
      setRegEndDate("");
      setRegReason("");
      setRegProofImage("");
      loadData();
    } catch (err) {
      showAlert("Error submitting regularization: " + err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── 5. Clear / Cancel Leave (Pending or Approved) ── */
  const handleClearLeave = async (leaveId) => {
    if (!confirm("Are you sure you want to clear/cancel this leave application? This will remove the leave from your calendar and restore active duty status.")) return;

    try {
      const res = await fetch("/api/admin/leaves", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaveId, action: "clear_leave" }),
      });

      const data = await res.json();
      if (!res.ok) {
        showAlert(data.error || "Failed to clear leave.", "error");
        return;
      }

      showAlert("Leave cleared successfully! Active duty restored.");
      loadData();
    } catch (err) {
      showAlert("Error clearing leave: " + err.message, "error");
    }
  };

  /* ── 6. Cancel Attendance Regularization ── */
  const handleCancelRegularization = async (regId) => {
    if (!confirm("Cancel this attendance regularization request?")) return;

    try {
      const res = await fetch("/api/admin/attendance/regularization", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regId }),
      });

      const data = await res.json();
      if (!res.ok) {
        showAlert(data.error || "Failed to cancel request.", "error");
        return;
      }

      showAlert("Regularization request cancelled.");
      loadData();
    } catch (err) {
      showAlert("Error cancelling request: " + err.message, "error");
    }
  };

  const activeApprovedLeave = useMemo(() => {
    const now = new Date();
    return leaves.find((l) => {
      if (l.status !== "approved") return false;
      const s = new Date(l.startDate);
      const e = new Date(l.endDate);
      return now >= s && now <= e;
    });
  }, [leaves]);

  return (
    <SubAdminAccessGuard moduleKey="dashboard">
      <div className="space-y-8 max-w-6xl mx-auto pb-16">
        {/* HEADER & ACTION BUTTONS */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="admin-kicker text-cyan-300">Personal Duty & Attendance</p>
            <h1 className="admin-title flex items-center gap-2">
              <span>📅</span> Sub-Admin Attendance & Leaves
            </h1>
            <p className="admin-lead">Track monthly presence, apply or clear leaves, and request 15-day attendance regularization.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowRegModal(true)}
              className="admin-button bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-black uppercase text-xs tracking-wider px-5 py-3 rounded-2xl shadow-lg shadow-amber-500/20 flex items-center gap-2"
            >
              <span>📝</span> Regularize Attendance
            </button>

            <button
              onClick={() => {
                setEditingLeave(null);
                setLeaveType("Casual Leave");
                setReason("");
                setStartDate("");
                setEndDate("");
                setActingSubAdmin("");
                setShowLeaveModal(true);
              }}
              className="admin-button bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black uppercase text-xs tracking-wider px-5 py-3 rounded-2xl shadow-lg shadow-cyan-500/25 flex items-center gap-2"
            >
              <span>🌴</span> Apply For Leave
            </button>
          </div>
        </div>

        {/* ACTIVE LEAVE WARNING BANNER WITH CLEAR LEAVE ACTION */}
        {activeApprovedLeave && (
          <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                🔴 Currently On Approved Leave
              </span>
              <h3 className="text-sm font-bold text-white">
                {activeApprovedLeave.leaveType} ({activeApprovedLeave.startDate.split("T")[0]} to {activeApprovedLeave.endDate.split("T")[0]})
              </h3>
              <p className="text-xs text-gray-300">
                Reason: {activeApprovedLeave.reason}
                {activeApprovedLeave.actingSubAdminEmail && ` | Acting Delegate: ${activeApprovedLeave.actingSubAdminEmail}`}
              </p>
            </div>

            <button
              onClick={() => handleClearLeave(activeApprovedLeave.id)}
              className="admin-button bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-black font-black uppercase text-xs tracking-wider px-5 py-2.5 rounded-2xl shadow-md shrink-0"
            >
              🟢 Clear Leave & Resume Duty
            </button>
          </div>
        )}

        {/* ALERT NOTIFICATION */}
        {alertMsg.text && (
          <div
            className={`p-4 rounded-2xl border text-xs font-semibold flex items-center gap-3 ${
              alertMsg.type === "error"
                ? "bg-rose-500/10 border-rose-500/30 text-rose-200"
                : "bg-cyan-500/10 border-cyan-500/30 text-cyan-200"
            }`}
          >
            <span>{alertMsg.type === "error" ? "⚠️" : "✓"}</span>
            <span>{alertMsg.text}</span>
          </div>
        )}

        {/* STATS BAR */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="admin-surface p-4 rounded-2xl border border-white/10 flex items-center gap-3">
            <span className="w-4 h-4 rounded-full bg-green-400 shrink-0 shadow-sm shadow-green-400/50" />
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase">Present Days</p>
              <p className="text-xl font-black text-white">{stats.present}</p>
            </div>
          </div>

          <div className="admin-surface p-4 rounded-2xl border border-white/10 flex items-center gap-3">
            <span className="w-4 h-4 rounded-full bg-rose-500 shrink-0 shadow-sm shadow-rose-500/50" />
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase">Leaves / Absent</p>
              <p className="text-xl font-black text-white">{stats.leave}</p>
            </div>
          </div>

          <div className="admin-surface p-4 rounded-2xl border border-white/10 flex items-center gap-3">
            <span className="w-4 h-4 rounded-full bg-amber-400 shrink-0 shadow-sm shadow-amber-400/50" />
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase">Off-Days / Sunday</p>
              <p className="text-xl font-black text-white">{stats.offDay}</p>
            </div>
          </div>

          <div className="admin-surface p-4 rounded-2xl border border-white/10 flex items-center gap-3">
            <span className="text-xl">📈</span>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase">Attendance Rate</p>
              <p className="text-xl font-black text-cyan-300">{stats.rate}%</p>
            </div>
          </div>
        </div>

        {/* MONTHLY CALENDAR GRID */}
        <div className="admin-surface p-6 rounded-3xl space-y-6 border border-white/10">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>🗓️</span> {currentDate.toLocaleString("default", { month: "long", year: "numeric" })}
            </h2>

            <div className="flex gap-2">
              <button
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-gray-300"
              >
                ← Prev Month
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1.5 bg-cyan-500/20 text-cyan-300 rounded-xl text-xs font-bold border border-cyan-500/30"
              >
                Today
              </button>
              <button
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-gray-300"
              >
                Next Month →
              </button>
            </div>
          </div>

          {/* DAY NAMES HEADER */}
          <div className="grid grid-cols-7 text-center text-xs font-bold uppercase tracking-wider text-gray-400 pb-2">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* CALENDAR CELLS GRID */}
          <div className="grid grid-cols-7 gap-2 sm:gap-3">
            {calendarDays.map((cell, idx) => {
              if (cell.empty) {
                return <div key={`empty-${idx}`} className="h-16 sm:h-24 rounded-2xl bg-black/10 border border-transparent" />;
              }

              let cellStyle = "bg-white/5 border-white/10 text-gray-400";
              let badge = null;

              if (cell.status === "present") {
                cellStyle = "bg-emerald-950/40 border-emerald-500/50 text-emerald-200 shadow-md shadow-emerald-500/10";
                badge = <span className="text-[10px] font-bold text-emerald-400">🟢 Present</span>;
              } else if (cell.status === "leave" || cell.status === "absent") {
                cellStyle = "bg-rose-950/40 border-rose-500/50 text-rose-200 shadow-md shadow-rose-500/10";
                badge = <span className="text-[10px] font-bold text-rose-400">🔴 Leave Granted</span>;
              } else if (cell.status === "off_day") {
                cellStyle = "bg-amber-950/40 border-amber-500/50 text-amber-200 shadow-md shadow-amber-500/10";
                badge = <span className="text-[10px] font-bold text-amber-400">🟡 Off-Day</span>;
              }

              return (
                <div
                  key={cell.dateKey}
                  className={`h-16 sm:h-24 p-2 rounded-2xl border flex flex-col justify-between transition ${cellStyle}`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs sm:text-sm font-black">{cell.dayNumber}</span>
                  </div>

                  <div className="truncate space-y-0.5">
                    {badge}
                    {cell.notes && (
                      <p className="text-[9px] truncate text-gray-400">{cell.notes}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* APPLIED LEAVES DESK (WITH MODIFY & CLEAR LEAVE OPTIONS) */}
        {leaves.length > 0 && (
          <div className="admin-surface p-6 rounded-3xl space-y-4 border border-white/10">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Your Applied Leaves History ({leaves.length})</h2>
            <div className="space-y-3">
              {leaves.map((l) => (
                <div key={l.id} className="p-5 rounded-2xl bg-black/20 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase text-cyan-400">{l.leaveType}</span>
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase ${
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

                    <h3 className="text-sm font-bold text-white">
                      {l.startDate?.split("T")[0]} to {l.endDate?.split("T")[0]}
                    </h3>
                    <p className="text-gray-300">Reason: {l.reason}</p>
                    {l.actingSubAdminEmail && (
                      <p className="text-cyan-300 font-bold">Acting Delegate: {l.actingSubAdminEmail}</p>
                    )}
                    {l.rejectionReason && (
                      <p className="text-rose-300 text-[11px]">Rejection Feedback: {l.rejectionReason}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 shrink-0">
                    {l.status === "pending" && (
                      <button
                        onClick={() => {
                          setEditingLeave(l);
                          setLeaveType(l.leaveType || "Casual Leave");
                          setReason(l.reason || "");
                          setStartDate(l.startDate || "");
                          setEndDate(l.endDate || "");
                          setActingSubAdmin(l.actingSubAdminEmail || "");
                          setShowLeaveModal(true);
                        }}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-gray-200 rounded-xl font-bold text-xs"
                      >
                        ✏️ Modify
                      </button>
                    )}

                    {(l.status === "pending" || l.status === "approved") && (
                      <button
                        onClick={() => handleClearLeave(l.id)}
                        className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 rounded-xl font-bold text-xs"
                      >
                        🗑️ Clear Leave
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REGULARIZATION REQUESTS HISTORY CARD */}
        {regularizations.length > 0 && (
          <div className="admin-surface p-6 rounded-3xl space-y-4 border border-white/10">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Attendance Regularization Requests ({regularizations.length})</h2>
            <div className="space-y-3">
              {regularizations.map((r) => (
                <div key={r.id} className="p-4 rounded-2xl bg-black/20 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{r.startDate} to {r.endDate}</span>
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase ${
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
                    <p className="text-gray-400 mt-0.5">Reason: {r.reason}</p>
                    {r.rejectionReason && <p className="text-rose-300 text-[11px] mt-0.5">Rejection Note: {r.rejectionReason}</p>}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {r.proofImage && (
                      <a href={r.proofImage} target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline text-xs flex items-center gap-1">
                        <span>🖼️ View Proof</span>
                      </a>
                    )}

                    {r.status === "pending" && (
                      <button
                        onClick={() => handleCancelRegularization(r.id)}
                        className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 rounded-xl font-bold text-xs"
                      >
                        🗑️ Cancel Request
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REGULARIZATION REQUEST MODAL */}
        {showRegModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-[#0b1329] border border-white/15 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5">
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>📝</span> Request Attendance Regularization
                </h3>
                <button onClick={() => setShowRegModal(false)} className="text-gray-400 hover:text-white">✕</button>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300">
                ⚠️ Regularization is strictly allowed within the <strong>past 15 days</strong> ({minRegDate} to {maxRegDate}).
              </div>

              <form onSubmit={handleSubmitRegularization} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-cyan-300 uppercase mb-1">Start Date</label>
                    <input
                      type="date"
                      required
                      min={minRegDate}
                      max={maxRegDate}
                      value={regStartDate}
                      onChange={(e) => setRegStartDate(e.target.value)}
                      className="admin-input focus-ring text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-cyan-300 uppercase mb-1">End Date</label>
                    <input
                      type="date"
                      required
                      min={minRegDate}
                      max={maxRegDate}
                      value={regEndDate}
                      onChange={(e) => setRegEndDate(e.target.value)}
                      className="admin-input focus-ring text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-cyan-300 uppercase mb-1">Reason for Missing Attendance</label>
                  <textarea
                    rows={3}
                    required
                    value={regReason}
                    onChange={(e) => setRegReason(e.target.value)}
                    placeholder="Provide specific reason why attendance wasn't logged during these dates..."
                    className="admin-input focus-ring text-white resize-none"
                  />
                </div>

                <ImageUploadSelector
                  label="Attach Proof (Medical Certificate, Travel Ticket, Document)"
                  value={regProofImage}
                  onChange={(val) => setRegProofImage(val)}
                />

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRegModal(false)}
                    className="flex-1 py-2.5 bg-white/10 hover:bg-white/15 text-gray-300 rounded-xl font-bold uppercase"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-black font-black rounded-xl uppercase disabled:opacity-50"
                  >
                    {submitting ? "Submitting..." : "Submit Regularization 🚀"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* APPLY / MODIFY LEAVE MODAL */}
        {showLeaveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-[#0b1329] border border-white/15 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5">
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>🌴</span> {editingLeave ? "Modify Leave Application" : "Submit Leave Application"}
                </h3>
                <button onClick={() => setShowLeaveModal(false)} className="text-gray-400 hover:text-white">✕</button>
              </div>

              <form onSubmit={handleSubmitLeave} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-cyan-300 uppercase mb-1">Leave Type</label>
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value)}
                    className="admin-input focus-ring text-white bg-zinc-900"
                  >
                    <option value="Casual Leave">Casual Leave</option>
                    <option value="Sick Leave">Sick Leave</option>
                    <option value="Emergency Leave">Emergency Leave</option>
                    <option value="Earned Leave">Earned Leave</option>
                    <option value="Unpaid Leave">Unpaid Leave</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-cyan-300 uppercase mb-1">Start Date & Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="admin-input focus-ring text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-cyan-300 uppercase mb-1">End Date & Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="admin-input focus-ring text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-cyan-300 uppercase mb-1">Reason for Leave</label>
                  <textarea
                    rows={3}
                    required
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Provide specific reason for applying leave..."
                    className="admin-input focus-ring text-white resize-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-cyan-300 uppercase mb-1">
                    Select Acting Delegate (Sub-Admin to cover your duties)
                  </label>
                  <select
                    value={actingSubAdmin}
                    onChange={(e) => setActingSubAdmin(e.target.value)}
                    className="admin-input focus-ring text-white bg-zinc-900"
                  >
                    <option value="">-- Select Acting Sub-Admin --</option>
                    {admins.map((adm) => (
                      <option key={adm.email} value={adm.email}>
                        👤 {adm.name ? `${adm.name} (${adm.email})` : adm.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowLeaveModal(false)}
                    className="flex-1 py-2.5 bg-white/10 hover:bg-white/15 text-gray-300 rounded-xl font-bold uppercase"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold uppercase disabled:opacity-50"
                  >
                    {submitting ? "Saving..." : editingLeave ? "Update Leave Application" : "Send Leave Request 🚀"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </SubAdminAccessGuard>
  );
}
