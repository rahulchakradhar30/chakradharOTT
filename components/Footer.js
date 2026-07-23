"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { MailIcon, SendIcon, CheckCircleIcon, StarIcon } from "@/components/Icon";

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
    <footer className="mt-16 border-t border-white/10 bg-[#0f0f0f] text-sm relative z-10">
      <div className="max-w-7xl mx-auto px-4 md:px-10 py-12 space-y-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Left section containing brand, links, and support */}
          <div className="lg:col-span-7 grid md:grid-cols-3 gap-8 text-center md:text-left">
            <div className="space-y-3">
              <h2 className="text-white font-black text-xl tracking-tight">
                CHAKRADHAR STREAM
              </h2>
              <p className="text-xs text-gray-400 max-w-sm leading-relaxed">
                Premium movies, limited-run premieres, and cinematic storytelling crafted for modern audiences.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 text-gray-300 text-xs">
              <span className="text-xs uppercase tracking-[0.2em] text-gray-400 font-bold mb-1">Navigation</span>
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
              <span className="text-xs uppercase tracking-[0.2em] text-gray-400 font-bold">Support</span>
              <p className="text-sm font-semibold text-white">
                thefifthagefilms@gmail.com
              </p>
              <p className="text-xs text-gray-500">Response within 24 hours</p>
            </div>
          </div>

          {/* Right section containing Native Instant Feedback Form */}
          <div className="lg:col-span-5">
            <div className="bg-[#212121] border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/30 text-red-500 flex items-center justify-center">
                  <StarIcon className="w-4 h-4 text-red-500" />
                </div>
                <h3 className="text-white font-bold text-base tracking-tight">
                  Share Your Experience
                </h3>
              </div>

              <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                Help us improve Chakradhar Stream with your thoughts & feedback.
              </p>

              {submitted ? (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5 text-center space-y-2 animate-fadeIn">
                  <CheckCircleIcon className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="font-bold text-sm text-white">Thank You for Your Feedback!</p>
                  <p className="text-xs text-emerald-300/90">Your response has been sent directly to our development team.</p>
                  <button
                    type="button"
                    onClick={() => setSubmitted(false)}
                    className="mt-2 text-xs text-gray-400 hover:text-white underline"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleFeedbackSubmit} className="space-y-3">
                  {!user && (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Your Name (Optional)"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 bg-[#181818] border border-white/10 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                      />
                      <input
                        type="email"
                        placeholder="Your Email (Optional)"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-[#181818] border border-white/10 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                      />
                    </div>
                  )}

                  <textarea
                    rows={3}
                    required
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Tell us what features or movies you would like to see..."
                    className="w-full px-3 py-2 bg-[#181818] border border-white/10 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500 resize-none"
                  />

                  {error && <p className="text-xs text-rose-400">{error}</p>}

                  <button
                    type="submit"
                    disabled={loading || !feedback.trim()}
                    className="w-full py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:opacity-90 transition rounded-lg text-xs font-bold text-white uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <SendIcon className="w-3.5 h-3.5" />
                    <span>{loading ? "Sending..." : "Submit Feedback"}</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-5 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} Chakradhar STREAM Platform • Created by Rahul Chakradhar & The Fifth Age Films Productions • Version 3.2.0
        </div>
      </div>
    </footer>
  );
}
