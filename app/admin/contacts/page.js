"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebase";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  orderBy,
  query,
} from "firebase/firestore";

export default function AdminContactsPage() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ✅ NEW STATES */
  const [replyOpen, setReplyOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState("");
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  /* FETCH MESSAGES */
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const q = query(
          collection(db, "contacts"),
          orderBy("createdAt", "desc")
        );

        const snap = await getDocs(q);

        setMessages(
          snap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
        );
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, []);

  /* DELETE */
  const handleDelete = async (id) => {
    const confirmDelete = confirm("Delete this message?");
    if (!confirmDelete) return;

    await deleteDoc(doc(db, "contacts", id));

    setMessages((prev) =>
      prev.filter((msg) => msg.id !== id)
    );
  };

  /* ✅ OPEN REPLY */
  const handleReplyOpen = (email) => {
    setSelectedEmail(email);
    setReplyText("");
    setReplyOpen(true);
  };

  /* ✅ SEND REPLY */
  const handleSendReply = async () => {
    if (!replyText) return alert("Write a reply");

    try {
      setSending(true);

      const res = await fetch("/api/send-reply", {
        method: "POST",
        body: JSON.stringify({
          to: selectedEmail,
          message: replyText,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      alert("Reply sent successfully");

      setReplyOpen(false);
      setReplyText("");

    } catch (err) {
      console.error(err);
      alert("Failed to send email");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-10">

      <div className="admin-toolbar items-end">
        <div className="admin-section max-w-2xl">
          <p className="admin-kicker">Support Desk</p>
          <h1 className="admin-title">Contact messages</h1>
          <p className="admin-lead">Review inbound messages, reply directly from the inbox, and keep the conversation history tidy.</p>
        </div>

        <div className="admin-chip">{messages.length} conversations</div>
      </div>

      {loading && (
        <div className="admin-empty">Loading messages...</div>
      )}

      {!loading && messages.length === 0 && (
        <div className="admin-empty text-center">No messages yet.</div>
      )}

      <div className="space-y-6">

        {messages.map((msg) => (
          <div
            key={msg.id}
            className="admin-surface rounded-[1.75rem] p-5 md:p-6 space-y-4"
          >

            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">

              <div>
                <p className="font-semibold text-lg">{msg.name}</p>
                <p className="text-sm text-gray-400">
                  {msg.email}
                </p>
              </div>

              <div className="flex gap-2">

                {/* ✅ REPLY BUTTON */}
                <button
                  onClick={() => handleReplyOpen(msg.email)}
                  className="admin-button admin-button-primary px-3 py-2 text-xs"
                >
                  Reply
                </button>

                <button
                  onClick={() => handleDelete(msg.id)}
                  className="admin-button px-3 py-2 text-xs bg-rose-500/15 text-rose-100 border border-rose-300/20"
                >
                  Delete
                </button>

              </div>

            </div>

            <p className="text-sm text-gray-300">
              {msg.message}
            </p>

            <p className="text-xs text-gray-500">
              {msg.createdAt?.toDate
                ? msg.createdAt.toDate().toLocaleString()
                : ""}
            </p>

          </div>
        ))}

      </div>

      {/* ✅ REPLY MODAL */}
      {replyOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">

          <div className="admin-surface rounded-[1.75rem] p-6 w-full max-w-md space-y-4">

            <h2 className="text-lg font-semibold">
              Reply to {selectedEmail}
            </h2>

            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your reply..."
              className="admin-textarea h-32"
            />

            <div className="flex justify-end gap-3">

              <button
                onClick={() => setReplyOpen(false)}
                className="admin-button admin-button-secondary px-4 py-2 text-sm"
              >
                Cancel
              </button>

              <button
                onClick={handleSendReply}
                disabled={sending}
                className="admin-button admin-button-primary px-4 py-2 text-sm"
              >
                {sending ? "Sending..." : "Send"}
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}