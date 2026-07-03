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
    primary: "bg-blue-600 hover:bg-blue-700 text-white border border-blue-500/50",
    secondary:
      "bg-white/10 hover:bg-white/20 text-white border border-white/20",
    danger: "bg-red-600 hover:bg-red-700 text-white border border-red-500/50",
    success:
      "bg-green-600 hover:bg-green-700 text-white border border-green-500/50",
    ghost: "text-gray-300 hover:text-white hover:bg-white/5",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm rounded-lg",
    md: "px-4 py-2.5 text-sm rounded-lg",
    lg: "px-6 py-3 text-base rounded-xl",
    full: "w-full px-4 py-2.5 rounded-lg",
  };

  const baseClass =
    "font-medium transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      disabled={disabled || loading}
      className={`${baseClass} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
        />
      )}
      {!loading && children}
      {loading && <span className="opacity-0">{children}</span>}
    </motion.button>
  );
}
