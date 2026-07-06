"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebase";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  orderBy,
  query,
} from "firebase/firestore";

const TEMPLATES = [
  {
    label: "Greeting & Acknowledgment",
    text: "Hi {name},\n\nThank you for reaching out to Chakradhar Stream Support! We have received your inquiry and our team is actively looking into it. We will get back to you with an update shortly.\n\nBest regards,\nChakradhar Stream Support Team"
  },
  {
    label: "Resolved Issue Notification",
    text: "Hi {name},\n\nWe are pleased to inform you that the issue you reported has been successfully resolved. Please refresh the page and verify if it's working for you. Let us know if you experience any further issues.\n\nBest regards,\nChakradhar Stream Support Team"
  },
  {
    label: "Request Additional Details",
    text: "Hi {name},\n\nThank you for contacting us. To help us investigate this issue further, could you please provide us with some additional details? For example, the device you are using, operating system, and any error message you saw. This will help us resolve your issue faster.\n\nBest regards,\nChakradhar Stream Support Team"
  }
];

export default function AdminContactsPage() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  
  // Filtering & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all, New, Pending, Replied, Closed
  
  // Compose states
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  
  // Toast notifications state
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  
  // Mobile responsive state (active view on mobile)
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  /* FETCH MESSAGES IN REAL-TIME */
  useEffect(() => {
    const q = query(
      collection(db, "contacts"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMessages(docs);
        setLoading(false);
      },
      (err) => {
        console.error("Real-time listener failed:", err);
        showToast("Failed to fetch tickets in real-time.", "error");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "success" });
    }, 4000);
  };

  const getStatus = (msg) => {
    return msg.messageStatus || "New";
  };

  /* TICKET SEARCH & FILTERING */
  const filteredMessages = messages.filter((msg) => {
    const status = getStatus(msg);
    const matchesStatus =
      statusFilter === "all" || status.toLowerCase() === statusFilter.toLowerCase();

    const searchStr = `${msg.name} ${msg.email} ${msg.message} ${msg.source || ""}`.toLowerCase();
    const matchesSearch = searchStr.includes(searchTerm.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const activeTicket = messages.find((msg) => msg.id === selectedTicketId) || null;

  /* MANUAL STATUS UPDATE */
  const handleUpdateStatus = async (ticketId, newStatus) => {
    try {
      const docRef = doc(db, "contacts", ticketId);
      await updateDoc(docRef, { messageStatus: newStatus });
      showToast(`Ticket status updated to ${newStatus}.`);
    } catch (err) {
      console.error(err);
      showToast("Failed to update status.", "error");
    }
  };

  /* DELETE TICKET */
  const handleDelete = async (id) => {
    const confirmDelete = confirm("Delete this support ticket? This action cannot be undone.");
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "contacts", id));
      showToast("Ticket deleted successfully.");
      if (selectedTicketId === id) {
        setSelectedTicketId(null);
        setMobileDetailOpen(false);
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to delete ticket.", "error");
    }
  };

  /* SEND REPLY */
  const handleSendReply = async (e) => {
    e?.preventDefault();
    if (!activeTicket) return;
    if (!replyText.trim()) return showToast("Please write a reply message.", "error");

    try {
      setSending(true);

      const res = await fetch("/api/send-reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticketId: activeTicket.id,
          message: replyText.trim(),
          status: "Replied",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to deliver email reply.");
      }

      showToast("Support reply sent and email dispatched successfully!");
      setReplyText("");
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to dispatch email.", "error");
    } finally {
      setSending(false);
    }
  };

  /* SELECT TEMPLATE */
  const handleSelectTemplate = (templateText) => {
    if (!activeTicket) return;
    const interpolated = templateText.replace("{name}", activeTicket.name);
    setReplyText(interpolated);
  };

  /* CONVERT TIMESTAMP */
  const formatTime = (ts) => {
    if (!ts) return "";
    if (typeof ts.toDate === "function") return ts.toDate().toLocaleString();
    return new Date(ts).toLocaleString();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Dynamic Toast Banner */}
      {toast.show && (
        <div className={`fixed top-24 right-5 md:right-10 z-[100] px-5 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl flex items-center gap-3 transition-all duration-300 transform translate-y-0 scale-100 ${
          toast.type === "success" 
            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
            : "bg-rose-500/15 border-rose-500/30 text-rose-300"
        }`}>
          <span className="text-xl">{toast.type === "success" ? "✓" : "⚠"}</span>
          <p className="text-sm font-semibold">{toast.message}</p>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <p className="admin-kicker">Support Desk</p>
          <h1 className="admin-title">Customer support inbox</h1>
          <p className="admin-lead">Manage incoming client inquiries, send professional templates, and view history in real-time.</p>
        </div>
        <div className="admin-chip flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
          <span>{messages.length} Tickets</span>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="h-10 w-10 border-4 border-cyan-400/20 border-t-cyan-400 animate-spin rounded-full" />
          <p className="text-sm text-gray-400">Loading support conversations...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
          
          {/* Master List Column */}
          <div className={`lg:col-span-5 flex flex-col gap-4 ${mobileDetailOpen ? "hidden lg:flex" : "flex"}`}>
            
            {/* Search and Filters */}
            <div className="admin-surface rounded-2xl p-4 space-y-4">
              <input
                type="text"
                placeholder="Search by name, email, query..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="admin-input"
              />
              
              <div className="flex flex-wrap gap-2 text-xs border-t border-white/5 pt-3">
                {["all", "New", "Pending", "Replied", "Closed"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg border font-semibold capitalize transition ${
                      statusFilter === status
                        ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                        : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Tickets Feed */}
            <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1 scrollbar-thin">
              {filteredMessages.length === 0 ? (
                <div className="admin-surface rounded-2xl p-8 text-center text-gray-500">
                  No support tickets found matching the selection.
                </div>
              ) : (
                filteredMessages.map((msg) => {
                  const status = getStatus(msg);
                  const isSelected = msg.id === selectedTicketId;
                  
                  return (
                    <div
                      key={msg.id}
                      onClick={() => {
                        setSelectedTicketId(msg.id);
                        setMobileDetailOpen(true);
                      }}
                      className={`admin-surface p-4 rounded-2xl border transition cursor-pointer text-left ${
                        isSelected
                          ? "border-cyan-500/50 bg-[#0e172a]/60 shadow-lg shadow-cyan-500/5"
                          : "border-white/5 hover:border-white/10 hover:bg-white/5"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-3 mb-2">
                        <div>
                          <p className="font-bold text-sm text-gray-200 line-clamp-1">{msg.name}</p>
                          <p className="text-[11px] text-gray-400 line-clamp-1">{msg.email}</p>
                        </div>
                        <span className="text-[10px] text-gray-500 font-mono whitespace-nowrap">
                          {msg.createdAt ? new Date(msg.createdAt.toDate ? msg.createdAt.toDate() : msg.createdAt).toLocaleDateString() : ""}
                        </span>
                      </div>
                      
                      <p className="text-xs text-gray-400 line-clamp-2 mb-3">
                        {msg.message}
                      </p>

                      <div className="flex flex-wrap justify-between items-center gap-2">
                        {/* Status Badges */}
                        <div className="flex gap-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase border ${
                            status === "New"
                              ? "border-blue-500/20 bg-blue-500/10 text-blue-400"
                              : status === "Pending"
                              ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                              : status === "Replied"
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                              : "border-gray-500/20 bg-gray-500/10 text-gray-400"
                          }`}>
                            {status}
                          </span>

                          {msg.emailStatus && (
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase border ${
                              msg.emailStatus === "success"
                                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                                : "border-rose-500/20 bg-rose-500/10 text-rose-400"
                            }`}>
                              {msg.emailStatus === "success" ? "Email Sent" : "Email Failed"}
                            </span>
                          )}
                        </div>

                        <span className="text-[10px] uppercase font-mono text-gray-500">
                          {msg.source || "web"}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Details & Reply Column */}
          <div className={`lg:col-span-7 flex flex-col ${mobileDetailOpen ? "flex" : "hidden lg:flex"}`}>
            {activeTicket ? (
              <div className="admin-surface rounded-3xl p-5 md:p-6 flex flex-col h-full space-y-6">
                
                {/* Detail Header */}
                <div className="flex items-center justify-between border-b border-white/5 pb-4 gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setMobileDetailOpen(false)}
                      className="lg:hidden px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold hover:bg-white/10"
                    >
                      ← Back
                    </button>
                    <div>
                      <h2 className="text-base font-bold text-white line-clamp-1">{activeTicket.name}</h2>
                      <p className="text-xs text-gray-400 line-clamp-1">{activeTicket.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={getStatus(activeTicket)}
                      onChange={(e) => handleUpdateStatus(activeTicket.id, e.target.value)}
                      className="bg-black/30 border border-white/10 text-xs text-gray-300 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 font-semibold"
                    >
                      <option value="New">New</option>
                      <option value="Pending">Pending</option>
                      <option value="Replied">Replied</option>
                      <option value="Closed">Closed</option>
                    </select>

                    <button
                      onClick={() => handleDelete(activeTicket.id)}
                      className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/40 text-rose-400 text-xs rounded-xl font-bold transition"
                      title="Delete Ticket"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Main Scrollable Area */}
                <div className="flex-1 space-y-6 overflow-y-auto max-h-[450px] pr-1 scrollbar-thin">
                  
                  {/* Original Inquiry Card */}
                  <div className="bg-[#0b1328]/50 border border-white/5 rounded-2xl p-5 space-y-3">
                    <div className="flex justify-between items-center text-[10px] text-gray-500 font-semibold border-b border-white/5 pb-2">
                      <p>ORIGINAL INQUIRY</p>
                      <p>{formatTime(activeTicket.createdAt)}</p>
                    </div>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {activeTicket.message}
                    </p>
                    <div className="flex gap-4 text-[10px] text-gray-500 pt-2 font-mono">
                      {activeTicket.ip && <p>IP: {activeTicket.ip}</p>}
                      {activeTicket.source && <p>Source: {activeTicket.source}</p>}
                    </div>
                  </div>

                  {/* Conversation log/replies list */}
                  {activeTicket.replies && activeTicket.replies.length > 0 && (
                    <div className="space-y-4">
                      <p className="text-xs uppercase font-black tracking-widest text-cyan-400/80 mb-2 border-b border-cyan-400/10 pb-2">
                        Reply History ({activeTicket.replies.length})
                      </p>
                      
                      {activeTicket.replies.map((rep, idx) => (
                        <div
                          key={rep.id || idx}
                          className="bg-black/20 border border-white/5 rounded-2xl p-4 space-y-3 text-left"
                        >
                          <div className="flex flex-wrap justify-between items-center text-[11px] gap-2 border-b border-white/5 pb-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-gray-300">{rep.repliedBy || "Admin"}</span>
                              <span className="text-gray-500">•</span>
                              <span className="text-gray-400">{formatTime(rep.repliedAt)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase ${
                                rep.emailStatus === "success"
                                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                                  : "border-rose-500/20 bg-rose-500/10 text-rose-400"
                              }`}>
                                {rep.emailStatus === "success" ? "Email Delivered" : "Email Failed"}
                              </span>
                              {rep.emailStatus !== "success" && (
                                <button
                                  onClick={() => {
                                    setReplyText(rep.content);
                                    showToast("Failed message text loaded to composer.", "success");
                                  }}
                                  className="text-[10px] text-cyan-400 underline hover:text-cyan-300"
                                >
                                  Retry Reply
                                </button>
                              )}
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                            {rep.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Support Reply Composer */}
                <form onSubmit={handleSendReply} className="border-t border-white/5 pt-4 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="text-xs uppercase font-black text-gray-400 tracking-wider">
                      Compose Support Reply
                    </label>

                    {/* Pre-written templates drop-down */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-gray-500">Insert Template:</span>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleSelectTemplate(e.target.value);
                            e.target.value = ""; // reset drop-down value
                          }
                        }}
                        className="bg-black/30 border border-white/10 text-[11px] text-gray-300 rounded-xl px-2 py-1 focus:outline-none focus:border-cyan-500 cursor-pointer"
                      >
                        <option value="">-- Choose template --</option>
                        {TEMPLATES.map((tpl, i) => (
                          <option key={i} value={tpl.text}>
                            {tpl.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Reply to ${activeTicket.name}... (Message supports line breaks)`}
                    className="admin-textarea h-28 text-sm leading-relaxed"
                    disabled={sending}
                  />

                  <div className="flex justify-end gap-3 items-center">
                    <span className="text-xs text-gray-500 font-mono">
                      {replyText.length} / 3000 chars
                    </span>
                    <button
                      type="submit"
                      disabled={sending || !replyText.trim()}
                      className="admin-button admin-button-primary px-5 py-2.5 text-xs font-bold tracking-wider uppercase disabled:opacity-50 flex items-center gap-2"
                    >
                      {sending ? (
                        <>
                          <span className="h-3 w-3 border-2 border-white/20 border-t-white animate-spin rounded-full" />
                          <span>Dispatching...</span>
                        </>
                      ) : (
                        "Send Reply Email"
                      )}
                    </button>
                  </div>
                </form>

              </div>
            ) : (
              <div className="admin-surface rounded-3xl p-10 flex flex-col items-center justify-center text-center h-full min-h-[400px] border border-white/5">
                <span className="text-4xl mb-4">📥</span>
                <h3 className="text-base font-bold text-gray-300 mb-1">No ticket selected</h3>
                <p className="text-xs text-gray-500 max-w-sm">
                  Select an inbound query from the left master list to review user messages, manage status, and send support replies.
                </p>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}