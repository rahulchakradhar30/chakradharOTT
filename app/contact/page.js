"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import FormInput from "@/components/FormInput";
import Button from "@/components/Button";
import { useToast } from "@/components/Toast";

export default function ContactPage() {
  const { addToast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Validate form
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
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

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
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to send message");
      }

      addToast("Message sent successfully! We'll get back to you soon.", "success");
      setFormData({ name: "", email: "", message: "" });
      setErrors({});
    } catch (err) {
      console.error(err);
      addToast(err.message || "Failed to send message. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-white px-4 md:px-10 lg:px-16 py-10 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(0,212,255,0.14),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(255,174,51,0.12),_transparent_28%)]" />
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 max-w-3xl mx-auto space-y-8"
      >
        <div className="glass-card rounded-[2rem] p-6 md:p-8">
          <p className="admin-kicker mb-2">Support</p>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight">
            Contact Us
          </h1>

          <p className="text-gray-300 text-sm mt-3">
            Have questions, feedback, or collaboration ideas? We&apos;d love to hear from you.
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
                Message <span className="text-red-400">*</span>
              </label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="Tell us what's on your mind..."
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

            <Button
              type="submit"
              variant="primary"
              size="full"
              loading={loading}
            >
              Send Message
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
            Your message helps us improve the platform. Thank you for reaching out!
          </p>
        </div>

      </motion.div>
    </div>
  );
}