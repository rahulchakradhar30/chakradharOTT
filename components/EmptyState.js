"use client";

import { motion } from "framer-motion";

export default function EmptyState({
  title = "No items found",
  description = "Try adjusting your filters or search terms.",
  icon = "📭",
  action = null,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400 text-center max-w-sm mb-6">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition"
        >
          {action.label}
        </button>
      )}
    </motion.div>
  );
}
