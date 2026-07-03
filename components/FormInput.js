"use client";

import { motion } from "framer-motion";

export default function FormInput({
  label,
  error,
  success,
  hint,
  icon,
  required = false,
  ...props
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-gray-300">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}

        <input
          className={`
            w-full px-${icon ? "10" : "4"} py-2.5 bg-white/5 border rounded-lg 
            text-white placeholder-gray-500 transition duration-200
            focus:outline-none focus:ring-2 focus:ring-offset-0 focus:bg-white/10
            ${
              error
                ? "border-red-500 focus:ring-red-500"
                : success
                  ? "border-green-500 focus:ring-green-500"
                  : "border-white/20 focus:ring-blue-500"
            }
            ${props.disabled ? "opacity-50 cursor-not-allowed" : ""}
          `}
          {...props}
        />

        {success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400 text-lg"
          >
            ✓
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400 text-lg"
          >
            ✕
          </motion.div>
        )}
      </div>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-red-400"
        >
          {error}
        </motion.p>
      )}

      {hint && !error && (
        <p className="text-xs text-gray-500">{hint}</p>
      )}
    </div>
  );
}
