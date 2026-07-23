"use client";

import { useState } from "react";
import { auth } from "@/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { motion } from "framer-motion";
import {
  FingerprintIcon,
  AuthenticatorIcon,
  MailIcon,
  ShieldCheckIcon,
  AlertCircleIcon,
  CheckCircleIcon,
} from "@/components/Icon";

export default function AdminLogin() {
  const [step, setStep] = useState(1); // 1: Email + Password, 2: 2FA Selector
  const [activeTab, setActiveTab] = useState("passkey"); // "passkey" | "totp" | "otp"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [adminRole, setAdminRole] = useState("sub_admin");
  const [twoFactorData, setTwoFactorData] = useState({ totpEnabled: false, passkeysCount: 0 });

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

  const sendEmailOtp = async (targetEmail) => {
    const res = await fetch("/api/send-otp", {
      method: "POST",
      body: JSON.stringify({ email: targetEmail }),
      headers: { "Content-Type": "application/json" },
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || "Failed to send Email OTP");
    }

    startCooldown(30);
    setMessage("6-digit verification code sent to your email.");
  };

  /* Step 1: Validate Email & Password -> fetch 2FA options */
  const handleInitialLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setMessage("");

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMsg("Please enter your email address.");
      return;
    }

    try {
      setLoading(true);

      // 1. Pre-validate authorized email
      const validateRes = await fetch("/api/admin/validate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const validateData = await validateRes.json();
      if (!validateData.allowed) {
        setErrorMsg(validateData.error || "Unauthorized: Only approved administrators can access this portal.");
        return;
      }

      setAdminRole(validateData.role || "sub_admin");

      // 2. Authenticate Password with Firebase Auth
      await signInWithEmailAndPassword(auth, cleanEmail, password);

      // 3. Fetch 2FA methods enabled for account
      const methodsRes = await fetch("/api/admin/2fa/methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });

      if (methodsRes.ok) {
        const mData = await methodsRes.json();
        setTwoFactorData(mData);
        if (mData.passkeysCount > 0) {
          setActiveTab("passkey");
        } else if (mData.totpEnabled) {
          setActiveTab("totp");
        } else {
          setActiveTab("otp");
          await sendEmailOtp(cleanEmail);
        }
      } else {
        setActiveTab("otp");
        await sendEmailOtp(cleanEmail);
      }

      setStep(2);
    } catch (error) {
      const code = error.code || "";
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setErrorMsg("Incorrect password. Please try again.");
      } else if (code === "auth/user-not-found") {
        setErrorMsg("No account found for this email. Please check with your administrator.");
      } else if (code === "auth/too-many-requests") {
        setErrorMsg("Too many failed attempts. Please try again later.");
      } else {
        setErrorMsg(error.message || "Authentication failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  /* Method A: Biometric Passkey 1-Click Login */
  const handlePasskeyLogin = async () => {
    if (typeof window === "undefined" || !navigator.credentials || !window.PublicKeyCredential) {
      setErrorMsg("Passkeys / WebAuthn are not supported on this browser.");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");
      const cleanEmail = email.trim().toLowerCase();

      const optionsRes = await fetch("/api/admin/2fa/passkey/authenticate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const optionsData = await optionsRes.json();
      if (!optionsRes.ok) {
        setErrorMsg(optionsData.error || "Failed to initialize Passkey login.");
        return;
      }

      const options = optionsData.options;
      options.challenge = Buffer.from(options.challenge, "base64");
      if (options.allowCredentials) {
        options.allowCredentials = options.allowCredentials.map((c) => ({
          ...c,
          id: Buffer.from(c.id, "base64"),
        }));
      }

      const assertion = await navigator.credentials.get({ publicKey: options });
      if (!assertion) {
        setErrorMsg("Passkey authentication cancelled.");
        return;
      }

      const credentialPayload = {
        id: assertion.id,
        rawId: Buffer.from(assertion.rawId).toString("base64"),
        type: assertion.type,
        response: {
          clientDataJSON: Buffer.from(assertion.response.clientDataJSON).toString("base64"),
          authenticatorData: Buffer.from(assertion.response.authenticatorData).toString("base64"),
          signature: Buffer.from(assertion.response.signature).toString("base64"),
          userHandle: assertion.response.userHandle ? Buffer.from(assertion.response.userHandle).toString("base64") : null,
        },
      };

      const verifyRes = await fetch("/api/admin/2fa/passkey/authenticate", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, credentialPayload }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        setErrorMsg(verifyData.error || "Passkey verification failed.");
        return;
      }

      window.location.replace(verifyData.redirect || (adminRole === "sub_admin" ? "/sub-admin" : "/admin"));
    } catch (err) {
      setErrorMsg("Passkey authentication failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  /* Method B: Google Authenticator 6-Digit TOTP */
  const handleTotpLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setMessage("");

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = totpCode.trim();

    if (cleanCode.length !== 6) {
      setErrorMsg("Please enter 6-digit Authenticator code.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/admin/2fa/totp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, code: cleanCode }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        window.location.replace(data.redirect || (adminRole === "sub_admin" ? "/sub-admin" : "/admin"));
      } else {
        setErrorMsg(data.error || "Invalid Authenticator code. Please check your app timer.");
      }
    } catch (err) {
      setErrorMsg("TOTP verification failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  /* Method C: Email OTP Verification */
  const handleVerifyEmailOtp = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setMessage("");

    try {
      setLoading(true);
      const res = await fetch("/api/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (data.success) {
        window.location.replace(adminRole === "sub_admin" ? "/sub-admin" : "/admin");
      } else {
        setErrorMsg(data.error || "Invalid or expired OTP. Please try again.");
      }
    } catch (error) {
      setErrorMsg(error.message || "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-page relative min-h-screen flex items-center justify-center px-4 py-10 text-white overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(0,212,255,0.18),_transparent_38%),radial-gradient(circle_at_top_right,_rgba(255,77,141,0.12),_transparent_30%),linear-gradient(180deg,rgba(5,7,13,0.65),rgba(5,7,13,0.95))]" />

      <div className="relative z-10 w-full max-w-6xl grid lg:grid-cols-[1.05fr_0.95fr] gap-6 items-stretch">
        {/* LEFT PANEL */}
        <div className="admin-surface rounded-[2rem] p-6 md:p-10 flex flex-col justify-between min-h-[480px]">
          <div className="space-y-5">
            <p className="admin-kicker text-cyan-300">Version 3.1 Security Suite</p>
            <h1 className="admin-title text-3xl md:text-4xl lg:text-5xl">
              Multi-Factor Authentication & Passkeys Control Room.
            </h1>
            <p className="admin-lead text-sm md:text-base">
              Authenticate seamlessly using Mobile Fingerprint, Laptop Touch ID, Google Authenticator, or Instant Email OTP verification.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 md:gap-3 mt-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="font-semibold text-xs text-cyan-300 flex items-center gap-1">
                <FingerprintIcon className="w-3.5 h-3.5" /> 1-Click
              </p>
              <p className="text-[10px] text-gray-400 mt-1">Biometric Passkeys</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="font-semibold text-xs text-amber-300 flex items-center gap-1">
                <AuthenticatorIcon className="w-3.5 h-3.5" /> TOTP 2FA
              </p>
              <p className="text-[10px] text-gray-400 mt-1">Google Authenticator</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="font-semibold text-xs text-green-300 flex items-center gap-1">
                <MailIcon className="w-3.5 h-3.5" /> Email OTP
              </p>
              <p className="text-[10px] text-gray-400 mt-1">Instant Code</p>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL — Multi-Mode Login Form */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="admin-surface rounded-[2rem] p-6 md:p-8 shadow-xl w-full max-w-xl mx-auto lg:mx-0 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <p className="admin-kicker mb-1 text-cyan-300">Unified Portal Entry</p>
                <h2 className="text-2xl md:text-3xl font-black tracking-tight">
                  {step === 1 ? "Sign in to Portal" : "Multi-Factor Verification"}
                </h2>
              </div>

              <div className="admin-chip">
                Step {step} of 2
              </div>
            </div>

            {/* Success message */}
            {message && (
              <div className="mb-5 rounded-2xl border border-cyan-300/30 bg-cyan-500/10 p-3.5 text-xs text-cyan-200 flex items-center gap-2">
                <CheckCircleIcon className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>{message}</span>
              </div>
            )}

            {/* Error message */}
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-200 flex items-center gap-2"
              >
                <AlertCircleIcon className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </motion.div>
            )}

            {/* STEP 1: Email & Password */}
            {step === 1 && (
              <form onSubmit={handleInitialLogin} className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-[0.22em] text-gray-400 mb-2">Admin Email</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    disabled={loading}
                    onChange={(e) => { setEmail(e.target.value); setErrorMsg(""); }}
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
                    onChange={(e) => { setPassword(e.target.value); setErrorMsg(""); }}
                    className="admin-input focus-ring"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="admin-button admin-button-primary w-full mt-4 disabled:opacity-70"
                >
                  {loading ? "Verifying Credentials..." : "Continue to 2FA Step →"}
                </button>
              </form>
            )}

            {/* STEP 2: Multi-Factor Authentication Selector */}
            {step === 2 && (
              <div className="space-y-5">
                {/* 2FA TAB SELECTOR */}
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-black/40 border border-white/10 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => { setActiveTab("passkey"); setErrorMsg(""); }}
                    className={`py-2 px-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                      activeTab === "passkey"
                        ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <FingerprintIcon className="w-3.5 h-3.5" />
                    <span>Passkey</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setActiveTab("totp"); setErrorMsg(""); }}
                    className={`py-2 px-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                      activeTab === "totp"
                        ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <AuthenticatorIcon className="w-3.5 h-3.5" />
                    <span>Google App</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      setActiveTab("otp");
                      setErrorMsg("");
                      if (!message) await sendEmailOtp(email.trim().toLowerCase());
                    }}
                    className={`py-2 px-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                      activeTab === "otp"
                        ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <MailIcon className="w-3.5 h-3.5" />
                    <span>Email OTP</span>
                  </button>
                </div>

                {/* TAB 1: PASSKEY 1-CLICK BIOMETRIC */}
                {activeTab === "passkey" && (
                  <div className="space-y-4 text-center py-2">
                    <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400 shadow-xl">
                      <FingerprintIcon className="w-8 h-8" />
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-white">Biometric Passkey Authentication</h3>
                      <p className="text-xs text-gray-400">
                        Use Fingerprint, Face ID, Touch ID, or Windows Hello for instant 1-click verification.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handlePasskeyLogin}
                      disabled={loading}
                      className="admin-button bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black uppercase text-xs py-3 px-6 rounded-2xl w-full flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                    >
                      <ShieldCheckIcon className="w-4 h-4" />
                      <span>{loading ? "Authenticating Passkey..." : "Authenticate with Device Passkey"}</span>
                    </button>
                  </div>
                )}

                {/* TAB 2: GOOGLE AUTHENTICATOR TOTP */}
                {activeTab === "totp" && (
                  <form onSubmit={handleTotpLogin} className="space-y-4">
                    <div>
                      <label className="block text-xs uppercase tracking-[0.22em] text-amber-400 mb-2">Google Authenticator Code</label>
                      <input
                        type="text"
                        maxLength={6}
                        required
                        placeholder="000000"
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="admin-input focus-ring text-center text-xl font-mono tracking-widest text-amber-300"
                      />
                    </div>

                    <p className="text-xs text-gray-400">Enter the rolling 6-digit verification code from your Google Authenticator or Authy app.</p>

                    <button
                      type="submit"
                      disabled={loading}
                      className="admin-button bg-gradient-to-r from-amber-500 to-orange-600 text-black font-black uppercase text-xs py-3 px-6 rounded-2xl w-full disabled:opacity-50"
                    >
                      {loading ? "Verifying Code..." : "Verify Authenticator Code"}
                    </button>
                  </form>
                )}

                {/* TAB 3: EMAIL OTP */}
                {activeTab === "otp" && (
                  <form onSubmit={handleVerifyEmailOtp} className="space-y-4">
                    <div>
                      <label className="block text-xs uppercase tracking-[0.22em] text-gray-400 mb-2">Email OTP Code</label>
                      <input
                        type="text"
                        placeholder="000000"
                        maxLength={6}
                        value={otp}
                        disabled={loading}
                        onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); setErrorMsg(""); }}
                        className="admin-input focus-ring text-center tracking-[0.4em] text-lg font-mono text-cyan-300"
                        required
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>Verification code sent to {email}</span>
                      <button
                        type="button"
                        disabled={cooldown > 0 || loading}
                        onClick={() => sendEmailOtp(email.trim().toLowerCase())}
                        className="text-cyan-300 hover:text-cyan-200 transition disabled:opacity-50"
                      >
                        {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="admin-button admin-button-primary w-full disabled:opacity-50"
                    >
                      {loading ? "Verifying..." : "Verify Email OTP"}
                    </button>
                  </form>
                )}

                <button
                  type="button"
                  onClick={() => { setStep(1); setOtp(""); setTotpCode(""); setMessage(""); setErrorMsg(""); }}
                  className="w-full text-center text-xs text-gray-400 mt-2 hover:text-white transition"
                >
                  ← Back to Email Sign In
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {loading && (
        <div className="absolute inset-0 bg-black/65 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="admin-panel rounded-3xl px-6 py-5 text-center max-w-sm w-full">
            <div className="mx-auto mb-4 h-10 w-10 rounded-full border-4 border-cyan-400/30 border-t-cyan-400 animate-spin" />
            <p className="font-semibold text-white">Validating Security Assertion</p>
            <p className="text-xs text-gray-400 mt-1">Please complete device authentication prompt.</p>
          </div>
        </div>
      )}
    </div>
  );
}
