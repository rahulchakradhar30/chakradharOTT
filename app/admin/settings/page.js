"use client";

import { useEffect, useState, useCallback } from "react";
import {
  FingerprintIcon,
  AuthenticatorIcon,
  ShieldCheckIcon,
  QrCodeIcon,
  PlusIcon,
  CheckCircleIcon,
  AlertCircleIcon,
} from "@/components/Icon";

export default function AdminSettings() {
  const [session, setSession] = useState(null);
  const [securityData, setSecurityData] = useState({ totpEnabled: false, passkeysCount: 0, passkeys: [] });
  const [loading, setLoading] = useState(true);

  // Setup Authenticator Modal State
  const [showTotpModal, setShowTotpModal] = useState(false);
  const [totpSetupData, setTotpSetupData] = useState(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [enablingTotp, setEnablingTotp] = useState(false);

  // Passkey Registration State
  const [registeringPasskey, setRegisteringPasskey] = useState(false);

  // Alert Message State
  const [alertMsg, setAlertMsg] = useState({ text: "", type: "" });

  const showAlert = (text, type = "success") => {
    setAlertMsg({ text, type });
    setTimeout(() => setAlertMsg({ text: "", type: "" }), 5000);
  };

  const loadSecurityDetails = useCallback(async (email) => {
    try {
      const res = await fetch("/api/admin/2fa/methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        const d = await res.json();
        setSecurityData(d);
      }
    } catch (err) {
      console.warn("Error loading security details:", err);
    }
  }, []);

  useEffect(() => {
    fetch("/api/admin/session")
      .then((r) => r.json())
      .then((data) => {
        setSession(data);
        if (data.email) loadSecurityDetails(data.email);
      })
      .catch((e) => console.warn(e))
      .finally(() => setLoading(false));
  }, [loadSecurityDetails]);

  /* ── 1. Setup Google Authenticator App ── */
  const handleStartTotpSetup = async () => {
    try {
      setEnablingTotp(true);
      const res = await fetch("/api/admin/2fa/totp/setup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        showAlert(data.error || "Failed to generate Authenticator secret.", "error");
        return;
      }

      setTotpSetupData(data);
      setShowTotpModal(true);
    } catch (err) {
      showAlert("Error initializing Authenticator setup: " + err.message, "error");
    } finally {
      setEnablingTotp(false);
    }
  };

  const handleVerifyAndEnableTotp = async (e) => {
    e.preventDefault();
    if (!verifyCode || verifyCode.trim().length !== 6) {
      showAlert("Please enter the 6-digit code from Google Authenticator.", "error");
      return;
    }

    try {
      setEnablingTotp(true);
      const res = await fetch("/api/admin/2fa/totp/setup", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: totpSetupData.secret,
          code: verifyCode.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showAlert(data.error || "Verification failed.", "error");
        return;
      }

      showAlert("Google Authenticator 2FA enabled successfully!");
      setShowTotpModal(false);
      setVerifyCode("");
      if (session?.email) loadSecurityDetails(session.email);
    } catch (err) {
      showAlert("Error verifying code: " + err.message, "error");
    } finally {
      setEnablingTotp(false);
    }
  };

  /* ── 2. Register WebAuthn Biometric Passkey ── */
  const handleRegisterPasskey = async () => {
    if (typeof window === "undefined" || !navigator.credentials || !window.PublicKeyCredential) {
      showAlert("Passkeys / WebAuthn are not supported on this browser.", "error");
      return;
    }

    try {
      setRegisteringPasskey(true);
      const challengeRes = await fetch("/api/admin/2fa/passkey/register", { method: "POST" });
      const challengeData = await challengeRes.json();

      if (!challengeRes.ok) {
        showAlert(challengeData.error || "Failed to initialize Passkey creation.", "error");
        return;
      }

      const options = challengeData.options;
      options.challenge = Buffer.from(options.challenge, "base64");
      options.user.id = Buffer.from(options.user.id, "base64");

      const credential = await navigator.credentials.create({ publicKey: options });
      if (!credential) {
        showAlert("Passkey creation cancelled by user.", "error");
        return;
      }

      const credentialPayload = {
        id: credential.id,
        rawId: Buffer.from(credential.rawId).toString("base64"),
        type: credential.type,
        response: {
          clientDataJSON: Buffer.from(credential.response.clientDataJSON).toString("base64"),
          attestationObject: Buffer.from(credential.response.attestationObject).toString("base64"),
        },
      };

      const verifyRes = await fetch("/api/admin/2fa/passkey/register", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentialPayload),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        showAlert(verifyData.error || "Passkey registration failed.", "error");
        return;
      }

      showAlert("Passkey / Biometric device registered successfully!");
      if (session?.email) loadSecurityDetails(session.email);
    } catch (err) {
      showAlert("Passkey registration failed or cancelled: " + err.message, "error");
    } finally {
      setRegisteringPasskey(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* HEADER */}
      <div>
        <p className="admin-kicker text-cyan-300">Root & Super Admin Security Control</p>
        <h1 className="admin-title flex items-center gap-2">
          <ShieldCheckIcon className="w-8 h-8 text-cyan-400" />
          <span>Super Admin Security & Passkeys Desk (Version 3.1)</span>
        </h1>
        <p className="admin-lead">Configure Google Authenticator and Mobile / Laptop Biometric Passkeys for 1-click admin authentication.</p>
      </div>

      {/* NOTIFICATION ALERT */}
      {alertMsg.text && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center gap-3 ${
            alertMsg.type === "error"
              ? "bg-rose-500/10 border-rose-500/30 text-rose-200"
              : "bg-cyan-500/10 border-cyan-500/30 text-cyan-200"
          }`}
        >
          {alertMsg.type === "error" ? <AlertCircleIcon className="w-4 h-4 text-rose-400" /> : <CheckCircleIcon className="w-4 h-4 text-cyan-400" />}
          <span>{alertMsg.text}</span>
        </div>
      )}

      {/* SECURITY CONTROL DESK GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* METHOD 1: PASSKEYS / BIOMETRICS */}
        <div className="p-6 rounded-3xl bg-black/40 border border-white/10 hover:border-cyan-500/30 transition space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <FingerprintIcon className="w-4 h-4 text-cyan-400" /> Passkey & Biometric 1-Click Login
              </span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                {securityData.passkeysCount} Registered
              </span>
            </div>

            <h2 className="text-lg font-bold text-white">Mobile Fingerprint / Laptop TouchID</h2>
            <p className="text-xs text-gray-400 leading-relaxed">
              Log in instantly with 1-click using your device biometrics (Fingerprint, Touch ID, Face ID, Windows Hello, or Hardware Security Key).
            </p>

            {securityData.passkeys && securityData.passkeys.length > 0 && (
              <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-xs space-y-2">
                <p className="font-bold text-gray-300 uppercase text-[10px]">Registered Credentials</p>
                {securityData.passkeys.map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between text-gray-400 text-[11px] font-mono">
                    <span>Key #{i + 1} ({p.id.slice(0, 12)}...)</span>
                    <span className="text-emerald-400 font-bold">Active</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleRegisterPasskey}
            disabled={registeringPasskey}
            className="admin-button bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold uppercase py-3 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50"
          >
            <PlusIcon className="w-4 h-4" />
            <span>{registeringPasskey ? "Registering Passkey..." : "Register Mobile / Laptop Passkey"}</span>
          </button>
        </div>

        {/* METHOD 2: GOOGLE AUTHENTICATOR (TOTP) */}
        <div className="p-6 rounded-3xl bg-black/40 border border-white/10 hover:border-cyan-500/30 transition space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <AuthenticatorIcon className="w-4 h-4 text-amber-400" /> Google Authenticator 2FA
              </span>
              {securityData.totpEnabled ? (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-green-500/20 text-green-300 font-bold border border-green-500/30">
                  Active & Enabled
                </span>
              ) : (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  Not Configured
                </span>
              )}
            </div>

            <h2 className="text-lg font-bold text-white">Time-based One-Time Password (TOTP)</h2>
            <p className="text-xs text-gray-400 leading-relaxed">
              Generate rolling 6-digit verification codes using Google Authenticator, Authy, or Microsoft Authenticator apps.
            </p>
          </div>

          <button
            onClick={handleStartTotpSetup}
            disabled={enablingTotp}
            className="admin-button bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase py-3 px-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <QrCodeIcon className="w-4 h-4 text-amber-400" />
            <span>{securityData.totpEnabled ? "Reconfigure Authenticator App" : "Set Up Google Authenticator"}</span>
          </button>
        </div>
      </div>

      {/* SETUP GOOGLE AUTHENTICATOR MODAL */}
      {showTotpModal && totpSetupData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#0b1329] border border-white/15 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <QrCodeIcon className="w-5 h-5 text-amber-400" />
                <span>Set Up Google Authenticator</span>
              </h3>
              <button onClick={() => setShowTotpModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs text-gray-300">
              <p>1. Open <strong>Google Authenticator</strong> or <strong>Authy</strong> app on your mobile device.</p>
              <p>2. Tap <strong>+</strong> and scan the secret or enter the Secret Key manually:</p>

              <div className="p-3 bg-black/60 rounded-2xl border border-white/10 font-mono text-center text-cyan-300 text-sm font-bold tracking-wider select-all">
                {totpSetupData.secret}
              </div>

              <p className="pt-2">3. Enter the 6-digit code shown in your Authenticator app to complete setup:</p>

              <form onSubmit={handleVerifyAndEnableTotp} className="space-y-4">
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  placeholder="000000"
                  className="admin-input text-center text-xl font-mono tracking-widest text-cyan-300 bg-black/50"
                />

                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowTotpModal(false)} className="flex-1 py-2.5 bg-white/10 text-gray-300 rounded-xl font-bold">
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={enablingTotp}
                    className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-black font-black uppercase rounded-xl disabled:opacity-50"
                  >
                    {enablingTotp ? "Verifying..." : "Confirm & Enable 2FA"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
