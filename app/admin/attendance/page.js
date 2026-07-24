"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  CalendarIcon,
  PalmtreeIcon,
  PencilIcon,
  TrashIcon,
  AnalyticsIcon,
  DotStatusGreen,
  DotStatusRed,
  DotStatusYellow,
  CheckCircleIcon,
  AlertCircleIcon,
  UserIcon,
  PlusIcon,
} from "@/components/Icon";

export default function SuperAdminAttendanceDesk() {
  const [activeTab, setActiveTab] = useState("matrix"); // "matrix" | "regularizations" | "leaves"
  const [admins, setAdmins] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [regularizations, setRegularizations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Inspector Drawer / Modal State for Selected Sub-Admin
  const [selectedSubAdmin, setSelectedSubAdmin] = useState(null); // Sub-admin object
  const [subAdminAttendance, setSubAdminAttendance] = useState([]);
  const [inspectorCurrentDate, setInspectorCurrentDate] = useState(new Date());
  const [inspectorLoading, setInspectorLoading] = useState(false);

  // Selected Day Cell Editor Modal State
  const [selectedDayCell, setSelectedDayCell] = useState(null); // { dateKey, status, loginTime, notes, record }
  const [editStatus, setEditStatus] = useState("present");
  const [editNotes, setEditNotes] = useState("");
  const [editLoginTime, setEditLoginTime] = useState("");
  const [updatingDay, setUpdatingDay] = useState(false);

  // Post New Attendance Modal State
  const [showPostModal, setShowPostModal] = useState(false);
  const [postEmail, setPostEmail] = useState("");
  const [postDate, setPostDate] = useState(new Date().toISOString().split("T")[0]);
  const [postStatus, setPostStatus] = useState("present");
  const [postNotes, setPostNotes] = useState("");
  const [postLoginTime, setPostLoginTime] = useState("");
  const [posting, setPosting] = useState(false);

  // Bulk Delete Attendance State (Past 3 Months)
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkEmail, setBulkEmail] = useState("");
  const [bulkStartDate, setBulkStartDate] = useState("");
  const [bulkEndDate, setBulkEndDate] = useState("");
  const [deletingBulk, setDeletingBulk] = useState(false);

  // Reject Modal State
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectType, setRejectType] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  // Status Alerts
  const [alertMsg, setAlertMsg] = useState({ text: "", type: "" });

  const showAlert = (text, type = "success") => {
    setAlertMsg({ text, type });
    setTimeout(() => setAlertMsg({ text: "", type: "" }), 5000);
  };

  const loadData = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ── Load Attendance Records for Selected Sub-Admin ── */
  const loadSubAdminAttendance = useCallback(async (email, dateObj = inspectorCurrentDate) => {
    try {
      setInspectorLoading(true);
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      const monthStr = `${year}-${month}`;

      const res = await fetch(`/api/admin/attendance?email=${encodeURIComponent(email)}&month=${monthStr}`);
      if (res.ok) {
        const d = await res.json();
        setSubAdminAttendance(d.records || []);
      }
    } catch (err) {
      console.warn("Failed to load sub-admin attendance:", err);
    } finally {
      setInspectorLoading(false);
    }
  }, [inspectorCurrentDate]);

  useEffect(() => {
    if (selectedSubAdmin) {
      loadSubAdminAttendance(selectedSubAdmin.email, inspectorCurrentDate);
    }
  }, [selectedSubAdmin, inspectorCurrentDate, loadSubAdminAttendance]);

  /* ── Calculate Calendar Grid for Inspector ── */
  const inspectorCalendarDays = useMemo(() => {
    if (!selectedSubAdmin) return [];

    const year = inspectorCurrentDate.getFullYear();
    const month = inspectorCurrentDate.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];

    // Padding
    for (let i = 0; i < firstDay; i++) {
      days.push({ empty: true });
    }

    const recordsMap = new Map(subAdminAttendance.map((r) => [r.date, r]));
    const approvedLeaves = leaves.filter(
      (l) => l.status === "approved" && l.applicantEmail?.toLowerCase() === selectedSubAdmin.email.toLowerCase()
    );

    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = String(day).padStart(2, "0");
      const monthStr = String(month + 1).padStart(2, "0");
      const dateKey = `${year}-${monthStr}-${dayStr}`;

      const rec = recordsMap.get(dateKey);
      const isWeekend = new Date(year, month, day).getDay() === 0;

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
        status,
        notes: rec?.notes || (matchingLeave ? `Approved ${matchingLeave.leaveType}` : ""),
        loginTime: rec?.loginTime,
        checkInTime: rec?.checkInTime,
        checkOutTime: rec?.checkOutTime,
        shiftDuration: rec?.shiftDuration,
        verificationType: rec?.verificationType,
        record: rec || null,
      });
    }

    return days;
  }, [selectedSubAdmin, inspectorCurrentDate, subAdminAttendance, leaves]);

  /* ── Save Day Cell Edit ── */
  const handleSaveDayEdit = async (e) => {
    e.preventDefault();
    if (!selectedSubAdmin || !selectedDayCell) return;

    try {
      setUpdatingDay(true);
      const res = await fetch("/api/admin/attendance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: selectedSubAdmin.email,
          date: selectedDayCell.dateKey,
          status: editStatus,
          notes: editNotes.trim(),
          loginTime: editLoginTime || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showAlert(data.error || "Failed to update attendance.", "error");
        return;
      }

      showAlert(`Attendance updated to ${editStatus.toUpperCase()} for ${selectedSubAdmin.email} on ${selectedDayCell.dateKey}`);
      setSelectedDayCell(null);
      loadSubAdminAttendance(selectedSubAdmin.email);
    } catch (err) {
      showAlert("Error updating attendance: " + err.message, "error");
    } finally {
      setUpdatingDay(false);
    }
  };

  /* ── Delete Day Attendance Record ── */
  const handleDeleteDayRecord = async (dateKey) => {
    if (!selectedSubAdmin) return;
    if (!confirm(`Delete attendance record for ${selectedSubAdmin.email} on ${dateKey}?`)) return;

    try {
      setUpdatingDay(true);
      const res = await fetch("/api/admin/attendance", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: selectedSubAdmin.email,
          date: dateKey,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showAlert(data.error || "Failed to delete record.", "error");
        return;
      }

      showAlert(`Attendance record deleted for ${dateKey}.`);
      setSelectedDayCell(null);
      loadSubAdminAttendance(selectedSubAdmin.email);
    } catch (err) {
      showAlert("Error deleting record: " + err.message, "error");
    } finally {
      setUpdatingDay(false);
    }
  };

  /* ── Post New Attendance Record ── */
  const handlePostAttendance = async (e) => {
    e.preventDefault();
    if (!postEmail || !postDate) {
      showAlert("Sub-Admin email and date are required.", "error");
      return;
    }

    try {
      setPosting(true);
      const res = await fetch("/api/admin/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetEmail: postEmail,
          date: postDate,
          status: postStatus,
          notes: postNotes.trim(),
          loginTime: postLoginTime || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showAlert(data.error || "Failed to post attendance.", "error");
        return;
      }

      showAlert(`Attendance posted for ${postEmail} on ${postDate}`);
      setShowPostModal(false);
      setPostNotes("");
      setPostLoginTime("");
      if (selectedSubAdmin && selectedSubAdmin.email.toLowerCase() === postEmail.toLowerCase()) {
        loadSubAdminAttendance(postEmail);
      }
    } catch (err) {
      showAlert("Error posting attendance: " + err.message, "error");
    } finally {
      setPosting(false);
    }
  };

  /* ── Super Admin Approve / Reject Leave ── */
  const handleLeaveDecision = async (leaveId, action, reasonText = "") => {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  };

  /* ── Super Admin Approve / Reject Regularization ── */
  const handleRegDecision = async (regId, action, reasonText = "") => {
    try {
      setLoading(true);
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

      showAlert(`Regularization request ${action === "approve" ? "APPROVED (Dates marked PRESENT)" : "REJECTED"}!`);
      setRejectModal(null);
      loadData();
    } catch (err) {
      showAlert("Error: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  /* ── Bulk Delete Attendance (Past 3 Months) ── */
  const handleBulkDeleteAttendance = async (e) => {
    e.preventDefault();
    if (!bulkEmail || !bulkStartDate || !bulkEndDate) {
      showAlert("Target Email, Start Date, and End Date are required.", "error");
      return;
    }

    if (!confirm(`BULK DELETE attendance records for ${bulkEmail} from ${bulkStartDate} to ${bulkEndDate}?`)) return;

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
        showAlert(data.error || "Failed to delete records.", "error");
        return;
      }

      showAlert(`Bulk Purge Complete! Removed ${data.deletedCount || 0} records.`);
      setShowBulkDeleteModal(false);
      setBulkStartDate("");
      setBulkEndDate("");
      loadData();
    } catch (err) {
      showAlert("Error: " + err.message, "error");
    } finally {
      setDeletingBulk(false);
    }
  };

  const pendingLeavesCount = useMemo(() => leaves.filter((l) => l.status === "pending").length, [leaves]);
  const pendingRegsCount = useMemo(() => regularizations.filter((r) => r.status === "pending").length, [regularizations]);
  const todayStr = new Date().toISOString().split("T")[0];

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
            <CalendarIcon className="w-8 h-8 text-cyan-400" />
            <span>Attendance & Leave Control Center</span>
          </h1>
          <p className="admin-lead">Full authority to post, edit, inspect, and remove sub-admin attendance records and process leave requests.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              if (admins.length > 0) setPostEmail(admins[0].email);
              setShowPostModal(true);
            }}
            className="admin-button bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs uppercase px-4 py-2.5 rounded-xl shadow-lg shadow-cyan-500/20 flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Post Attendance Record</span>
          </button>

          <button
            onClick={() => setShowBulkDeleteModal(true)}
            className="admin-button bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2"
          >
            <TrashIcon className="w-4 h-4 text-rose-400" />
            <span>Bulk Remove (3 Months)</span>
          </button>
        </div>
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
          {alertMsg.type === "error" ? <AlertCircleIcon className="w-4 h-4 text-rose-400" /> : <CheckCircleIcon className="w-4 h-4 text-cyan-400" />}
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
          <AnalyticsIcon className="w-4 h-4" />
          <span>Staff Attendance Roster ({admins.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("regularizations")}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "regularizations"
              ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20"
              : "bg-white/5 text-gray-300 hover:bg-white/10"
          }`}
        >
          <PencilIcon className="w-4 h-4" />
          <span>Attendance Regularization Desk</span>
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
          <PalmtreeIcon className="w-4 h-4" />
          <span>Leave Requests Desk</span>
          {pendingLeavesCount > 0 && (
            <span className="bg-amber-400 text-black px-2 py-0.5 rounded-full text-[10px] font-black">
              {pendingLeavesCount}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: STAFF ATTENDANCE ROSTER */}
      {activeTab === "matrix" && (
        <div className="space-y-6">
          <div className="admin-surface p-6 rounded-3xl space-y-4 border border-white/10">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Sub-Admins Roster ({todayStr})</h2>
              <p className="text-xs text-gray-400">Click any Sub-Admin to inspect, edit, or post attendance records.</p>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div key={n} className="p-4 rounded-2xl bg-white/5 border border-white/10 animate-pulse h-36" />
                ))}
              </div>
            ) : admins.length === 0 ? (
              <div className="admin-empty text-xs text-gray-400">No sub-admins registered.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {admins.map((adm) => {
                  const isOnLeave = adm.onLeave === true;
                  const delegate = adm.activeDelegate;

                  return (
                    <div
                      key={adm.email}
                      className="p-5 rounded-2xl bg-black/30 hover:bg-cyan-950/20 border border-white/10 hover:border-cyan-500/40 transition space-y-3 flex flex-col justify-between group"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                            <UserIcon className="w-3 h-3" /> {adm.role}
                          </span>

                          {isOnLeave ? (
                            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold flex items-center gap-1.5">
                              <DotStatusRed /> On Approved Leave
                            </span>
                          ) : (
                            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-green-500/20 border border-green-500/40 text-green-300 font-bold flex items-center gap-1.5">
                              <DotStatusGreen /> Active Duty
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-white truncate">{adm.name || adm.email.split("@")[0]}</h3>
                        <p className="text-xs text-gray-400 truncate font-mono">{adm.email}</p>

                        {delegate && (
                          <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300">
                            Acting Delegate: <strong>{delegate}</strong>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => setSelectedSubAdmin(adm)}
                        className="admin-button bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-bold py-2.5 px-3 rounded-xl w-full text-center flex items-center justify-center gap-2 group-hover:bg-cyan-500 group-hover:text-black transition"
                      >
                        <span>🔍 Inspect & Edit Attendance Calendar</span>
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
                            <span>Click to Inspect Attached Proof Document</span>
                          </a>
                        </p>
                      )}
                    </div>

                    {r.status === "pending" && (
                      <div className="flex gap-3 pt-2 border-t border-white/10">
                        <button
                          onClick={() => handleRegDecision(r.id, "approve")}
                          className="flex-1 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-black font-black text-xs uppercase rounded-xl shadow-md shadow-green-500/20 flex items-center justify-center gap-1.5"
                        >
                          <CheckCircleIcon className="w-4 h-4" /> Satisfied & Mark Present
                        </button>
                        <button
                          onClick={() => {
                            setRejectModal(r);
                            setRejectType("reg");
                          }}
                          className="flex-1 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 font-bold text-xs uppercase rounded-xl flex items-center justify-center gap-1.5"
                        >
                          <AlertCircleIcon className="w-4 h-4 text-rose-400" /> Reject Regularization
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
                          className="flex-1 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-black font-black text-xs uppercase rounded-xl shadow-md shadow-green-500/20 flex items-center justify-center gap-1.5"
                        >
                          <CheckCircleIcon className="w-4 h-4" /> Accept Leave
                        </button>
                        <button
                          onClick={() => {
                            setRejectModal(l);
                            setRejectType("leave");
                          }}
                          className="flex-1 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 font-bold text-xs uppercase rounded-xl flex items-center justify-center gap-1.5"
                        >
                          <AlertCircleIcon className="w-4 h-4 text-rose-400" /> Reject Leave
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

      {/* SUB-ADMIN ATTENDANCE INSPECTOR MODAL / DRAWER */}
      {selectedSubAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#0b1329] border border-white/15 rounded-3xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-6">
            {/* INSPECTOR HEADER */}
            <div className="flex justify-between items-start border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-bold text-cyan-400 uppercase">Super Admin Calendar Inspector</span>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-cyan-400" />
                  <span>{selectedSubAdmin.name} ({selectedSubAdmin.email})</span>
                </h2>
              </div>
              <button
                onClick={() => setSelectedSubAdmin(null)}
                className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            {/* MONTH NAV & LEGEND */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-cyan-400" />
                <span>{inspectorCurrentDate.toLocaleString("default", { month: "long", year: "numeric" })}</span>
              </h3>

              <div className="flex gap-2">
                <button
                  onClick={() => setInspectorCurrentDate(new Date(inspectorCurrentDate.getFullYear(), inspectorCurrentDate.getMonth() - 1, 1))}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-gray-300"
                >
                  ← Prev Month
                </button>
                <button
                  onClick={() => setInspectorCurrentDate(new Date())}
                  className="px-3 py-1.5 bg-cyan-500/20 text-cyan-300 rounded-xl text-xs font-bold border border-cyan-500/30"
                >
                  Today
                </button>
                <button
                  onClick={() => setInspectorCurrentDate(new Date(inspectorCurrentDate.getFullYear(), inspectorCurrentDate.getMonth() + 1, 1))}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-gray-300"
                >
                  Next Month →
                </button>
              </div>
            </div>

            {/* DAY HEADER */}
            <div className="grid grid-cols-7 text-center text-xs font-bold uppercase tracking-wider text-gray-400">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            {/* INSPECTOR CALENDAR GRID */}
            {inspectorLoading ? (
              <div className="h-64 flex items-center justify-center text-xs text-gray-400">Loading attendance data...</div>
            ) : (
              <div className="grid grid-cols-7 gap-2">
                {inspectorCalendarDays.map((cell, idx) => {
                  if (cell.empty) {
                    return <div key={`emp-${idx}`} className="h-16 sm:h-20 rounded-xl bg-black/10" />;
                  }

                  let cellStyle = "bg-white/5 border-white/10 text-gray-400 hover:border-cyan-500/40";
                  let badge = null;

                  if (cell.status === "present") {
                    cellStyle = "bg-emerald-950/50 border-emerald-500/50 text-emerald-200 hover:border-emerald-400";
                    badge = <DotStatusGreen />;
                  } else if (cell.status === "leave" || cell.status === "absent") {
                    cellStyle = "bg-rose-950/50 border-rose-500/50 text-rose-200 hover:border-rose-400";
                    badge = <DotStatusRed />;
                  } else if (cell.status === "off_day") {
                    cellStyle = "bg-amber-950/50 border-amber-500/50 text-amber-200 hover:border-amber-400";
                    badge = <DotStatusYellow />;
                  }

                  return (
                    <button
                      key={cell.dateKey}
                      onClick={() => {
                        setSelectedDayCell(cell);
                        setEditStatus(cell.status || "present");
                        setEditNotes(cell.notes || "");
                        setEditLoginTime(cell.loginTime ? cell.loginTime.split(".")[0] : "");
                      }}
                      className={`h-16 sm:h-20 p-2 rounded-xl border flex flex-col justify-between text-left transition cursor-pointer ${cellStyle}`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold">{cell.dayNumber}</span>
                        {badge}
                      </div>

                      <div className="truncate text-[9px] space-y-0.5">
                        {cell.checkInTime && (
                          <p className="text-emerald-300 font-medium truncate">
                            In: {new Date(cell.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                        {cell.checkOutTime && (
                          <p className="text-indigo-300 font-medium truncate">
                            Out: {new Date(cell.checkOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                        {cell.verificationType === "face_scan" && (
                          <span className="text-[8px] text-cyan-300 font-bold block truncate">
                            🟢 Face Verified
                          </span>
                        )}
                        {!cell.checkInTime && !cell.checkOutTime && (
                          <span className="text-gray-400 truncate block">
                            {cell.status ? cell.status.toUpperCase() : "Unmarked"}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SELECTED DAY CELL EDITOR MODAL */}
      {selectedDayCell && selectedSubAdmin && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#0b1329] border border-white/15 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div>
                <p className="text-[10px] text-cyan-400 font-bold uppercase">Attendance Record Editor</p>
                <h3 className="text-base font-bold text-white">{selectedDayCell.dateKey}</h3>
              </div>
              <button onClick={() => setSelectedDayCell(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveDayEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-cyan-300 font-bold uppercase mb-1">Sub-Admin</label>
                <input type="text" disabled value={selectedSubAdmin.email} className="admin-input" />
              </div>

              <div>
                <label className="block text-cyan-300 font-bold uppercase mb-1">Attendance Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="admin-input bg-zinc-900 text-white"
                >
                  <option value="present">PRESENT (🟢 Green)</option>
                  <option value="leave">ON LEAVE / ABSENT (🔴 Red)</option>
                  <option value="off_day">OFF-DAY / SUNDAY (🟡 Yellow)</option>
                </select>
              </div>

              <div>
                <label className="block text-cyan-300 font-bold uppercase mb-1">Login Timestamp (Optional)</label>
                <input
                  type="datetime-local"
                  value={editLoginTime}
                  onChange={(e) => setEditLoginTime(e.target.value)}
                  className="admin-input text-white"
                />
              </div>

              <div>
                <label className="block text-cyan-300 font-bold uppercase mb-1">Super Admin Notes</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Notes or reason for override..."
                  className="admin-input text-white resize-none"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleDeleteDayRecord(selectedDayCell.dateKey)}
                  className="py-2.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 font-bold rounded-xl flex items-center justify-center gap-1.5"
                >
                  <TrashIcon className="w-3.5 h-3.5" /> Delete Record
                </button>

                <div className="flex gap-2 flex-1">
                  <button
                    type="button"
                    onClick={() => setSelectedDayCell(null)}
                    className="flex-1 py-2.5 bg-white/10 text-gray-300 font-bold rounded-xl"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={updatingDay}
                    className="flex-1 py-2.5 bg-cyan-500 text-black font-black uppercase rounded-xl disabled:opacity-50"
                  >
                    {updatingDay ? "Saving..." : "Save Record"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POST NEW ATTENDANCE MODAL */}
      {showPostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0b1329] border border-white/15 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <PlusIcon className="w-5 h-5 text-cyan-400" />
                <span>Post Attendance Record</span>
              </h3>
              <button onClick={() => setShowPostModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handlePostAttendance} className="space-y-4 text-xs">
              <div>
                <label className="block text-cyan-300 font-bold uppercase mb-1">Target Sub-Admin</label>
                <select
                  required
                  value={postEmail}
                  onChange={(e) => setPostEmail(e.target.value)}
                  className="admin-input bg-zinc-900 text-white"
                >
                  {admins.map((a) => (
                    <option key={a.email} value={a.email}>
                      👤 {a.name ? `${a.name} (${a.email})` : a.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-cyan-300 font-bold uppercase mb-1">Target Date</label>
                <input
                  type="date"
                  required
                  value={postDate}
                  onChange={(e) => setPostDate(e.target.value)}
                  className="admin-input text-white"
                />
              </div>

              <div>
                <label className="block text-cyan-300 font-bold uppercase mb-1">Attendance Status</label>
                <select
                  value={postStatus}
                  onChange={(e) => setPostStatus(e.target.value)}
                  className="admin-input bg-zinc-900 text-white"
                >
                  <option value="present">PRESENT (🟢 Green)</option>
                  <option value="leave">ON LEAVE / ABSENT (🔴 Red)</option>
                  <option value="off_day">OFF-DAY / SUNDAY (🟡 Yellow)</option>
                </select>
              </div>

              <div>
                <label className="block text-cyan-300 font-bold uppercase mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={postNotes}
                  onChange={(e) => setPostNotes(e.target.value)}
                  placeholder="Reason or notes for posting attendance..."
                  className="admin-input text-white resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowPostModal(false)} className="flex-1 py-2.5 bg-white/10 text-gray-300 rounded-xl font-bold">Cancel</button>
                <button
                  type="submit"
                  disabled={posting}
                  className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black uppercase rounded-xl disabled:opacity-50"
                >
                  {posting ? "Posting..." : "Post Attendance"}
                </button>
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
                <TrashIcon className="w-5 h-5 text-rose-400" />
                <span>Bulk Remove Attendance (Past 3 Months)</span>
              </h3>
              <button onClick={() => setShowBulkDeleteModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300">
              Select a Sub-Admin and a date range within the past 90 days to purge/reset past attendance records.
            </div>

            <form onSubmit={handleBulkDeleteAttendance} className="space-y-4 text-xs">
              <div>
                <label className="block text-cyan-300 font-bold uppercase mb-1">Target Sub-Admin</label>
                <select
                  required
                  value={bulkEmail}
                  onChange={(e) => setBulkEmail(e.target.value)}
                  className="admin-input bg-zinc-900 text-white"
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
                    className="admin-input text-white"
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
                    className="admin-input text-white"
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
                disabled={loading}
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
