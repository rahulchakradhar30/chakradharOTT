"use client";

import { useState } from "react";
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
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

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
      await registerWithEmail(formData.email, formData.password);
      addToast("Account created successfully! Logging you in...", "success");
      
      // Auto login after registration
      await loginWithEmail(formData.email, formData.password);
      router.push("/");
    } catch (err) {
      const errorMessage = err.message || "Authentication failed";
      addToast(errorMessage, "error");
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
          className="mb-3 bg-white text-black hover:bg-white/90"
        >
          🔐 Continue with Google
        </Button>

        <Button
          onClick={handleDemoLogin}
          disabled={loading}
          variant="secondary"
          size="full"
          className="mb-5 bg-gradient-to-r from-cyan-600/20 via-blue-600/25 to-pink-600/20 text-cyan-300 font-bold border border-cyan-400/30 hover:border-cyan-400/50"
        >
          🧪 Use Demo Guest Account (Bypass Auth)
        </Button>

        <div className="text-center text-gray-400 mb-5 text-sm font-medium">or continue with email</div>

        {message ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-xl border border-cyan-300/30 bg-cyan-500/10 p-3 text-sm text-cyan-100 flex items-start gap-2"
          >
            <span className="mt-0.5">ℹ️</span>
            <span>{message}</span>
          </motion.div>
        ) : null}

        <form onSubmit={handleEmailAuth} className="space-y-5">
          <FormInput
            label="Email Address"
            name="email"
            type="email"
            placeholder="your@email.com"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            disabled={loading}
            icon="📧"
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
            icon="🔒"
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
