"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminMailDesk() {
  const [mails, setMails] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [currentAdmin, setCurrentAdmin] = useState("");
  const [loading, setLoading] = useState(true);

  // Filter tab: "inbox" | "sent" | "broadcasts"
  const [activeTab, setActiveTab] = useState("inbox");
  const [searchQuery, setSearchQuery] = useState("");

  // Selected thread / mail
  const [selectedMailId, setSelectedMailId] = useState(null);

  // Compose Modal State
  const [showCompose, setShowCompose] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [sending, setSending] = useState(false);

  // Quick Reply State inside thread view
  const [replyBody, setReplyBody] = useState("");
  const [replying, setReplying] = useState(false);

  // Status Alerts
  const [alertMsg, setAlertMsg] = useState({ text: "", type: "" });

  const showAlert = (text, type = "success") => {
    setAlertMsg({ text, type });
    setTimeout(() => setAlertMsg({ text: "", type: "" }), 5000);
  };

  /* ── 1. Fetch Session & Mails ── */
  const loadMailData = async () => {
    try {
      const res = await fetch("/api/admin/mail");
      if (res.ok) {
        const data = await res.json();
        setMails(data.mails || []);
        setAdmins(data.admins || []);
      }
    } catch (err) {
      console.warn("Failed to load admin mails:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch("/api/admin/session");
        if (res.ok) {
          const data = await res.json();
          setCurrentAdmin(data.email || "");
        }
      } catch (err) {
        console.warn(err);
      }
    };
    fetchSession();
    loadMailData();

    // Refresh every 12 seconds for pseudo-realtime inbox updates
    const interval = setInterval(loadMailData, 12000);
    return () => clearInterval(interval);
  }, []);

  /* ── 2. Filter Mails based on Tab & Search ── */
  const cleanUser = currentAdmin.toLowerCase();

  const tabFilteredMails = useMemo(() => {
    return mails.filter((m) => {
      const sender = (m.senderEmail || "").toLowerCase();
      const recipient = (m.recipientEmail || "").toLowerCase();

      if (activeTab === "inbox") {
        return (recipient === cleanUser || recipient === "all") && sender !== cleanUser;
      }
      if (activeTab === "sent") {
        return sender === cleanUser;
      }
      if (activeTab === "broadcasts") {
        return recipient === "all";
      }
      return true;
    });
  }, [mails, activeTab, cleanUser]);

  const searchFilteredMails = useMemo(() => {
    if (!searchQuery.trim()) return tabFilteredMails;
    const q = searchQuery.toLowerCase();
    return tabFilteredMails.filter(
      (m) =>
        (m.subject || "").toLowerCase().includes(q) ||
        (m.body || "").toLowerCase().includes(q) ||
        (m.senderEmail || "").toLowerCase().includes(q) ||
        (m.recipientEmail || "").toLowerCase().includes(q)
    );
  }, [tabFilteredMails, searchQuery]);

  const unreadInboxCount = useMemo(() => {
    return mails.filter(
      (m) =>
        (m.recipientEmail.toLowerCase() === cleanUser || m.recipientEmail === "all") &&
        m.senderEmail.toLowerCase() !== cleanUser &&
        !m.readBy?.includes(cleanUser) &&
        !m.read
    ).length;
  }, [mails, cleanUser]);

  /* ── 3. Selected Thread ── */
  const selectedMail = useMemo(() => {
    if (!selectedMailId) return null;
    return mails.find((m) => m.id === selectedMailId) || null;
  }, [mails, selectedMailId]);

  const threadMails = useMemo(() => {
    if (!selectedMail) return [];
    const tId = selectedMail.threadId || selectedMail.id;
    return mails
      .filter((m) => (m.threadId || m.id) === tId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [mails, selectedMail]);

  /* ── 4. Handlers ── */
  const handleSelectMail = async (mail) => {
    setSelectedMailId(mail.id);

    // Mark as read if unread
    if (!mail.readBy?.includes(cleanUser)) {
      try {
        await fetch("/api/admin/mail", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mailId: mail.id, action: "mark_read" }),
        });
        loadMailData();
      } catch (e) {
        console.warn("Failed to mark read:", e);
      }
    }
  };

  const handleSendCompose = async (e) => {
    e.preventDefault();
    if (!composeTo || !composeSubject || !composeBody) {
      showAlert("Please fill in recipient, subject, and message.", "error");
      return;
    }

    try {
      setSending(true);
      const res = await fetch("/api/admin/mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toEmail: composeTo,
          subject: composeSubject,
          body: composeBody,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showAlert(data.error || "Failed to send mail", "error");
        return;
      }

      showAlert("Internal mail dispatched successfully!");
      setShowCompose(false);
      setComposeTo("");
      setComposeSubject("");
      setComposeBody("");
      loadMailData();
    } catch (err) {
      showAlert("Error sending mail: " + err.message, "error");
    } finally {
      setSending(false);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!selectedMail || !replyBody.trim()) return;

    // Direct reply recipient is the sender of the original message
    const targetRecipient =
      selectedMail.senderEmail.toLowerCase() === cleanUser
        ? selectedMail.recipientEmail
        : selectedMail.senderEmail;

    try {
      setReplying(true);
      const res = await fetch("/api/admin/mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toEmail: targetRecipient === "all" ? "all" : targetRecipient,
          subject: selectedMail.subject.startsWith("Re:") ? selectedMail.subject : `Re: ${selectedMail.subject}`,
          body: replyBody.trim(),
          parentMailId: selectedMail.id,
          threadId: selectedMail.threadId || selectedMail.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showAlert(data.error || "Failed to send reply", "error");
        return;
      }

      setReplyBody("");
      showAlert("Reply sent!");
      loadMailData();
    } catch (err) {
      showAlert("Error sending reply: " + err.message, "error");
    } finally {
      setReplying(false);
    }
  };

  const handleDeleteMail = async (mailId) => {
    if (!confirm("Delete this email conversation permanently?")) return;
    try {
      const res = await fetch("/api/admin/mail", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mailId, action: "delete" }),
      });
      if (res.ok) {
        showAlert("Conversation deleted.");
        setSelectedMailId(null);
        loadMailData();
      }
    } catch (e) {
      showAlert("Failed to delete.", "error");
    }
  };

  const getInitials = (emailStr) => {
    if (!emailStr) return "?";
    const namePart = emailStr.split("@")[0];
    return namePart.substring(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="admin-kicker text-cyan-300">Internal Admin Communications</p>
          <h1 className="admin-title flex items-center gap-2">
            <span>✉️</span> Admin Mail Desk
          </h1>
          <p className="admin-lead">Compose, send, and reply to internal administrative messages with all staff members.</p>
        </div>

        <button
          onClick={() => setShowCompose(true)}
          className="admin-button bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black uppercase text-xs tracking-wider px-6 py-3 rounded-2xl shadow-lg shadow-cyan-500/25 flex items-center gap-2 w-fit"
        >
          <span>✏️</span> Compose New Mail
        </button>
      </div>

      {/* ALERT NOTIFICATION */}
      {alertMsg.text && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl border text-sm flex items-center gap-3 ${
            alertMsg.type === "error"
              ? "bg-rose-500/10 border-rose-500/30 text-rose-200"
              : "bg-cyan-500/10 border-cyan-500/30 text-cyan-200"
          }`}
        >
          <span>{alertMsg.type === "error" ? "⚠️" : "✓"}</span>
          <span>{alertMsg.text}</span>
        </motion.div>
      )}

      {/* MAIN DESK LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[650px] bg-[#060b19]/80 border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
        {/* SIDEBAR TABS (COL 1-3) */}
        <div className="lg:col-span-3 border-r border-white/10 p-4 space-y-4 bg-black/20 flex flex-col justify-between">
          <div className="space-y-1">
            <button
              onClick={() => setActiveTab("inbox")}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition ${
                activeTab === "inbox"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20"
                  : "text-gray-300 hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-base">📥</span>
                <span>Inbox</span>
              </div>
              {unreadInboxCount > 0 && (
                <span className="bg-cyan-400 text-black px-2 py-0.5 rounded-full text-[10px] font-black">
                  {unreadInboxCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("sent")}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition ${
                activeTab === "sent"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20"
                  : "text-gray-300 hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-base">📤</span>
                <span>Sent</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("broadcasts")}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition ${
                activeTab === "broadcasts"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20"
                  : "text-gray-300 hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-base">📢</span>
                <span>All Admins Broadcasts</span>
              </div>
            </button>
          </div>

          <div className="p-3 bg-white/5 rounded-2xl border border-white/5 text-[11px] text-gray-400 space-y-1">
            <p className="font-semibold text-cyan-300">Signed in Mail Address</p>
            <p className="truncate font-mono text-[10px] text-gray-300">{currentAdmin}</p>
          </div>
        </div>

        {/* MAIL LIST (COL 4-7) */}
        <div className="lg:col-span-4 border-r border-white/10 flex flex-col bg-black/10 min-h-[500px]">
          {/* SEARCH BAR */}
          <div className="p-3 border-b border-white/10">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search mail subject, sender, content..."
              className="admin-input focus-ring text-xs text-white w-full bg-white/5 border-white/10"
            />
          </div>

          {/* LIST ITEMS */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/5">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : searchFilteredMails.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-500">
                <p className="text-2xl mb-2">📭</p>
                <p>No messages found in this folder.</p>
              </div>
            ) : (
              searchFilteredMails.map((mail) => {
                const isSelected = selectedMailId === mail.id;
                const isUnread = !mail.readBy?.includes(cleanUser) && !mail.read;
                const displaySender = mail.senderEmail === cleanUser ? `To: ${mail.recipientEmail}` : mail.senderEmail;

                return (
                  <div
                    key={mail.id}
                    onClick={() => handleSelectMail(mail)}
                    className={`p-3.5 cursor-pointer transition flex items-start gap-3 relative ${
                      isSelected
                        ? "bg-cyan-500/15 border-l-4 border-cyan-400"
                        : isUnread
                        ? "bg-cyan-950/20 hover:bg-white/5"
                        : "hover:bg-white/5"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-[10px] font-black text-white shrink-0 shadow-md">
                      {getInitials(mail.senderEmail)}
                    </div>

                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex justify-between items-center gap-2">
                        <p className={`text-xs truncate ${isUnread ? "font-bold text-white" : "font-medium text-gray-300"}`}>
                          {displaySender}
                        </p>
                        <span className="text-[10px] text-gray-500 shrink-0">
                          {new Date(mail.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                        </span>
                      </div>

                      <p className={`text-xs truncate ${isUnread ? "font-bold text-cyan-300" : "text-gray-200"}`}>
                        {mail.subject}
                      </p>

                      <p className="text-[11px] text-gray-400 line-clamp-1">
                        {mail.body}
                      </p>
                    </div>

                    {isUnread && (
                      <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 mt-1 shadow-sm shadow-cyan-400/50" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* THREAD READING PANE (COL 8-12) */}
        <div className="lg:col-span-5 flex flex-col justify-between p-5 bg-black/30 min-h-[500px]">
          {!selectedMail ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-8">
              <span className="text-4xl mb-3 opacity-60">📥</span>
              <p className="text-sm font-semibold text-gray-400">Select an email to view conversation thread</p>
              <p className="text-xs text-gray-500 mt-1">Or click &quot;Compose New Mail&quot; to start a message.</p>
            </div>
          ) : (
            <div className="space-y-6 flex-1 flex flex-col justify-between">
              {/* THREAD HEADER */}
              <div className="space-y-3 border-b border-white/10 pb-4">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-lg font-bold text-white leading-snug">{selectedMail.subject}</h2>
                  <button
                    onClick={() => handleDeleteMail(selectedMail.id)}
                    className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-xs transition"
                    title="Delete Conversation"
                  >
                    🗑️
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="font-semibold text-cyan-300">Thread ({threadMails.length} message{threadMails.length > 1 ? "s" : ""})</span>
                </div>
              </div>

              {/* MESSAGES THREAD LIST */}
              <div className="space-y-4 flex-1 overflow-y-auto max-h-[420px] pr-1">
                {threadMails.map((tMail) => {
                  const isMine = tMail.senderEmail.toLowerCase() === cleanUser;
                  return (
                    <div
                      key={tMail.id}
                      className={`p-4 rounded-2xl border space-y-2.5 ${
                        isMine
                          ? "bg-cyan-950/20 border-cyan-500/20 ml-4"
                          : "bg-white/5 border-white/10 mr-4"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs border-b border-white/5 pb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-[9px] font-black text-white">
                            {getInitials(tMail.senderEmail)}
                          </div>
                          <div>
                            <span className="font-bold text-white">{tMail.senderEmail}</span>
                            <span className="text-[10px] text-gray-400 ml-2">to {tMail.recipientEmail}</span>
                          </div>
                        </div>

                        <span className="text-[10px] text-gray-500">
                          {new Date(tMail.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                        </span>
                      </div>

                      <div className="text-xs text-gray-200 leading-relaxed whitespace-pre-wrap">
                        {tMail.body}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* INLINE QUICK REPLY FORM */}
              <form onSubmit={handleSendReply} className="pt-4 border-t border-white/10 space-y-2">
                <p className="text-xs text-cyan-300 font-bold uppercase">Quick Reply</p>
                <textarea
                  rows={3}
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder={`Write reply to ${selectedMail.senderEmail.toLowerCase() === cleanUser ? selectedMail.recipientEmail : selectedMail.senderEmail}...`}
                  className="admin-input focus-ring text-xs text-white w-full bg-white/5 border-white/10 resize-none"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={replying || !replyBody.trim()}
                    className="admin-button admin-button-primary py-2 px-5 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                  >
                    {replying ? "Sending..." : "Send Reply ↩"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* COMPOSE MODAL */}
      <AnimatePresence>
        {showCompose && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0b1329] border border-white/15 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-5 overflow-hidden"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>✏️</span> Compose Internal Mail
                </h3>
                <button
                  onClick={() => setShowCompose(false)}
                  className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSendCompose} className="space-y-4">
                <div>
                  <label className="block text-xs text-cyan-300 font-bold uppercase mb-1">Select Recipient</label>
                  <select
                    required
                    value={composeTo}
                    onChange={(e) => setComposeTo(e.target.value)}
                    className="admin-input focus-ring text-xs text-white w-full bg-zinc-900 border-white/10"
                  >
                    <option value="">-- Choose Recipient Administrator --</option>
                    <option value="all">📢 ALL ADMINS (BROADCAST ANNOUNCEMENT)</option>
                    {admins.map((adm) => (
                      <option key={adm.email} value={adm.email}>
                        👤 {adm.name ? `${adm.name} (${adm.email})` : adm.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-cyan-300 font-bold uppercase mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    placeholder="Enter email subject line..."
                    className="admin-input focus-ring text-xs text-white w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs text-cyan-300 font-bold uppercase mb-1">Message Content</label>
                  <textarea
                    rows={6}
                    required
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value)}
                    placeholder="Type your official administrative message..."
                    className="admin-input focus-ring text-xs text-white w-full resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowCompose(false)}
                    className="flex-1 py-2.5 bg-white/10 hover:bg-white/15 text-gray-300 rounded-xl text-xs font-bold uppercase transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sending}
                    className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-bold uppercase transition disabled:opacity-50"
                  >
                    {sending ? "Dispatching..." : "Send Internal Mail 🚀"}
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
