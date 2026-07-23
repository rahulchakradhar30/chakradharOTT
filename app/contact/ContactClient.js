"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FormInput from "@/components/FormInput";
import Button from "@/components/Button";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/firebase";
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import { MailIcon, ClockIcon, CheckCircleIcon, AlertCircleIcon, UserIcon, ShieldCheckIcon } from "@/components/Icon";

export default function ContactClient() {
  const { addToast } = useToast();
  const { user, unlockAchievement } = useAuth();
  
  // Complaint submission form states
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [successTicketId, setSuccessTicketId] = useState(null);

  // Authenticated User Raised Tickets State
  const [myTickets, setMyTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  // Anonymous Ticket Tracking search states
  const [trackId, setTrackId] = useState("");
  const [trackEmail, setTrackEmail] = useState("");
  const [trackedTicket, setTrackedTicket] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState("");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // 1. AUTO-FILL PROFILE DETAILS WHEN LOGGED IN
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: user.displayName || user.email?.split("@")[0] || prev.name,
        email: user.email || prev.email,
      }));
    }
  }, [user]);

  // 2. AUTO-FETCH LOGGED-IN USER'S RAISED TICKETS IN REALTIME
  useEffect(() => {
    if (!user?.email) {
      setMyTickets([]);
      return;
    }

    setTicketsLoading(true);
    const q = query(
      collection(db, "contacts"),
      where("email", "==", user.email.toLowerCase())
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        // Sort latest first
        list.sort((a, b) => {
          const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
          const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
          return timeB - timeA;
        });

        setMyTickets(list);
        setTicketsLoading(false);
      },
      (err) => {
        console.warn("Failed to subscribe to user support tickets:", err);
        setTicketsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.subject.trim()) {
      newErrors.subject = "Subject / Issue topic is required";
    }

    if (!formData.message.trim()) {
      newErrors.message = "Message description is required";
    } else if (formData.message.trim().length < 10) {
      newErrors.message = "Message must be at least 10 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  /* ATTACHMENT IMAGE UPLOAD */
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      addToast("File size exceeds 4MB limit.", "error");
      return;
    }

    try {
      setUploading(true);
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64data = reader.result;
        
        const res = await fetch("/api/cloudinary/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file: base64data }),
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        
        setImageUrl(data.secure_url);
        addToast("Screenshot attached successfully!", "success");
        setUploading(false);
      };
    } catch (err) {
      console.error(err);
      addToast(err.message || "Failed to upload image.", "error");
      setUploading(false);
    }
  };

  /* COMPLAINT SUBMISSION */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      addToast("Please fix the errors in the form", "warning");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          website: "",
          name: formData.name,
          email: formData.email,
          subject: formData.subject,
          message: formData.message,
          userId: user?.uid || null,
          imageUrl: imageUrl || null
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to send message");
      }

      setSuccessTicketId(data.ticketId);
      setFormData((prev) => ({
        ...prev,
        subject: "",
        message: "",
      }));
      setImageUrl("");
      setErrors({});
      addToast(`Support Ticket #${data.ticketId} created!`, "success");

      if (user?.uid && unlockAchievement) {
        await unlockAchievement(user.uid, "first_ticket", "Reporter", "Filed your first support ticket!");
      }
    } catch (err) {
      console.error(err);
      addToast(err.message || "Failed to send message. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ANONYMOUS TICKET TRACKING SEARCH (For Guest Users) */
  const handleTrackTicket = async (e) => {
    e.preventDefault();
    if (!trackId.trim() || !trackEmail.trim()) {
      addToast("Please fill in both Ticket ID and Email.", "warning");
      return;
    }

    try {
      setTrackingLoading(true);
      setTrackingError("");
      setTrackedTicket(null);

      const docRef = doc(db, "contacts", trackId.trim());
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.email.toLowerCase() === trackEmail.trim().toLowerCase()) {
          setTrackedTicket({ id: docSnap.id, ...data });
        } else {
          setTrackingError("Email address does not match this Ticket ID.");
        }
      } else {
        setTrackingError("Ticket ID not found. Please check your CS number.");
      }
    } catch (err) {
      console.error(err);
      setTrackingError("Error retrieving ticket details. Verify ID and connection.");
    } finally {
      setTrackingLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-white px-4 md:px-10 lg:px-16 py-10 relative overflow-hidden text-left max-w-5xl mx-auto">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(0,212,255,0.14),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(255,174,51,0.12),_transparent_28%)]" />
      
      <div className="relative z-10 space-y-8">
        
        {/* HEADER */}
        <div>
          <p className="admin-kicker text-cyan-300">Chakradhar Stream Helpdesk</p>
          <h1 className="admin-title text-3xl md:text-5xl font-black">Contact & Support Desk</h1>
          <p className="admin-lead text-gray-300 text-sm mt-2">
            Have questions, feedback, or issues? File a ticket below or review your raised support tickets in real-time.
          </p>
        </div>

        {/* SECTION 1: LOGGED-IN USER'S RAISED SUPPORT TICKETS */}
        {user ? (
          <div className="glass-card rounded-[2rem] p-6 md:p-8 space-y-4 border border-cyan-500/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                  <ShieldCheckIcon className="w-4 h-4 text-cyan-400" /> Authenticated Support Portal
                </span>
                <h2 className="text-xl font-bold text-white">Your Raised Support Tickets</h2>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
                {myTickets.length} Tickets Filed
              </span>
            </div>

            {ticketsLoading ? (
              <div className="p-6 text-center text-xs text-gray-400">Loading your support tickets...</div>
            ) : myTickets.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400 border border-dashed border-white/10 rounded-2xl">
                You haven&apos;t filed any support tickets yet. Use the form below to file a ticket!
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {myTickets.map((t) => {
                  const status = t.messageStatus || "New";
                  const dateStr = t.createdAt ? new Date(t.createdAt.toDate ? t.createdAt.toDate() : t.createdAt).toLocaleString() : "";

                  return (
                    <div key={t.id} className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-black text-cyan-300">Ticket #{t.ticketId || t.id}</span>
                            <span className="text-xs font-bold text-white">{t.subject || "Support Inquiry"}</span>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-0.5">Submitted: {dateStr}</p>
                        </div>

                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border w-fit ${
                          status === "Replied"
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                            : status === "Pending" || status === "In Progress"
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                            : "bg-blue-500/20 text-blue-300 border-blue-500/30"
                        }`}>
                          {status === "Replied" ? "🟢 Agent Replied" : status === "Pending" ? "🟡 Under Review" : "🔵 New Ticket"}
                        </span>
                      </div>

                      <div className="text-xs text-gray-300 bg-white/5 p-3 rounded-xl">
                        <p className="font-bold text-gray-400 text-[10px] uppercase mb-1">Your Issue:</p>
                        <p className="whitespace-pre-wrap leading-relaxed">{t.message}</p>
                        {t.imageUrl && (
                          <div className="mt-2 pt-2 border-t border-white/5">
                            <a href={t.imageUrl} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline font-bold">
                              Inspect Attached Screenshot Document
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Official Agent Responses */}
                      {t.replies && t.replies.length > 0 ? (
                        <div className="space-y-2 pt-2">
                          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Official Responses ({t.replies.length})</p>
                          {t.replies.map((r, i) => (
                            <div key={i} className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs space-y-1">
                              <div className="flex justify-between text-[10px] text-emerald-300 font-bold">
                                <span>Agent ({r.repliedBy?.split("@")[0] || "Support"})</span>
                                <span>{r.repliedAt ? new Date(r.repliedAt).toLocaleString() : ""}</span>
                              </div>
                              <p className="text-gray-200 whitespace-pre-wrap">{r.content}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-gray-500 font-medium">Our team is reviewing your ticket and will update you shortly.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* ANONYMOUS GUEST SEARCH BAR */
          <div className="glass-card rounded-[2rem] p-6 md:p-8 space-y-6">
            <p className="admin-kicker mb-1 text-cyan-300">Track Complaints</p>
            <h2 className="text-2xl font-black text-white">Search Ticket Status</h2>
            <p className="text-gray-300 text-xs leading-relaxed">
              Enter your Ticket ID (e.g. <strong>CS184920</strong>) and registered email address to check response status.
            </p>

            <form onSubmit={handleTrackTicket} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Ticket ID</label>
                <input
                  type="text"
                  placeholder="e.g. CS184920"
                  value={trackId}
                  onChange={(e) => setTrackId(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
              
              <div className="md:col-span-5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Registered Email</label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={trackEmail}
                  onChange={(e) => setTrackEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={trackingLoading}
                  className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 transition rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  {trackingLoading ? "Searching..." : "Track Status"}
                </button>
              </div>
            </form>

            {trackingError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl p-4 text-xs font-medium flex items-center gap-2">
                <AlertCircleIcon className="w-4 h-4 text-rose-400" />
                <span>{trackingError}</span>
              </div>
            )}

            {trackedTicket && (
              <div className="bg-black/40 border border-white/10 rounded-2xl p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-white/10 pb-3">
                  <div>
                    <h4 className="font-bold text-sm text-cyan-300">Ticket #{trackedTicket.ticketId || trackedTicket.id}</h4>
                    <p className="text-[10px] text-gray-400">{trackedTicket.subject || "Support Inquiry"}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {trackedTicket.messageStatus || "New"}
                  </span>
                </div>

                <div className="text-xs text-gray-300 whitespace-pre-wrap bg-white/5 p-3 rounded-xl">
                  {trackedTicket.message}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SECTION 2: COMPLAINT SUBMISSION FORM */}
        <div className="glass-card rounded-[2rem] p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 border-b border-white/10 pb-4">
            <div>
              <p className="admin-kicker mb-1 text-cyan-300">New Support Request</p>
              <h2 className="text-2xl md:text-3xl font-black text-white">File a Complaint / Inquiry</h2>
            </div>

            {user && (
              <div className="px-3 py-1.5 bg-cyan-500/10 border border-cyan-400/30 rounded-xl text-xs text-cyan-300 flex items-center gap-1.5 w-fit">
                <UserIcon className="w-4 h-4 text-cyan-400" />
                <span>Signed in as <strong>{user.email}</strong></span>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Full Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your name"
                error={errors.name}
                required
                disabled={Boolean(user)}
              />

              <FormInput
                label="Email Address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                error={errors.email}
                required
                disabled={Boolean(user)}
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider font-bold text-gray-300 mb-1.5">
                Subject / Issue Topic <span className="text-red-400">*</span>
              </label>
              <select
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-zinc-900 border border-white/20 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                required
              >
                <option value="">-- Select Issue Topic --</option>
                <option value="Billing & Subscription">Billing & Subscription Query</option>
                <option value="Playback / Video Loading">Video Playback & Buffering Issue</option>
                <option value="Account & Login Security">Account & Login Security</option>
                <option value="Feature Request & Feedback">Feature Request & Feedback</option>
                <option value="Other Support Inquiry">Other Support Inquiry</option>
              </select>
              {errors.subject && <p className="text-xs text-red-400 mt-1">{errors.subject}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs uppercase tracking-wider font-bold text-gray-300">
                Message / Issue Description <span className="text-red-400">*</span>
              </label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="Describe your issue or feedback in detail..."
                rows="5"
                className={`
                  w-full px-4 py-3 bg-white/5 border rounded-xl text-xs text-white placeholder-gray-500 
                  transition duration-200 resize-none focus:outline-none focus:ring-2 focus:bg-white/10
                  ${errors.message ? "border-red-500 focus:ring-red-500" : "border-white/20 focus:ring-cyan-500"}
                `}
              />
              {errors.message && <p className="text-xs text-red-400">{errors.message}</p>}
            </div>

            {/* SCREENSHOT UPLOAD ELEMENT */}
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider font-bold text-gray-300">
                Attach Screenshot regarding the issue (Optional)
              </label>
              
              <div className="flex items-center gap-4">
                <label className="cursor-pointer px-4 py-2.5 bg-white/5 border border-white/20 hover:bg-white/10 hover:border-cyan-500/40 rounded-xl text-xs font-semibold transition flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                  <span>{uploading ? "Uploading Image..." : "Choose Image File"}</span>
                </label>

                {imageUrl && (
                  <div className="flex items-center gap-2 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-3 py-2 rounded-xl">
                    <span>Screenshot attached!</span>
                    <button
                      type="button"
                      onClick={() => setImageUrl("")}
                      className="text-emerald-400 hover:text-emerald-200 font-bold ml-1"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="full"
              loading={loading}
              disabled={uploading}
            >
              Submit Support Ticket
            </Button>
          </form>
        </div>

        <div className="glass-card rounded-2xl p-5 text-xs text-gray-300 space-y-3 relative z-10 border border-white/10">
          <div className="flex items-center gap-3">
            <MailIcon className="w-5 h-5 text-cyan-400 shrink-0" />
            <p>thefifthagefilms@gmail.com</p>
          </div>
          <div className="flex items-center gap-3">
            <ClockIcon className="w-5 h-5 text-cyan-400 shrink-0" />
            <p>Response within 24 hours</p>
          </div>
        </div>

      </div>

      {/* COMPLAINT SUBMIT SUCCESS MODAL */}
      <AnimatePresence>
        {successTicketId && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[110] p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0b1329] border border-white/15 rounded-3xl p-6 w-full max-w-md space-y-6 text-center shadow-2xl"
            >
              <div className="w-16 h-16 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 mx-auto flex items-center justify-center">
                <CheckCircleIcon className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-white">Support Ticket Filed!</h3>
              
              <div className="space-y-2">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Your Unique Ticket ID</p>
                <div className="bg-black/60 border border-cyan-500/40 rounded-2xl p-4 font-mono text-cyan-300 font-black text-xl tracking-wider select-all">
                  {successTicketId}
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-3.5 text-xs text-amber-200/90 leading-relaxed">
                Your ticket is now live in your account support history above. Support agents will review and reply to your ticket shortly.
              </div>

              <button
                onClick={() => setSuccessTicketId(null)}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 transition rounded-2xl text-xs font-black uppercase tracking-wider"
              >
                Close & View Ticket Status
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
