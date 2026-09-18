"use client";

import { motion } from "framer-motion";

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  className = "",
  ...props
}) {
  const variants = {
    primary:
      "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-[0_4px_20px_rgba(229,9,20,0.35)] hover:shadow-[0_6px_25px_rgba(229,9,20,0.5)] border border-red-500/40",
    secondary:
      "bg-white/10 hover:bg-white/15 text-white border border-white/15 hover:border-white/25 backdrop-blur-md",
    danger:
      "bg-rose-600/90 hover:bg-rose-600 text-white shadow-[0_4px_16px_rgba(244,63,94,0.3)] border border-rose-500/40",
    success:
      "bg-emerald-600/90 hover:bg-emerald-600 text-white shadow-[0_4px_16px_rgba(16,185,129,0.3)] border border-emerald-500/40",
    ghost:
      "text-gray-300 hover:text-white hover:bg-white/10 transition-colors",
    glass:
      "bg-black/40 hover:bg-black/60 text-white border border-white/20 backdrop-blur-xl shadow-lg",
  };

  const sizes = {
    sm: "px-3.5 py-1.5 text-xs font-semibold rounded-lg",
    md: "px-5 py-2.5 text-sm font-semibold rounded-xl",
    lg: "px-7 py-3.5 text-base font-bold rounded-2xl",
    full: "w-full px-5 py-3 text-sm font-semibold rounded-xl",
  };

  const baseClass =
    "font-medium transition-all duration-200 inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none";

  return (
    <motion.button
      whileHover={disabled || loading ? {} : { scale: 1.02 }}
      whileTap={disabled || loading ? {} : { scale: 0.97 }}
      disabled={disabled || loading}
      className={`${baseClass} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {loading && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-4 h-4 border-2 border-current border-t-transparent rounded-full shrink-0"
        />
      )}
      {!loading && children}
      {loading && <span className="opacity-0 absolute">{children}</span>}
    </motion.button>
  );
}
