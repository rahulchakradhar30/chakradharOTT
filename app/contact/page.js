"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FormInput from "@/components/FormInput";
import Button from "@/components/Button";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function ContactPage() {
  const { addToast } = useToast();
  const { user, unlockAchievement } = useAuth();
  
  // Complaint submission form states
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [successTicketId, setSuccessTicketId] = useState(null);

  // Ticket Tracking states
  const [trackId, setTrackId] = useState("");
  const [trackEmail, setTrackEmail] = useState("");
  const [trackedTicket, setTrackedTicket] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState("");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.message.trim()) {
      newErrors.message = "Message is required";
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
          headers: {
            "Content-Type": "application/json",
          },
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
      setFormData({ name: "", email: "", message: "" });
      setImageUrl("");
      setErrors({});
      addToast("Complaint filed successfully!", "success");

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

  /* ANONYMOUS TICKET TRACKING SEARCH */
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
        setTrackingError("Ticket ID not found.");
      }
    } catch (err) {
      console.error(err);
      setTrackingError("Error retrieving ticket details. Verify ID and connection.");
    } finally {
      setTrackingLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-white px-4 md:px-10 lg:px-16 py-10 relative overflow-hidden text-left">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(0,212,255,0.14),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(255,174,51,0.12),_transparent_28%)]" />
      
      <div className="relative z-10 max-w-3xl mx-auto space-y-8">
        
        {/* SECTION 1: ANONYMOUS TICKET TRACKING SEARCH */}
        <div className="glass-card rounded-[2rem] p-6 md:p-8 space-y-6">
          <p className="admin-kicker mb-2">Track Complaints</p>
          <h2 className="text-2xl md:text-3xl font-black">Search Ticket Status</h2>
          <p className="text-gray-300 text-xs leading-relaxed">
            Enter your Unique Ticket ID and registered email address to view updates, logs, and answers from our support agents.
          </p>

          <form onSubmit={handleTrackTicket} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Ticket ID</label>
              <input
                type="text"
                placeholder="e.g. Vpv5hAZHPUuBr8Bzd0e7"
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

          {/* Ticket Search Results Output */}
          {trackingError && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl p-4 text-xs font-medium">
              ⚠ {trackingError}
            </div>
          )}

          {trackedTicket && (
            <div className="bg-[#0b1328]/40 border border-white/10 rounded-2xl p-5 space-y-4 animate-fadeIn">
              <div className="flex flex-wrap justify-between items-center gap-3 border-b border-white/5 pb-3">
                <div>
                  <h4 className="font-bold text-sm text-cyan-300">Ticket #{trackedTicket.id}</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Submitted: {trackedTicket.createdAt ? new Date(trackedTicket.createdAt.toDate ? trackedTicket.createdAt.toDate() : trackedTicket.createdAt).toLocaleString() : "Date not available"}
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                  (trackedTicket.messageStatus || "New") === "New"
                    ? "border-blue-500/20 bg-blue-500/10 text-blue-400"
                    : (trackedTicket.messageStatus || "New") === "Pending"
                    ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                    : (trackedTicket.messageStatus || "New") === "Replied"
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                    : "border-gray-500/20 bg-gray-500/10 text-gray-400"
                }`}>
                  {trackedTicket.messageStatus || "New"}
                </span>
              </div>

              {/* Inquiry details */}
              <div className="space-y-3">
                <div className="bg-black/20 p-3.5 rounded-xl border border-white/5 text-xs text-gray-200">
                  <p className="font-bold text-gray-400 mb-1">Your Complaint:</p>
                  <p className="whitespace-pre-wrap leading-relaxed">{trackedTicket.message}</p>
                  {trackedTicket.imageUrl && (
                    <div className="mt-3">
                      <a href={trackedTicket.imageUrl} target="_blank" rel="noreferrer" className="text-cyan-400 underline hover:text-cyan-300">
                        View Attached Image 📎
                      </a>
                    </div>
                  )}
                </div>

                {/* Admin Support replies (excluding internal notes!) */}
                {trackedTicket.replies && trackedTicket.replies.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-[10px] uppercase tracking-wider font-black text-gray-500">Official Responses</p>
                    {trackedTicket.replies.map((reply, i) => (
                      <div key={i} className="bg-emerald-500/5 border border-emerald-500/15 p-3.5 rounded-xl text-xs">
                        <div className="flex justify-between items-center text-[10px] text-emerald-400 font-bold mb-1.5">
                          <span>AGENT RESPONSE ({reply.repliedBy?.split("@")[0] || "Support"})</span>
                          <span>{reply.repliedAt ? new Date(reply.repliedAt).toLocaleString() : ""}</span>
                        </div>
                        <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{reply.content}</p>
                        
                        {reply.attachments && reply.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-white/5">
                            {reply.attachments.map((att, attIdx) => (
                              <a
                                key={attIdx}
                                href={att.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold bg-white/5 px-2 py-0.5 rounded border border-white/10"
                              >
                                📎 {att.name}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-2 text-xs text-gray-500 font-semibold">
                    No answers received yet. Our team will update you shortly.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: COMPLAINT SUBMISSION FORM */}
        <div className="glass-card rounded-[2rem] p-6 md:p-8">
          <p className="admin-kicker mb-2">Support</p>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight">
            Contact Us
          </h1>
          <p className="text-gray-300 text-sm mt-3">
            Have questions, feedback, or bugs to report? File a complaint below along with screenshots.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <FormInput
              label="Full Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your name"
              error={errors.name}
              required
              icon="👤"
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
              icon="📧"
            />

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-300">
                Message / Issue Description <span className="text-red-400">*</span>
              </label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="Describe your issue or feedback in detail..."
                rows="5"
                className={`
                  w-full px-4 py-3 bg-white/5 border rounded-lg text-white placeholder-gray-500 
                  transition duration-200 resize-none
                  focus:outline-none focus:ring-2 focus:ring-offset-0 focus:bg-white/10
                  ${
                    errors.message
                      ? "border-red-500 focus:ring-red-500"
                      : "border-white/20 focus:ring-blue-500"
                  }
                `}
              />
              {errors.message && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-red-400"
                >
                  {errors.message}
                </motion.p>
              )}
            </div>

            {/* SCREENSHOT UPLOAD ELEMENT */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Upload Screenshot regarding the issue (Optional)
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
                  {uploading ? "Uploading Image..." : "📎 Choose Image File"}
                </label>

                {imageUrl && (
                  <div className="flex items-center gap-2 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-3 py-2 rounded-xl">
                    <span>File attached successfully!</span>
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
              Submit Complaint
            </Button>
          </form>
        </div>

        <div className="glass-card rounded-2xl p-5 text-sm text-gray-300 space-y-3 relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-lg">📧</span>
            <p>thefifthagefilms@gmail.com</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">⏱️</span>
            <p>Response within 24 hours</p>
          </div>
          <div className="h-px bg-white/10 my-3" />
          <p className="text-xs text-gray-500">
            Your ticket ID is stored in your profile page under Support Tickets for easy reference.
          </p>
        </div>

      </div>

      {/* COMPLAINT SUBMIT SUCCESS MODAL */}
      <AnimatePresence>
        {successTicketId && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card w-full max-w-md p-6 border border-white/10 space-y-6 text-center"
            >
              <span className="text-5xl">🎉</span>
              <h3 className="text-2xl font-black text-white">Complaint Registered!</h3>
              
              <div className="space-y-2">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Unique Ticket ID</p>
                <div className="bg-black/35 border border-cyan-500/30 rounded-xl p-4 font-mono text-cyan-300 font-black text-sm select-all">
                  {successTicketId}
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-3.5 text-xs text-amber-200/90 leading-relaxed">
                ⚠ **Please take a screenshot of this ID now!** You can use this ID to track ticket updates anonymously or view it later in your profile.
              </div>

              <button
                onClick={() => setSuccessTicketId(null)}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 transition rounded-xl text-xs font-black uppercase tracking-wider"
              >
                Got It
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}