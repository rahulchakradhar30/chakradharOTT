"use client";

import { useState } from "react";
import { auth } from "@/firebase";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { motion } from "framer-motion";

export default function AdminLogin() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState("");

  const allowedEmails = [
    "thefifthagefilms@gmail.com",
    "rahulchakradharperepogu@gmail.com",
  ];

  const startCooldown = (seconds) => {
    setCooldown(seconds);
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const sendOtp = async () => {
    const res = await fetch("/api/send-otp", {
      method: "POST",
      body: JSON.stringify({ email }),
      headers: { "Content-Type": "application/json" },
    });

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || "Failed to send OTP");
    }

    startCooldown(30);
    setMessage("OTP sent to your admin email.");
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();

    if (!allowedEmails.includes(email.trim().toLowerCase())) {
      alert("Unauthorized email.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      await signInWithEmailAndPassword(auth, email, password);
      await sendOtp();

      setStep(2);
    } catch (error) {
      alert(error.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setMessage("");

      const res = await fetch("/api/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email, otp }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (data.success) {
        await new Promise((resolve) => setTimeout(resolve, 150));
        window.location.replace("/admin");
      } else {
        setMessage("Invalid or expired OTP. Please try again.");
      }
    } catch (error) {
      setMessage(error.message || "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      alert("Enter your email first.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Password reset link sent.");
    } catch (error) {
      alert(error.message || "Failed to send reset email.");
    }
  };

  return (
    <div className="admin-page relative min-h-screen flex items-center justify-center px-4 py-10 text-white overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(0,212,255,0.18),_transparent_38%),radial-gradient(circle_at_top_right,_rgba(255,77,141,0.12),_transparent_30%),linear-gradient(180deg,rgba(5,7,13,0.65),rgba(5,7,13,0.95))]" />

      <div className="relative z-10 w-full max-w-6xl grid lg:grid-cols-[1.05fr_0.95fr] gap-6 items-stretch">
        <div className="admin-surface rounded-[2rem] p-8 md:p-10 flex flex-col justify-between min-h-[520px]">
          <div className="space-y-5">
            <p className="admin-kicker">Admin Portal</p>
            <h1 className="admin-title max-w-lg">A focused control room for publishing, live events, and support.</h1>
            <p className="admin-lead">Sign in with an approved admin account and step through password plus OTP verification. The flow is intentionally short, secure, and designed to land you in the dashboard without a second thought.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 mt-8">
            {[
              ["Secure", "OTP-gated access"],
              ["Fast", "Direct dashboard entry"],
              ["Clear", "No extra distractions"],
            ].map(([title, text]) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-semibold">{title}</p>
                <p className="text-xs text-gray-400 mt-1">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <motion.form
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          onSubmit={step === 1 ? handlePasswordLogin : handleVerifyOtp}
          className="admin-surface rounded-[2rem] p-6 md:p-8 shadow-xl w-full max-w-xl mx-auto lg:mx-0"
        >
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <p className="admin-kicker mb-2">Secure Access</p>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight">
                {step === 1 ? "Sign in" : "Verify OTP"}
              </h2>
            </div>

            <div className="admin-chip">
              Step {step} of 2
            </div>
          </div>

          {message ? (
            <div className="mb-5 rounded-2xl border border-cyan-300/30 bg-cyan-500/10 p-4 text-sm text-cyan-100">
              {message}
            </div>
          ) : null}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-[0.22em] text-gray-400 mb-2">Admin Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  disabled={loading}
                  onChange={(e) => setEmail(e.target.value)}
                  className="admin-input focus-ring"
                  required
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-[0.22em] text-gray-400 mb-2">Password</label>
                <input
                  type="password"
                  placeholder="Your admin password"
                  value={password}
                  disabled={loading}
                  onChange={(e) => setPassword(e.target.value)}
                  className="admin-input focus-ring"
                  required
                />
              </div>

              <div className="flex items-center justify-between gap-4 pt-1">
                <p className="text-xs text-gray-400">Only approved admin emails can continue.</p>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-cyan-300 hover:text-cyan-200 transition"
                >
                  Forgot password?
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-[0.22em] text-gray-400 mb-2">OTP Code</label>
                <input
                  type="text"
                  placeholder="000000"
                  value={otp}
                  disabled={loading}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="admin-input focus-ring text-center tracking-[0.4em] text-lg"
                  required
                />
              </div>

              <div className="flex items-center justify-between gap-4 text-xs text-gray-400">
                <span>We sent a one-time code to your admin email.</span>
                <button
                  type="button"
                  disabled={cooldown > 0 || loading}
                  onClick={async () => {
                    try {
                      setLoading(true);
                      await sendOtp();
                    } catch (error) {
                      setMessage(error.message || "Failed to resend OTP");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="text-cyan-300 hover:text-cyan-200 transition disabled:opacity-50"
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="admin-button admin-button-primary w-full mt-6 disabled:opacity-70"
          >
            {loading ? "Processing..." : step === 1 ? "Continue" : "Verify OTP"}
          </button>
        </motion.form>
      </div>

      {loading && (
        <div className="absolute inset-0 bg-black/65 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="admin-panel rounded-3xl px-6 py-5 text-center max-w-sm w-full">
            <div className="mx-auto mb-4 h-10 w-10 rounded-full border-4 border-cyan-400/30 border-t-cyan-400 animate-spin" />
            <p className="font-semibold">Securing session</p>
            <p className="text-sm text-gray-400 mt-1">Please wait while we verify your access.</p>
          </div>
        </div>
      )}
    </div>
  );
}
