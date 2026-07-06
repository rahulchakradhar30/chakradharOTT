"use client";

import { useEffect, useState, useRef } from "react";
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
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = "sine";
    // Play a friendly dual-tone synthesized notification chime
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.08); // A5
    
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (err) {
    console.warn("Web Audio API not supported or user gesture required:", err);
  }
}

function formatTime(dateVal) {
  if (!dateVal) return "";
  const d = dateVal.toDate ? dateVal.toDate() : new Date(dateVal);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminContactsPage() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  
  // Auth Session state
  const [adminEmail, setAdminEmail] = useState("");
  
  // Filtering & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [viewArchived, setViewArchived] = useState(false);
  const [pageLimit, setPageLimit] = useState(25);
  
  // Composer states
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  
  // Internal Notes states
  const [internalNoteText, setInternalNoteText] = useState("");
  
  // Bulk Selection state
  const [selectedIds, setSelectedIds] = useState([]);
  
  // Toast notifications state
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  
  // Collapsible panels & modals
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  
  // Reference for notification triggers
  const initialLoadRef = useRef(true);
  const prevCountRef = useRef(0);

  /* FETCH ADMIN SESSION AND PERMISSIONS */
  useEffect(() => {
    fetch("/api/admin/session")
      .then((res) => res.json())
      .then((data) => {
        if (data?.authenticated) {
          setAdminEmail(data.email || "admin");
        }
      })
      .catch((err) => console.error("Error fetching session:", err));
  }, []);

  /* FIREBASE REAL-TIME SUBSCRIPTION */
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
        
        // Push Notification sound trigger on new ticket detection
        if (!initialLoadRef.current && docs.length > prevCountRef.current) {
          const freshTicket = docs[0];
          // Trigger alerts only if it is a truly new ticket, not just updates
          if (freshTicket && freshTicket.messageStatus !== "Replied" && freshTicket.messageStatus !== "Closed") {
            playNotificationSound();
            triggerPushNotification(freshTicket.name, freshTicket.message);
          }
        }
        
        prevCountRef.current = docs.length;
        initialLoadRef.current = false;
        setMessages(docs);
        setLoading(false);
      },
      (err) => {
        console.error("Real-time listener failed:", err);
        showToast("Database read error. Refresh page.", "error");
        setLoading(false);
      }
    );

    // Request notification permission on mount
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }

    return () => unsubscribe();
  }, []);

  /* COMPOSER DRAFT AUTOSAVE & RECOVERY */
  useEffect(() => {
    if (!selectedTicketId) return;
    
    // Load local draft
    const cachedDraft = localStorage.getItem(`support_draft_${selectedTicketId}`);
    setReplyText(cachedDraft || "");
    setAttachments([]); // Reset composer attachments when switching tickets
  }, [selectedTicketId]);

  useEffect(() => {
    if (!selectedTicketId) return;
    if (replyText) {
      localStorage.setItem(`support_draft_${selectedTicketId}`, replyText);
    } else {
      localStorage.removeItem(`support_draft_${selectedTicketId}`);
    }
  }, [replyText, selectedTicketId]);

  const triggerPushNotification = (name, text) => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      new Notification(`New Support Ticket from ${name}`, {
        body: text.length > 80 ? `${text.slice(0, 77)}...` : text,
        icon: "/favicon.ico"
      });
    }
  };

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "success" });
    }, 4000);
  };

  const getStatus = (msg) => {
    return msg.messageStatus || "New";
  };

  const getPriority = (msg) => {
    return msg.priority || "Medium";
  };

  /* TICKET DYNAMIC FILTERING & PAGINATION */
  const filteredMessages = messages.filter((msg) => {
    const status = getStatus(msg);
    const priority = getPriority(msg);
    const isArchived = !!msg.archived;

    // Filter by Archive state
    if (viewArchived !== isArchived) return false;

    // Filter by Status Tab
    const matchesStatus =
      statusFilter === "all" || status.toLowerCase() === statusFilter.toLowerCase();

    // Filter by Priority
    const matchesPriority =
      priorityFilter === "all" || priority.toLowerCase() === priorityFilter.toLowerCase();

    // Filter by Search text
    const searchStr = `${msg.name} ${msg.email} ${msg.message} ${msg.source || ""} ${msg.assignedTo || ""}`.toLowerCase();
    const matchesSearch = searchStr.includes(searchTerm.toLowerCase());

    return matchesStatus && matchesPriority && matchesSearch;
  });

  const paginatedMessages = filteredMessages.slice(0, pageLimit);

  const activeTicket = messages.find((msg) => msg.id === selectedTicketId) || null;

  /* MARK TICKET READ */
  useEffect(() => {
    if (activeTicket && activeTicket.isRead === false) {
      // Mark as read automatically when opened
      const docRef = doc(db, "contacts", activeTicket.id);
      updateDoc(docRef, { isRead: true }).catch(console.error);
    }
  }, [selectedTicketId, activeTicket]);

  /* MANUAL READ/UNREAD TOGGLE */
  const handleToggleRead = async (ticket) => {
    try {
      const docRef = doc(db, "contacts", ticket.id);
      await updateDoc(docRef, { isRead: !ticket.isRead });
      showToast(`Ticket marked as ${!ticket.isRead ? "read" : "unread"}.`);
    } catch (err) {
      console.error(err);
      showToast("Failed to toggle read status.", "error");
    }
  };

  /* MANUAL STATUS UPDATE */
  const handleUpdateStatus = async (ticketId, newStatus) => {
    try {
      const docRef = doc(db, "contacts", ticketId);
      await updateDoc(docRef, { messageStatus: newStatus });
      showToast(`Status updated to ${newStatus}.`);
    } catch (err) {
      console.error(err);
      showToast("Failed to update status.", "error");
    }
  };

  /* PRIORITY UPDATE */
  const handleUpdatePriority = async (ticketId, newPriority) => {
    try {
      const docRef = doc(db, "contacts", ticketId);
      await updateDoc(docRef, { priority: newPriority });
      showToast(`Priority updated to ${newPriority}.`);
    } catch (err) {
      console.error(err);
      showToast("Failed to update priority.", "error");
    }
  };

  /* ASSIGNEE UPDATE */
  const handleUpdateAssignee = async (ticketId, newAssignee) => {
    try {
      const docRef = doc(db, "contacts", ticketId);
      await updateDoc(docRef, { assignedTo: newAssignee === "Unassigned" ? null : newAssignee });
      showToast(newAssignee === "Unassigned" ? "Ticket unassigned." : `Ticket assigned to ${newAssignee}.`);
    } catch (err) {
      console.error(err);
      showToast("Failed to assign ticket.", "error");
    }
  };

  /* ARCHIVE / UNARCHIVE */
  const handleToggleArchive = async (ticketId, currentArchived) => {
    try {
      const docRef = doc(db, "contacts", ticketId);
      await updateDoc(docRef, { archived: !currentArchived });
      showToast(!currentArchived ? "Ticket moved to archives." : "Ticket restored from archives.");
      if (!currentArchived && selectedTicketId === ticketId) {
        setSelectedTicketId(null);
        setMobileDetailOpen(false);
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to toggle archive state.", "error");
    }
  };

  /* ATTACHMENT CLOUDINARY UPLOADER */
  const handleUploadAttachment = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (max 4MB)
    if (file.size > 4 * 1024 * 1024) {
      return showToast("Attachment exceeds 4MB limit.", "error");
    }

    try {
      setUploadingAttachment(true);
      
      // Convert file to base64 data URI
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64data = reader.result;
        
        const res = await fetch("/api/cloudinary/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ file: base64data }),
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        
        setAttachments((prev) => [...prev, { name: file.name, url: data.secure_url }]);
        showToast("File uploaded and attached successfully!");
        setUploadingAttachment(false);
      };
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to upload file.", "error");
      setUploadingAttachment(false);
    }
  };

  const handleRemoveAttachment = (idx) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  /* INTERNAL NOTES */
  const handleAddInternalNote = async (e) => {
    e?.preventDefault();
    if (!activeTicket || !internalNoteText.trim()) return;

    try {
      const docRef = doc(db, "contacts", activeTicket.id);
      const noteObject = {
        id: crypto.randomUUID(),
        content: internalNoteText.trim(),
        author: adminEmail || "admin",
        createdAt: new Date().toISOString()
      };
      
      const existingNotes = activeTicket.internalNotes || [];
      await updateDoc(docRef, { internalNotes: [...existingNotes, noteObject] });
      setInternalNoteText("");
      showToast("Internal note recorded.");
    } catch (err) {
      console.error(err);
      showToast("Failed to write note.", "error");
    }
  };

  const handleDeleteInternalNote = async (noteId) => {
    if (!activeTicket) return;
    const confirmDel = confirm("Delete this internal note?");
    if (!confirmDel) return;

    try {
      const docRef = doc(db, "contacts", activeTicket.id);
      const remainingNotes = (activeTicket.internalNotes || []).filter(n => n.id !== noteId);
      await updateDoc(docRef, { internalNotes: remainingNotes });
      showToast("Note deleted.");
    } catch (err) {
      console.error(err);
      showToast("Failed to delete note.", "error");
    }
  };

  /* DISPATCH SUPPORT EMAIL REPLY */
  const handleSendReply = async (e) => {
    e?.preventDefault();
    if (!activeTicket) return;
    if (!replyText.trim()) return showToast("Please compose a response text.", "error");

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
          attachments: attachments
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to dispatch email reply.");
      }

      showToast("Reply sent and email dispatched successfully!");
      localStorage.removeItem(`support_draft_${activeTicket.id}`); // Clear local draft cache
      setReplyText("");
      setAttachments([]);
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to dispatch email.", "error");
    } finally {
      setSending(false);
    }
  };

  /* SINGLE DELETE TICKET */
  const handleDelete = async (id) => {
    const confirmDelete = confirm("Delete this support ticket permanently? This cannot be undone.");
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "contacts", id));
      showToast("Ticket deleted.");
      if (selectedTicketId === id) {
        setSelectedTicketId(null);
        setMobileDetailOpen(false);
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to delete ticket.", "error");
    }
  };

  /* BULK ACTIONS */
  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredMessages.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredMessages.map(m => m.id));
    }
  };

  const handleSelectTicketId = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkAction = async (actionType) => {
    if (selectedIds.length === 0) return;
    
    const confirmAction = confirm(`Perform ${actionType} action on ${selectedIds.length} tickets?`);
    if (!confirmAction) return;

    try {
      setLoading(true);
      const promises = selectedIds.map(async (id) => {
        const docRef = doc(db, "contacts", id);
        if (actionType === "close") {
          return updateDoc(docRef, { messageStatus: "Closed" });
        } else if (actionType === "archive") {
          return updateDoc(docRef, { archived: true });
        } else if (actionType === "delete") {
          return deleteDoc(docRef);
        }
      });

      await Promise.all(promises);
      showToast(`Bulk action (${actionType}) completed on ${selectedIds.length} items.`);
      setSelectedIds([]);
      setSelectedTicketId(null);
      setMobileDetailOpen(false);
    } catch (err) {
      console.error(err);
      showToast("Failed to execute bulk action.", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ANALYTICS METRICS COMPUTATION */
  const computeAnalytics = () => {
    const stats = {
      total: messages.length,
      new: 0,
      pending: 0,
      replied: 0,
      closed: 0,
      failedEmails: 0,
      todayCount: 0,
      avgResponseTimeText: "N/A"
    };

    const now = new Date();
    const todayStr = now.toDateString();
    let responseTimesSum = 0;
    let responseTimesCount = 0;

    messages.forEach((msg) => {
      const status = getStatus(msg);
      
      // Status counts
      if (status === "New") stats.new++;
      else if (status === "Pending") stats.pending++;
      else if (status === "Replied") stats.replied++;
      else if (status === "Closed") stats.closed++;

      // Failed email deliveries
      if (msg.emailStatus === "failed") {
        stats.failedEmails++;
      }

      // Check if submitted today
      const ticketDate = msg.createdAt ? (msg.createdAt.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt)) : null;
      if (ticketDate && ticketDate.toDateString() === todayStr) {
        stats.todayCount++;
      }

      // Calculate response time based on first reply
      if (msg.replies && msg.replies.length > 0 && ticketDate) {
        const firstReply = msg.replies[0];
        const replyDate = new Date(firstReply.repliedAt);
        const diffMs = replyDate - ticketDate;
        if (diffMs > 0) {
          responseTimesSum += diffMs;
          responseTimesCount++;
        }
      }
    });

    if (responseTimesCount > 0) {
      const avgMs = responseTimesSum / responseTimesCount;
      const avgHrs = avgMs / (1000 * 60 * 60);
      if (avgHrs < 1) {
        const mins = Math.round(avgHrs * 60);
        stats.avgResponseTimeText = `${mins} mins`;
      } else {
        stats.avgResponseTimeText = `${avgHrs.toFixed(1)} hrs`;
      }
    }

    return stats;
  };

  const analytics = computeAnalytics();

  /* CHART DATA GRAPH GENERATOR (LAST 7 DAYS) */
  const generateChartData = () => {
    const last7Days = [];
    const counts = {};
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const label = date.toLocaleDateString("en-US", { weekday: "short" });
      last7Days.push({ label, dateString: date.toDateString() });
      counts[date.toDateString()] = 0;
    }

    messages.forEach((msg) => {
      const ticketDate = msg.createdAt ? (msg.createdAt.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt)) : null;
      if (ticketDate) {
        const dateStr = ticketDate.toDateString();
        if (counts[dateStr] !== undefined) {
          counts[dateStr]++;
        }
      }
    });

    const data = last7Days.map(d => ({
      label: d.label,
      count: counts[d.dateString]
    }));

    const maxCount = Math.max(...data.map(d => d.count), 1);
    return { data, maxCount };
  };

  const chartInfo = generateChartData();

  /* CHRONOLOGICAL TIMELINE MERGER */
  const buildTimeline = (ticket) => {
    if (!ticket) return [];
    
    const timeline = [];

    // 1. Original inquiry
    timeline.push({
      id: "original_inquiry",
      type: "message",
      author: ticket.name,
      email: ticket.email,
      date: ticket.createdAt,
      content: ticket.message,
      imageUrl: ticket.imageUrl
    });

    // 2. Admin Replies
    if (ticket.replies && ticket.replies.length > 0) {
      ticket.replies.forEach((rep) => {
        timeline.push({
          id: rep.id,
          type: "reply",
          author: rep.repliedBy || "Admin",
          date: rep.repliedAt,
          content: rep.content,
          emailStatus: rep.emailStatus,
          attachments: rep.attachments || []
        });
      });
    }

    // 3. Internal Notes
    if (ticket.internalNotes && ticket.internalNotes.length > 0) {
      ticket.internalNotes.forEach((note) => {
        timeline.push({
          id: note.id,
          type: "note",
          author: note.author || "Admin",
          date: note.createdAt,
          content: note.content
        });
      });
    }

    // Sort ascending by date
    timeline.sort((a, b) => {
      const aTime = a.date?.toDate ? a.date.toDate().getTime() : new Date(a.date).getTime();
      const bTime = b.date?.toDate ? b.date.toDate().getTime() : new Date(b.date).getTime();
      return aTime - bTime;
    });

    return timeline;
  };

  const timelineItems = buildTimeline(activeTicket);

  /* EMAIL PREVIEW TEMPLATE RENDER */
  const getEmailPreviewHtml = () => {
    if (!activeTicket) return "";
    const text = replyText.trim() || "Type support response in composer to preview email...";
    const recipientName = activeTicket.name;
    const originalMessage = activeTicket.message;
    
    let attachmentsPreviewHtml = "";
    if (attachments.length > 0) {
      attachmentsPreviewHtml = `
        <div style="margin-top: 30px; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 20px;">
          <h4 style="margin: 0 0 10px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af;">Attachments</h4>
          <ul style="margin: 0; padding: 0; list-style-type: none;">
            ${attachments
              .map(
                (att) => `
              <li style="margin-bottom: 8px;">
                <a href="${att.url}" target="_blank" style="color: #06b6d4; text-decoration: none; font-size: 14px; font-weight: 600;">
                  📎 ${att.name}
                </a>
              </li>
            `
              )
              .join("")}
          </ul>
        </div>
      `;
    }

    return `
      <div style="background-color: #0c1328; padding: 30px 10px; font-family: sans-serif; color: #f3f4f6; text-align: left;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #060b19; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 900;">Chakradhar Stream</h1>
            <p style="margin: 5px 0 0 0; color: rgba(255, 255, 255, 0.85); font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Support response</p>
          </div>
          <div style="padding: 30px;">
            <p style="font-size: 16px; font-weight: bold; margin-bottom: 15px; color: #ffffff;">Hello ${recipientName},</p>
            <p style="font-size: 14px; color: #d1d5db; line-height: 1.6; margin-bottom: 25px;">Our support team has posted a reply to your inquiry:</p>
            
            <div style="background-color: rgba(255,255,255,0.03); border-left: 4px solid #06b6d4; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <h3 style="margin: 0 0 8px 0; font-size: 11px; text-transform: uppercase; color: #06b6d4; letter-spacing: 1px;">Official Reply</h3>
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #ffffff; white-space: pre-wrap;">${text}</p>
            </div>
            
            ${attachmentsPreviewHtml}

            <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px; margin-top: 20px;">
              <h4 style="margin: 0 0 10px 0; font-size: 11px; text-transform: uppercase; color: #9ca3af; letter-spacing: 1px;">Original Inquiry</h4>
              <div style="font-size: 13px; line-height: 1.5; color: #9ca3af; font-style: italic; background-color: rgba(0,0,0,0.15); padding: 12px 15px; border-radius: 8px;">
                "${originalMessage}"
              </div>
            </div>
          </div>
          <div style="background-color: #030712; padding: 20px; text-align: center; font-size: 11px; color: #6b7280;">
            <p style="margin: 0 0 4px 0;">This is an automated support notification.</p>
            <p style="margin: 0;">&copy; 2026 Chakradhar Stream Support. All rights reserved.</p>
          </div>
        </div>
      </div>
    `;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-left">
      
      {/* Toast banners */}
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

      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <p className="admin-kicker">Support Desk v3.0</p>
          <h1 className="admin-title">Customer support inbox</h1>
          <p className="admin-lead">Resolve customer queries, assign agents, verify bounce logs, and view team productivity analytics.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setAnalyticsOpen(!analyticsOpen)}
            className="px-4 py-2.5 rounded-xl border border-white/15 bg-black/20 text-xs font-semibold hover:bg-white/5 transition flex items-center gap-2"
          >
            {analyticsOpen ? "隐藏 Analytics 📊" : "显示 Analytics 📊"}
          </button>
          
          <button
            onClick={() => setViewArchived(!viewArchived)}
            className={`px-4 py-2.5 rounded-xl border font-semibold text-xs transition ${
              viewArchived
                ? "bg-amber-500/20 border-amber-500/30 text-amber-300"
                : "bg-black/20 border-white/15 text-gray-300 hover:bg-white/5"
            }`}
          >
            {viewArchived ? "查看 Active Tickets" : "查看 Archived Tickets 🗄️"}
          </button>
        </div>
      </div>

      {/* Collapsible Analytics Summary */}
      {analyticsOpen && (
        <div className="admin-surface rounded-3xl p-6 border border-white/10 space-y-6 animate-fadeIn">
          <h2 className="text-sm font-black uppercase tracking-wider text-cyan-400">Support Desk Performance KPI</h2>
          
          {/* KPI statistics cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {[
              { label: "Total Tickets", val: analytics.total },
              { label: "New / Open", val: analytics.new, color: "text-blue-400" },
              { label: "Pending Response", val: analytics.pending, color: "text-amber-400" },
              { label: "Closed resolved", val: analytics.closed, color: "text-gray-400" },
              { label: "Replied", val: analytics.replied, color: "text-emerald-400" },
              { label: "Failed Emails", val: stats => analytics.failedEmails, color: "text-rose-400" },
              { label: "Response Time", val: analytics.avgResponseTimeText, color: "text-cyan-400" },
              { label: "Submitted Today", val: analytics.todayCount, color: "text-violet-400" }
            ].map((stat, i) => (
              <div key={i} className="bg-black/35 rounded-2xl p-4 border border-white/5 flex flex-col justify-between min-h-[90px]">
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{stat.label}</p>
                <p className={`text-xl font-black mt-2 ${stat.color || "text-white"}`}>{typeof stat.val === "function" ? stat.val() : stat.val}</p>
              </div>
            ))}
          </div>

          {/* SVG Traffic Chart last 7 days */}
          <div className="border-t border-white/5 pt-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-4 text-left">
              <h3 className="font-bold text-gray-200 text-sm">Ticket Activity Timeline</h3>
              <p className="text-xs text-gray-400 mt-1">Displays the frequency of incoming support requests over the past 7 days to guide staffing allocations.</p>
            </div>
            
            <div className="md:col-span-8 bg-black/20 rounded-2xl p-4 border border-white/5 min-h-[160px] flex flex-col justify-end">
              <div className="flex justify-between items-end h-[100px] px-2">
                {chartInfo.data.map((day, i) => {
                  const percentHeight = (day.count / chartInfo.maxCount) * 100;
                  return (
                    <div key={i} className="flex flex-col items-center flex-1 group relative">
                      {/* Tooltip */}
                      <span className="absolute -top-6 text-[10px] bg-[#0c1328] px-1.5 py-0.5 rounded border border-white/10 opacity-0 group-hover:opacity-100 transition text-cyan-300 font-mono">
                        {day.count}
                      </span>
                      {/* Bar */}
                      <div 
                        style={{ height: `${percentHeight}%` }} 
                        className="w-6 md:w-8 bg-gradient-to-t from-blue-600 to-cyan-400 rounded-t group-hover:from-blue-500 group-hover:to-cyan-300 transition duration-300"
                      />
                      <span className="text-[10px] text-gray-400 mt-2 font-semibold font-mono">{day.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="h-10 w-10 border-4 border-cyan-400/20 border-t-cyan-400 animate-spin rounded-full" />
          <p className="text-sm text-gray-400 font-medium">Re-compiling live threads...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[650px] items-start">
          
          {/* Master List Column */}
          <div className={`lg:col-span-5 flex flex-col gap-4 ${mobileDetailOpen ? "hidden lg:flex" : "flex"}`}>
            
            {/* Search, Filter & Bulk Operations panel */}
            <div className="admin-surface rounded-2xl p-4 space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Search by name, email, keyword..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="admin-input flex-1"
                />
                
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="bg-black/30 border border-white/10 text-xs text-gray-300 rounded-xl px-2.5 py-2.5 focus:outline-none focus:border-cyan-500 font-semibold"
                >
                  <option value="all">All Priorities</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              {/* Status Filters */}
              <div className="flex flex-wrap gap-2 text-xs border-t border-white/5 pt-3">
                {["all", "New", "Pending", "Replied", "Closed"].map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setStatusFilter(status);
                      setSelectedIds([]); // Reset selection when status filter shifts
                    }}
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

              {/* Bulk Actions Header */}
              {filteredMessages.length > 0 && (
                <div className="flex items-center justify-between border-t border-white/5 pt-3 text-xs bg-black/10 px-3 py-2 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredMessages.length && filteredMessages.length > 0}
                      onChange={handleToggleSelectAll}
                      className="rounded border-white/15 bg-black/40 text-cyan-500 focus:ring-cyan-500 cursor-pointer"
                    />
                    <span className="font-semibold text-gray-300">Select All ({selectedIds.length})</span>
                  </div>

                  {selectedIds.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleBulkAction("close")}
                        className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-1 rounded hover:bg-emerald-500/35 font-bold uppercase transition"
                      >
                        Close
                      </button>
                      <button
                        onClick={() => handleBulkAction("archive")}
                        className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-1 rounded hover:bg-amber-500/35 font-bold uppercase transition"
                      >
                        Archive
                      </button>
                      <button
                        onClick={() => handleBulkAction("delete")}
                        className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-1 rounded hover:bg-rose-500/35 font-bold uppercase transition"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Tickets Feed Scroll list */}
            <div className="space-y-3 overflow-y-auto max-h-[550px] pr-1 scrollbar-thin">
              {filteredMessages.length === 0 ? (
                <div className="admin-surface rounded-2xl p-10 text-center text-gray-500">
                  No support tickets match the parameters.
                </div>
              ) : (
                <>
                  {paginatedMessages.map((msg) => {
                    const status = getStatus(msg);
                    const priority = getPriority(msg);
                    const isSelected = msg.id === selectedTicketId;
                    const isUnread = msg.isRead === false && status === "New";
                    const isChecked = selectedIds.includes(msg.id);
                    
                    return (
                      <div
                        key={msg.id}
                        onClick={() => {
                          setSelectedTicketId(msg.id);
                          setMobileDetailOpen(true);
                        }}
                        className={`admin-surface p-4 rounded-2xl border transition cursor-pointer text-left relative flex items-start gap-3 ${
                          isSelected
                            ? "border-cyan-500 bg-[#0e172a]/60 shadow-lg shadow-cyan-500/5"
                            : isUnread
                            ? "border-blue-500/30 bg-[#0f1d3a]/25 shadow shadow-blue-500/5 hover:border-blue-500/50"
                            : "border-white/5 hover:border-white/10 hover:bg-white/5"
                        }`}
                      >
                        {/* Bulk selection checkbox */}
                        <div 
                          className="pt-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectTicketId(msg.id);
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // Controlled via parent click container
                            className="rounded border-white/15 bg-black/40 text-cyan-500 focus:ring-cyan-500 cursor-pointer"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2 mb-1.5">
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-gray-100 line-clamp-1 flex items-center gap-1.5">
                                {isUnread && (
                                  <span className="h-2 w-2 rounded-full bg-blue-400 inline-block shadow-lg shadow-blue-500" title="Unread Inquiry" />
                                )}
                                <span className={isUnread ? "font-black" : "font-bold"}>{msg.name}</span>
                              </p>
                              <p className="text-[11px] text-gray-400 line-clamp-1">{msg.email}</p>
                            </div>
                            
                            <span className="text-[10px] text-gray-500 font-mono whitespace-nowrap pt-0.5">
                              {msg.createdAt ? new Date(msg.createdAt.toDate ? msg.createdAt.toDate() : msg.createdAt).toLocaleDateString() : ""}
                            </span>
                          </div>
                          
                          <p className="text-xs text-gray-400 line-clamp-2 mb-3 leading-relaxed">
                            {msg.message}
                          </p>

                          <div className="flex flex-wrap justify-between items-center gap-2 border-t border-white/5 pt-2 mt-2">
                            {/* Badges */}
                            <div className="flex flex-wrap gap-1.5">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase border ${
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

                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase border ${
                                priority === "High"
                                  ? "border-rose-500/25 bg-rose-500/10 text-rose-400 shadow-md shadow-rose-500/5 animate-pulse"
                                  : priority === "Medium"
                                  ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-400"
                                  : "border-gray-500/25 bg-gray-500/10 text-gray-400"
                              }`}>
                                {priority}
                              </span>

                              {msg.emailStatus && (
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase border ${
                                  msg.emailStatus === "success"
                                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                                    : "border-rose-500/20 bg-rose-500/10 text-rose-400 animate-pulse"
                                }`}>
                                  {msg.emailStatus === "success" ? "Sent" : "Bounced/Failed"}
                                </span>
                              )}
                            </div>

                            {msg.assignedTo && (
                              <span className="text-[10px] text-cyan-300 font-semibold font-mono">
                                👤 {msg.assignedTo.split("@")[0]}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Pagination trigger link */}
                  {filteredMessages.length > pageLimit && (
                    <button
                      onClick={() => setPageLimit(prev => prev + 25)}
                      className="w-full py-3 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 hover:border-white/10 transition text-xs font-semibold text-gray-300 flex items-center justify-center gap-2"
                    >
                      Load More Tickets ({filteredMessages.length - pageLimit} remaining)
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Details & Compose Column */}
          <div className={`lg:col-span-7 flex flex-col ${mobileDetailOpen ? "flex" : "hidden lg:flex"}`}>
            {activeTicket ? (
              <div className="admin-surface rounded-3xl p-5 md:p-6 flex flex-col h-full space-y-6">
                
                {/* Detail Header controls */}
                <div className="flex flex-wrap items-center justify-between border-b border-white/5 pb-4 gap-4">
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

                  <div className="flex flex-wrap items-center gap-2">
                    
                    {/* Mark Unread toggle */}
                    <button
                      onClick={() => handleToggleRead(activeTicket)}
                      className="px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold hover:bg-white/10 transition"
                      title={activeTicket.isRead ? "Mark Unread" : "Mark Read"}
                    >
                      ✉️ {activeTicket.isRead ? "Unread" : "Read"}
                    </button>

                    {/* Archive toggle */}
                    <button
                      onClick={() => handleToggleArchive(activeTicket.id, !!activeTicket.archived)}
                      className={`px-2.5 py-1.5 border rounded-xl text-xs font-semibold transition ${
                        activeTicket.archived 
                          ? "bg-amber-500/10 border-amber-500/25 text-amber-400 hover:bg-amber-500/20"
                          : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                      }`}
                      title={activeTicket.archived ? "Restore ticket" : "Archive ticket"}
                    >
                      🗄️ {activeTicket.archived ? "Restore" : "Archive"}
                    </button>

                    {/* Delete hook */}
                    <button
                      onClick={() => handleDelete(activeTicket.id)}
                      className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs rounded-xl font-bold transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Quick actions panel */}
                <div className="bg-black/20 p-3 rounded-2xl border border-white/5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  
                  {/* Status update selector */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-gray-500 font-bold uppercase">Status</span>
                    <select
                      value={getStatus(activeTicket)}
                      onChange={(e) => handleUpdateStatus(activeTicket.id, e.target.value)}
                      className="bg-black/45 border border-white/10 text-xs text-gray-300 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 font-semibold"
                    >
                      <option value="New">New</option>
                      <option value="Pending">Pending</option>
                      <option value="Replied">Replied</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>

                  {/* Priority selector */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-gray-500 font-bold uppercase">Priority</span>
                    <select
                      value={getPriority(activeTicket)}
                      onChange={(e) => handleUpdatePriority(activeTicket.id, e.target.value)}
                      className="bg-black/45 border border-white/10 text-xs text-gray-300 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 font-semibold"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>

                  {/* Owner assignee selector */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-gray-500 font-bold uppercase">Assignee</span>
                    <select
                      value={activeTicket.assignedTo || "Unassigned"}
                      onChange={(e) => handleUpdateAssignee(activeTicket.id, e.target.value)}
                      className="bg-black/45 border border-white/10 text-xs text-gray-300 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 font-semibold"
                    >
                      <option value="Unassigned">Unassigned</option>
                      {adminEmail && <option value={adminEmail}>{adminEmail}</option>}
                      <option value="support@chakradharstream.com">support@chakradharstream.com</option>
                    </select>
                  </div>

                </div>

                {/* Chronological Timeline Feed */}
                <div className="flex-1 space-y-6 overflow-y-auto max-h-[350px] pr-1 scrollbar-thin">
                  <div className="relative border-l border-white/10 pl-6 space-y-6 ml-3 text-left">
                    
                    {timelineItems.map((item, idx) => {
                      if (item.type === "message") {
                        // Original inquiry node
                        return (
                          <div key={item.id || idx} className="relative">
                            <span className="absolute -left-[31px] top-1.5 h-4 w-4 rounded-full bg-blue-500 border-4 border-[#060b19] flex items-center justify-center shadow" />
                            
                            <div className="bg-[#0b1328]/50 border border-white/5 rounded-2xl p-5 space-y-2">
                              <div className="flex justify-between items-center text-[10px] text-gray-500 font-bold border-b border-white/5 pb-2">
                                <p>ORIGINAL INQUIRY BY {String(item.author).toUpperCase()}</p>
                                <p>{formatTime(item.date)}</p>
                              </div>
                              <div className="text-sm text-gray-300 leading-relaxed markdown-preview">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {item.content}
                                </ReactMarkdown>
                              </div>
                              <div className="flex flex-wrap gap-4 text-[10px] text-gray-500 pt-1 font-mono">
                                <p>Email: {item.email}</p>
                                {activeTicket.ip && <p>IP: {activeTicket.ip}</p>}
                                {activeTicket.source && <p>Source: {activeTicket.source}</p>}
                              </div>
                              {item.imageUrl && (
                                <div className="mt-4 pt-4 border-t border-white/5">
                                  <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">Attached Image</p>
                                  <a href={item.imageUrl} target="_blank" rel="noreferrer" className="block max-w-[300px] rounded-xl overflow-hidden border border-white/10 hover:opacity-90 transition">
                                    <img src={item.imageUrl} alt="Attached issue" className="w-full h-auto object-cover" />
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      } else if (item.type === "reply") {
                        // Admin Reply node
                        return (
                          <div key={item.id || idx} className="relative">
                            <span className="absolute -left-[31px] top-1.5 h-4 w-4 rounded-full bg-emerald-500 border-4 border-[#060b19] flex items-center justify-center shadow" />
                            
                            <div className="bg-[#0f1d1a]/20 border border-emerald-500/10 rounded-2xl p-5 space-y-2">
                              <div className="flex justify-between items-center text-[10px] text-emerald-400 font-bold border-b border-white/5 pb-2">
                                <p>SUPPORT REPLY BY {String(item.author).toUpperCase()}</p>
                                <p>{formatTime(item.date)}</p>
                              </div>
                              <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                                {item.content}
                              </p>

                              {/* Clickable attachments */}
                              {item.attachments && item.attachments.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5 mt-2">
                                  {item.attachments.map((att, attIdx) => (
                                    <a
                                      key={attIdx}
                                      href={att.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 hover:border-white/20 transition flex items-center gap-1"
                                    >
                                      📎 {att.name}
                                    </a>
                                  ))}
                                </div>
                              )}

                              <div className="flex justify-between items-center pt-2 text-[10px] text-gray-500 border-t border-white/5 mt-2">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border uppercase ${
                                  item.emailStatus === "success"
                                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                                    : "border-rose-500/20 bg-rose-500/10 text-rose-400 animate-pulse"
                                }`}>
                                  {item.emailStatus === "success" ? "Email Delivered" : "Email Failed"}
                                </span>

                                {item.emailStatus !== "success" && (
                                  <button
                                    onClick={() => {
                                      setReplyText(item.content);
                                      showToast("Draft restored to composer.", "success");
                                    }}
                                    className="text-[10px] text-cyan-400 underline hover:text-cyan-300 font-bold"
                                  >
                                    Retry Send
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      } else if (item.type === "note") {
                        // Private Internal Note node
                        return (
                          <div key={item.id || idx} className="relative">
                            <span className="absolute -left-[31px] top-1.5 h-4 w-4 rounded-full bg-amber-500 border-4 border-[#060b19] flex items-center justify-center shadow" />
                            
                            <div className="bg-[#1e160a]/20 border border-amber-500/10 rounded-2xl p-4 space-y-2">
                              <div className="flex justify-between items-center text-[10px] text-amber-400 font-bold border-b border-white/5 pb-2">
                                <p>🔒 PRIVATE NOTE BY {String(item.author).toUpperCase()}</p>
                                <div className="flex items-center gap-2">
                                  <span>{formatTime(item.date)}</span>
                                  {item.author === adminEmail && (
                                    <button
                                      onClick={() => handleDeleteInternalNote(item.id)}
                                      className="text-rose-400 hover:text-rose-300 font-bold underline cursor-pointer"
                                    >
                                      Delete
                                    </button>
                                  )}
                                </div>
                              </div>
                              <p className="text-xs text-amber-200/90 whitespace-pre-wrap leading-relaxed font-medium">
                                {item.content}
                              </p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}

                  </div>
                </div>

                {/* Inline Internal Notes compiler */}
                <form onSubmit={handleAddInternalNote} className="bg-black/25 p-3 rounded-2xl border border-white/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-gray-500 font-black uppercase">🔒 Write Private Team Note</span>
                    <span className="text-[10px] text-gray-500">Visible only to admins</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add an internal note about this ticket..."
                      value={internalNoteText}
                      onChange={(e) => setInternalNoteText(e.target.value)}
                      className="admin-input text-xs flex-1 py-2"
                    />
                    <button
                      type="submit"
                      disabled={!internalNoteText.trim()}
                      className="px-4 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-xs font-bold rounded-xl disabled:opacity-50 transition"
                    >
                      Post Note
                    </button>
                  </div>
                </form>

                {/* Support Reply Composer */}
                <form onSubmit={handleSendReply} className="border-t border-white/5 pt-4 space-y-4 text-left">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="text-xs uppercase font-black text-gray-400 tracking-wider">
                      Compose Client Response
                    </label>

                    {/* Pre-written templates drop-down */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-gray-500">Insert Template:</span>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleSelectTemplate(e.target.value);
                            e.target.value = ""; // Reset value
                          }
                        }}
                        className="bg-black/30 border border-white/10 text-[11px] text-gray-300 rounded-xl px-2 py-1 focus:outline-none focus:border-cyan-500 cursor-pointer font-semibold"
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
                    placeholder={`Compose email response to ${activeTicket.name}...`}
                    className="admin-textarea h-24 text-sm leading-relaxed"
                    disabled={sending}
                  />

                  {/* Attachment selector & uploader bar */}
                  <div className="flex flex-wrap gap-2 items-center justify-between">
                    <div className="flex flex-wrap gap-2 items-center">
                      <label className="cursor-pointer px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl text-xs font-bold text-gray-300 transition flex items-center gap-1.5">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUploadAttachment}
                          disabled={uploadingAttachment}
                          className="hidden"
                        />
                        {uploadingAttachment ? (
                          <>
                            <span className="h-3 w-3 border-2 border-white/25 border-t-white animate-spin rounded-full inline-block" />
                            <span>Uploading file...</span>
                          </>
                        ) : (
                          <>
                            <span>📎 Attach Image (Max 4MB)</span>
                          </>
                        )}
                      </label>

                      {attachments.map((att, idx) => (
                        <div key={idx} className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold px-2 py-1 rounded-xl flex items-center gap-1.5">
                          <span className="truncate max-w-[120px]" title={att.name}>{att.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(idx)}
                            className="text-cyan-400 hover:text-cyan-200 font-bold focus:outline-none"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setPreviewOpen(true)}
                      className="px-3.5 py-2 bg-black/35 hover:bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-gray-400 hover:text-gray-200 transition"
                    >
                      👁️ Preview Email
                    </button>
                  </div>

                  <div className="flex justify-end gap-3 items-center border-t border-white/5 pt-3">
                    <span className="text-xs text-gray-500 font-mono">
                      {replyText.length} / 3000 chars
                    </span>
                    
                    <button
                      type="submit"
                      disabled={sending || uploadingAttachment || !replyText.trim()}
                      className="admin-button admin-button-primary px-5 py-2.5 text-xs font-black tracking-wider uppercase disabled:opacity-50 flex items-center gap-2"
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
              <div className="admin-surface rounded-3xl p-10 flex flex-col items-center justify-center text-center h-full min-h-[450px] border border-white/5">
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

      {/* HTML EMAIL PREVIEW MODAL */}
      {previewOpen && activeTicket && (
        <div 
          className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-[110] p-4"
          onClick={() => setPreviewOpen(false)}
        >
          <div 
            className="admin-surface rounded-3xl w-full max-w-2xl border border-white/10 p-5 md:p-6 space-y-4 flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="font-bold text-gray-200">Email Broadcast Live Preview</h3>
              <button 
                onClick={() => setPreviewOpen(false)}
                className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-semibold text-gray-400 hover:text-white"
              >
                Close ×
              </button>
            </div>
            
            {/* Embedded raw preview markup */}
            <div className="flex-1 overflow-y-auto rounded-2xl border border-white/5 bg-[#0c1328] scrollbar-thin">
              <iframe
                title="Email Preview"
                srcDoc={getEmailPreviewHtml()}
                className="w-full h-[400px] border-none"
              />
            </div>

            <div className="flex justify-between items-center text-xs text-gray-500 border-t border-white/5 pt-3">
              <p>Recipient: {activeTicket.email}</p>
              <p>Supports attachments & templates</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}