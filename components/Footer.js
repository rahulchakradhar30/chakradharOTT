"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Star, Send, CheckCircle2, Mail } from "lucide-react";

export default function Footer() {
  const pathname = usePathname();
  const { user } = useAuth();

  const [feedback, setFeedback] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      setEmail(user.email || "");
      setName(user.displayName || user.email?.split("@")[0] || "");
    }
  }, [user]);

  // Hide Footer on all /admin and /sub-admin routes
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/sub-admin")) {
    return null;
  }

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!feedback.trim()) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || "Platform Viewer",
          email: email.trim() || "feedback@viewer.com",
          subject: "Platform Experience & Feedback",
          message: feedback.trim(),
          userId: user?.uid || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to send feedback");
      }

      setSubmitted(true);
      setFeedback("");
    } catch (err) {
      console.warn("Feedback submission error:", err);
      setError("Failed to send feedback. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="mt-20 border-t border-white/[0.08] bg-[#07090e]/90 backdrop-blur-2xl text-sm relative z-10 select-none">
      {/* Top accent glow line */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Left section containing brand, links, and support */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center sm:text-left">
            <div className="space-y-3.5">
              <div className="flex items-center justify-center sm:justify-start gap-2.5">
                <Image
                  src="/apple-touch-icon.png"
                  alt="Chakradhar Stream Logo"
                  width={34}
                  height={34}
                  className="w-8 h-8 rounded-xl object-cover border border-red-500/30 shadow-md shadow-red-500/20"
                />
                <h2 className="text-white font-black text-lg tracking-tight">
                  CHAKRADHAR STREAM
                </h2>
              </div>
              <p className="text-xs text-gray-400 max-w-sm leading-relaxed">
                Premium movies, limited-run premieres, and cinematic storytelling crafted for modern audiences.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 text-gray-300 text-xs">
              <span className="text-[11px] uppercase tracking-[0.2em] text-red-400 font-black mb-1">
                Navigation
              </span>
              <Link href="/movies" className="hover:text-red-400 transition-colors">
                Browse Movies
              </Link>
              <Link href="/terms" className="hover:text-red-400 transition-colors">
                Terms & Conditions
              </Link>
              <Link href="/privacy" className="hover:text-red-400 transition-colors">
                Privacy Policy
              </Link>
              <Link href="/contact" className="hover:text-red-400 transition-colors">
                Support & Contact
              </Link>
            </div>

            <div className="space-y-2.5 text-gray-300 text-xs">
              <span className="text-[11px] uppercase tracking-[0.2em] text-red-400 font-black">
                Support
              </span>
              <p className="text-xs sm:text-sm font-bold text-white break-all">
                thefifthagefilms@gmail.com
              </p>
              <p className="text-xs text-gray-400">Response within 24 hours</p>
            </div>
          </div>

          {/* Right section containing Native Instant Feedback Form */}
          <div className="lg:col-span-5">
            <div className="glass-card rounded-3xl p-6 sm:p-7 border border-white/[0.08] shadow-2xl relative overflow-hidden">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-xl bg-red-600/20 border border-red-500/30 text-red-500 flex items-center justify-center">
                  <Star className="w-4 h-4 text-red-400 fill-current" />
                </div>
                <h3 className="text-white font-black text-base tracking-tight">
                  Share Your Experience
                </h3>
              </div>

              <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                Help us improve Chakradhar Stream with your thoughts & feedback.
              </p>

              {submitted ? (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 text-center space-y-2 animate-fadeIn">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="font-bold text-sm text-white">Thank You for Your Feedback!</p>
                  <p className="text-xs text-emerald-300/90">Your response has been sent directly to our development team.</p>
                  <button
                    type="button"
                    onClick={() => setSubmitted(false)}
                    className="mt-2 text-xs text-gray-400 hover:text-white underline cursor-pointer"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleFeedbackSubmit} className="space-y-3">
                  {!user && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Your Name (Optional)"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                      />
                      <input
                        type="email"
                        placeholder="Your Email (Optional)"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                      />
                    </div>
                  )}

                  <textarea
                    rows={3}
                    required
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Tell us what features or movies you would like to see..."
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500 resize-none leading-relaxed"
                  />

                  {error && <p className="text-xs text-rose-400">{error}</p>}

                  <button
                    type="submit"
                    disabled={loading || !feedback.trim()}
                    className="w-full py-2.5 btn-luxury-primary rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{loading ? "Sending..." : "Submit Feedback"}</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-white/[0.08] pt-6 text-center text-xs text-gray-400 leading-relaxed font-normal">
          © {new Date().getFullYear()} Chakradhar STREAM Platform • Created by Rahul Chakradhar & The Fifth Age Films Productions • Version 3.2.0
        </div>
      </div>
    </footer>
  );
}
