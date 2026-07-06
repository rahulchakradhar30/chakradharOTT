"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import FormInput from "@/components/FormInput";
import Button from "@/components/Button";
import { useToast } from "@/components/Toast";

export default function LoginPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const {
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
    resetPassword,
  } = useAuth();

  const searchParams = useSearchParams();
  const redirectUrl = searchParams?.get("redirect") || "/";

  const [mode, setMode] = useState("login");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    dob: "",
    captchaInput: "",
  });
  const [otpValue, setOtpValue] = useState("");
  const [captchaCode, setCaptchaCode] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const generateCaptcha = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaCode(code);
  };

  useEffect(() => {
    generateCaptcha();
  }, [mode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (formData.captchaInput.toUpperCase() !== captchaCode) {
      newErrors.captchaInput = "Verification code does not match";
    }

    if (mode === "register") {
      if (!formData.firstName.trim()) {
        newErrors.firstName = "First name is required";
      }
      if (!formData.lastName.trim()) {
        newErrors.lastName = "Last name is required";
      }
      if (!formData.dob) {
        newErrors.dob = "Date of birth is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGoogle = async () => {
    try {
      setLoading(true);
      await loginWithGoogle();
      addToast("Logged in successfully!", "success");
      router.push(redirectUrl);
    } catch (err) {
      addToast(err.message || "Google sign-in failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();

    const emailKey = formData.email.trim().toLowerCase();
    const localLock = JSON.parse(localStorage.getItem(`login_lock_${emailKey}`) || '{"attempts":0,"lockedUntil":0}');
    
    // Check account lockout
    if (localLock.lockedUntil > Date.now()) {
      const minutesLeft = Math.ceil((localLock.lockedUntil - Date.now()) / (60 * 1000));
      addToast(`Account temporarily locked. Try again in ${minutesLeft} minutes.`, "error");
      return;
    }

    if (!validateForm()) {
      addToast("Please fix the errors in the form", "warning");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      if (mode === "login") {
        await loginWithEmail(formData.email, formData.password);
        
        // Reset failures on login success
        localStorage.removeItem(`login_lock_${emailKey}`);
        
        addToast("Logged in successfully!", "success");
        router.push(redirectUrl);
        return;
      }

      // Registration - Send OTP
      const res = await fetch("/api/auth/send-signup-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to send OTP");
      }
      
      addToast("Verification code sent to your email", "success");
      setMode("otp");
    } catch (err) {
      let errorMessage = "Authentication failed. Please try again.";
      const errorCode = err.code || "";
      
      if (mode === "login") {
        // Record lockout increments
        const newAttempts = localLock.attempts + 1;
        const newLock = {
          attempts: newAttempts,
          lockedUntil: newAttempts >= 5 ? Date.now() + 15 * 60 * 1000 : 0
        };
        localStorage.setItem(`login_lock_${emailKey}`, JSON.stringify(newLock));

        if (newAttempts >= 5) {
          errorMessage = "Too many failed attempts. Your account has been locked for 15 minutes.";
        } else {
          errorMessage = `Incorrect email or password. Attempt ${newAttempts} of 5 before lockout.`;
        }
      }

      if (errorCode === "auth/user-not-found" || err.message?.includes("auth/user-not-found")) {
        errorMessage = "This email is not registered. Please sign up first.";
      } else if (errorCode === "auth/wrong-password" || err.message?.includes("auth/wrong-password") || errorCode === "auth/invalid-credential" || err.message?.includes("auth/invalid-credential")) {
        // Kept within rate-limiter logic above
      } else if (errorCode === "auth/email-already-in-use" || err.message?.includes("auth/email-already-in-use")) {
        errorMessage = "This email is already registered. Please sign in instead.";
      } else if (errorCode === "auth/network-request-failed" || err.message?.includes("auth/network-request-failed")) {
        errorMessage = "Network error. Please check your internet connection.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      addToast(errorMessage, "error");
      
      // Force regeneration of CAPTCHA on failure
      generateCaptcha();
      setFormData((prev) => ({ ...prev, captchaInput: "" }));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      addToast("Enter your email first", "warning");
      return;
    }

    try {
      await resetPassword(formData.email);
      addToast("Password reset link sent to your email", "success");
      setMessage("Check your email for the password reset link.");
    } catch (err) {
      addToast(err.message || "Failed to send reset email", "error");
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpValue || otpValue.length < 6) {
      addToast("Enter a valid 6-digit OTP", "warning");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/auth/verify-signup-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, otp: otpValue }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Invalid verification code");
      }
      
      // OTP verified successfully, proceed with registration
      await registerWithEmail(formData.email, formData.password, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        dob: formData.dob,
      });
      
      addToast("Account created successfully! Logging you in...", "success");
      
      // Auto login after registration
      await loginWithEmail(formData.email, formData.password);
      router.push(redirectUrl);
    } catch (err) {
      addToast(err.message || "Verification failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 text-white text-left">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(0,212,255,0.18),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(255,77,141,0.12),_transparent_30%)]" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative z-10 w-full max-w-md glass-card rounded-[2rem] p-6 md:p-8 shadow-2xl"
      >
        <p className="admin-kicker mb-2">Chakradhar Stream</p>
        <h1 className="text-3xl font-black mb-6 tracking-tight">
          {mode === "login" ? "Welcome Back" : mode === "register" ? "Create Account" : "Verify Email"}
        </h1>

        {mode !== "otp" && (
          <>
            <div className="grid grid-cols-1 gap-3 mb-5">
              <Button
                onClick={handleGoogle}
                disabled={loading}
                variant="secondary"
                className="bg-white text-black hover:bg-white/90 text-xs font-bold py-3"
              >
                Google
              </Button>
            </div>

            <div className="text-center text-gray-400 mb-5 text-xs font-bold uppercase tracking-wider">or continue with email</div>
          </>
        )}

        {message ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-xl border border-cyan-300/30 bg-cyan-500/10 p-3 text-sm text-cyan-100 flex items-start gap-2"
          >
            <span>{message}</span>
          </motion.div>
        ) : null}

        {mode === "otp" ? (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="admin-panel p-4 rounded-2xl bg-zinc-950 border border-white/10 space-y-3">
              <p className="text-sm text-gray-300">
                We sent a 6-digit verification code to <strong className="text-cyan-300">{formData.email}</strong>.
              </p>
              <FormInput
                label="Verification Code"
                name="otp"
                type="text"
                placeholder="123456"
                value={otpValue}
                onChange={(e) => setOtpValue(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="full"
              loading={loading}
              disabled={loading}
            >
              Verify & Create Account
            </Button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className="text-sm text-gray-400 mt-4 block mx-auto hover:text-white transition font-medium"
            >
              ← Back to Registration
            </button>
          </form>
        ) : (
          <>
            <form onSubmit={handleEmailAuth} className="space-y-5">
          {mode === "register" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  label="First Name"
                  name="firstName"
                  type="text"
                  placeholder="First name"
                  value={formData.firstName}
                  onChange={handleChange}
                  error={errors.firstName}
                  disabled={loading}
                  required
                />
                <FormInput
                  label="Last Name"
                  name="lastName"
                  type="text"
                  placeholder="Last name"
                  value={formData.lastName}
                  onChange={handleChange}
                  error={errors.lastName}
                  disabled={loading}
                  required
                />
              </div>

              <FormInput
                label="Date of Birth"
                name="dob"
                type="date"
                value={formData.dob}
                onChange={handleChange}
                error={errors.dob}
                disabled={loading}
                required
              />
            </>
          )}

          <FormInput
            label="Email Address"
            name="email"
            type="email"
            placeholder="your@email.com"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            disabled={loading}
            required
          />

          <FormInput
            label="Password"
            name="password"
            type="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            disabled={loading}
            required
          />

          {/* Bot Check Captcha for BOTH Login and Registration */}
          <div className="admin-panel p-4 rounded-2xl bg-zinc-950 border border-white/10 space-y-3">
            <label className="block text-[10px] uppercase tracking-[0.18em] text-gray-400 font-black">
              Bot Verification
            </label>
            <div className="flex items-center justify-between gap-4">
              <div 
                className="flex-1 bg-gradient-to-r from-cyan-900 to-blue-900 text-cyan-200 py-3 rounded-xl text-center font-mono tracking-[0.4em] font-extrabold select-none border border-cyan-400/20 text-lg shadow-inner"
                style={{ textShadow: "0px 0px 8px rgba(0, 212, 255, 0.4)" }}
              >
                {captchaCode}
              </div>
              <button
                type="button"
                onClick={generateCaptcha}
                className="p-3 bg-white/5 border border-white/15 rounded-xl hover:bg-white/10 transition text-sm text-cyan-300 font-bold"
                title="Generate new captcha code"
              >
                ↻
              </button>
            </div>
            <FormInput
              label="Type the code above"
              name="captchaInput"
              type="text"
              placeholder="Verification code"
              value={formData.captchaInput}
              onChange={handleChange}
              error={errors.captchaInput}
              disabled={loading}
              required
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="full"
            loading={loading}
            disabled={loading}
          >
            {mode === "login" ? "Sign In" : "Create Account"}
          </Button>
        </form>

        {mode === "login" ? (
          <button
            type="button"
            onClick={handleForgotPassword}
            className="text-sm text-gray-300 mt-4 block mx-auto hover:text-cyan-300 transition font-medium"
          >
            Forgot your password?
          </button>
        ) : null}
          </>
        )}

        {mode !== "otp" && (
          <div className="mt-6 text-center text-sm text-gray-300">
            {mode === "login" ? (
              <>
                New here?{" "}
                <button
                  onClick={() => setMode("register")}
                  className="text-white underline font-bold"
                >
                  Create account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => setMode("login")}
                  className="text-white underline font-bold"
                >
                  Login
                </button>
              </>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
