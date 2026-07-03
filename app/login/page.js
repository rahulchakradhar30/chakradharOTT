"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { sendEmailVerification } from "firebase/auth";
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
    loginAsDemo,
    resetPassword,
  } = useAuth();

  const [mode, setMode] = useState("login");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    dob: "",
    captchaInput: "",
  });
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
    if (mode === "register") {
      generateCaptcha();
    }
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
      if (formData.captchaInput.toUpperCase() !== captchaCode) {
        newErrors.captchaInput = "Verification code does not match";
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
      router.push("/");
    } catch (err) {
      addToast(err.message || "Google sign-in failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    try {
      setLoading(true);
      loginAsDemo();
      addToast("Welcome back! Logged in as Demo Guest.", "success");
      router.push("/");
    } catch (err) {
      addToast("Demo login failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      addToast("Please fix the errors in the form", "warning");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      if (mode === "login") {
        await loginWithEmail(formData.email, formData.password);
        addToast("Logged in successfully!", "success");
        router.push("/");
        return;
      }

      // Registration
      await registerWithEmail(formData.email, formData.password, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        dob: formData.dob,
      });
      addToast("Account created successfully! Logging you in...", "success");
      
      // Auto login after registration
      await loginWithEmail(formData.email, formData.password);
      router.push("/");
    } catch (err) {
      let errorMessage = "Authentication failed. Please try again.";
      const errorCode = err.code || "";
      
      if (errorCode === "auth/user-not-found" || err.message?.includes("auth/user-not-found")) {
        errorMessage = "This email is not registered. Please sign up first.";
      } else if (errorCode === "auth/wrong-password" || err.message?.includes("auth/wrong-password") || errorCode === "auth/invalid-credential" || err.message?.includes("auth/invalid-credential")) {
        errorMessage = "Incorrect email or password. Please try again.";
      } else if (errorCode === "auth/email-already-in-use" || err.message?.includes("auth/email-already-in-use")) {
        errorMessage = "This email is already registered. Please sign in instead.";
      } else if (errorCode === "auth/network-request-failed" || err.message?.includes("auth/network-request-failed")) {
        errorMessage = "Network error. Please check your internet connection.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      addToast(errorMessage, "error");
      if (mode === "register") {
        generateCaptcha();
      }
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

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(0,212,255,0.18),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(255,77,141,0.12),_transparent_30%)]" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative z-10 w-full max-w-md glass-card rounded-[2rem] p-6 md:p-8 shadow-2xl"
      >
        <p className="admin-kicker mb-2">Chakradhar Stream</p>
        <h1 className="text-3xl font-black mb-6 tracking-tight">
          {mode === "login" ? "Welcome Back" : "Create Account"}
        </h1>

        <Button
          onClick={handleGoogle}
          disabled={loading}
          variant="secondary"
          size="full"
          className="mb-5 bg-white text-black hover:bg-white/90"
        >
          Continue with Google
        </Button>

        <div className="text-center text-gray-400 mb-5 text-sm font-medium">or continue with email</div>

        {message ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-xl border border-cyan-300/30 bg-cyan-500/10 p-3 text-sm text-cyan-100 flex items-start gap-2"
          >
            <span>{message}</span>
          </motion.div>
        ) : null}

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

              {/* Bot Check Captcha */}
              <div className="admin-panel p-4 rounded-2xl bg-zinc-900 border border-white/10 space-y-3">
                <label className="block text-xs uppercase tracking-[0.18em] text-gray-400 font-semibold">
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

        <div className="mt-6 text-center text-sm text-gray-300">
          {mode === "login" ? (
            <>
              New here?{" "}
              <button
                onClick={() => setMode("register")}
                className="text-white underline"
              >
                Create account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={() => setMode("login")}
                className="text-white underline"
              >
                Login
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
