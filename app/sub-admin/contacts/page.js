"use client";

import { useEffect, useState } from "react";
import SubAdminAccessGuard from "@/components/admin/SubAdminAccessGuard";
import { MailIcon, SendIcon, AlertCircleIcon, CheckCircleIcon, UserIcon } from "@/components/Icon";

export default function SubAdminContacts() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyingTicket, setReplyingTicket] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ text: "", type: "" });

  const fetchTickets = async () => {
    try {
      const res = await fetch("/api/admin/contacts");
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
      }
    } catch (e) {
      console.warn("Failed to fetch tickets:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyingTicket || !replyText.trim()) return;

    try {
      setSubmitting(true);
      setStatusMsg({ text: "", type: "" });

      const res = await fetch("/api/admin/contacts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reply",
          ticketId: replyingTicket.id,
          replyText: replyText.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatusMsg({ text: data.error || "Failed to send reply.", type: "error" });
        return;
      }

      setStatusMsg({ text: `Reply sent successfully to ${replyingTicket.email}!`, type: "success" });
      setReplyingTicket(null);
      setReplyText("");
      fetchTickets();

      setTimeout(() => setStatusMsg({ text: "", type: "" }), 5000);
    } catch (err) {
      setStatusMsg({ text: "Error sending reply: " + err.message, type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SubAdminAccessGuard moduleKey="contacts">
      <div className="space-y-6 max-w-6xl mx-auto pb-16">
        <div>
          <p className="admin-kicker text-cyan-300">Support Desk</p>
          <h1 className="admin-title flex items-center gap-2">
            <MailIcon className="w-8 h-8 text-cyan-400" />
            <span>Customer Support Contacts</span>
          </h1>
          <p className="admin-lead">Take care of customer inquiries assigned to you by replying directly via email.</p>
        </div>

        {statusMsg.text && (
          <div
            className={`p-4 rounded-2xl border text-xs font-semibold flex items-center gap-2 ${
              statusMsg.type === "error"
                ? "bg-rose-500/10 border-rose-500/30 text-rose-200"
                : "bg-cyan-500/10 border-cyan-500/30 text-cyan-200"
            }`}
          >
            {statusMsg.type === "error" ? <AlertCircleIcon className="w-4 h-4 text-rose-400" /> : <CheckCircleIcon className="w-4 h-4 text-cyan-400" />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="admin-surface p-5 rounded-2xl animate-pulse space-y-3 h-36" />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="admin-empty text-xs text-gray-400">No support tickets assigned or available.</div>
        ) : (
          <div className="space-y-4">
            {tickets.map((t) => (
              <div key={t.id} className="admin-surface p-5 rounded-2xl space-y-3 border border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono font-black text-cyan-400 uppercase">Ticket #{t.ticketId || t.id}</span>
                    <h3 className="text-sm font-bold text-white">{t.subject ? `${t.subject} — ` : ""}{t.name} ({t.email})</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    {t.assignedTo && (
                      <span className="text-[10px] px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold flex items-center gap-1">
                        <UserIcon className="w-3 h-3" /> Assigned: {t.assignedToName || t.assignedTo}
                      </span>
                    )}
                    <span
                      className={`text-[10px] px-2.5 py-1 rounded-full font-black uppercase ${
                        t.messageStatus === "Replied"
                          ? "bg-green-500/20 text-green-300 border border-green-500/30"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      }`}
                    >
                      {t.messageStatus || "New"}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-gray-200 leading-relaxed whitespace-pre-wrap bg-black/20 p-3.5 rounded-xl border border-white/5">
                  {t.message}
                </div>

                {t.replyText && (
                  <div className="p-3 bg-cyan-950/20 border border-cyan-500/20 rounded-xl space-y-1 text-xs">
                    <p className="text-[10px] font-bold text-cyan-300 uppercase">
                      Previous Reply (by {t.repliedBy || "Admin"}):
                    </p>
                    <p className="text-gray-300 whitespace-pre-wrap">{t.replyText}</p>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      setReplyingTicket(t);
                      setReplyText(t.replyText || "");
                    }}
                    className="admin-button bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs uppercase px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-md shadow-cyan-500/20"
                  >
                    <MailIcon className="w-4 h-4" /> {t.replyText ? "Update Reply" : "Reply to Customer"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* REPLY MODAL */}
        {replyingTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-[#0b1329] border border-white/15 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <div>
                  <p className="text-[10px] text-cyan-400 font-bold uppercase">Customer Support Reply</p>
                  <h3 className="text-base font-bold text-white">Reply to {replyingTicket.name}</h3>
                </div>
                <button
                  onClick={() => setReplyingTicket(null)}
                  className="text-gray-400 hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="p-3 bg-white/5 rounded-xl text-xs text-gray-300 space-y-1">
                <p className="font-semibold text-white">Original Inquiry:</p>
                <p className="line-clamp-3 text-gray-400">{replyingTicket.message}</p>
              </div>

              <form onSubmit={handleSendReply} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-cyan-300 uppercase mb-1">Your Email Response</label>
                  <textarea
                    rows={6}
                    required
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your official reply to be sent to the customer's email..."
                    className="admin-input focus-ring text-xs text-white w-full resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setReplyingTicket(null)}
                    className="flex-1 py-2.5 bg-white/10 hover:bg-white/15 text-gray-300 rounded-xl text-xs font-bold uppercase"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !replyText.trim()}
                    className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-bold uppercase disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <SendIcon className="w-4 h-4" />
                    <span>{submitting ? "Sending..." : "Send Email Reply"}</span>
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
