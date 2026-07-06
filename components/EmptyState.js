"use client";

import { motion } from "framer-motion";
import {
  WarningIcon,
  SearchIcon,
  MovieIcon,
  SparklesIcon,
  PopcornIcon
} from "@/components/Icon";

function EmojiToIcon({ emoji }) {
  if (!emoji) return <WarningIcon className="w-12 h-12 text-cyan-500/60 mx-auto" />;
  if (typeof emoji !== "string") return emoji;

  switch (emoji.trim()) {
    case "🔍":
    case "🔎":
      return <SearchIcon className="w-12 h-12 text-cyan-400 mx-auto" />;
    case "❌":
      return <WarningIcon className="w-12 h-12 text-rose-500/80 mx-auto" />;
    case "🎬":
      return <MovieIcon className="w-12 h-12 text-cyan-400 mx-auto" />;
    case "✨":
      return <SparklesIcon className="w-12 h-12 text-yellow-400 mx-auto" />;
    case "🍿":
      return <PopcornIcon className="w-12 h-12 text-cyan-400 mx-auto" />;
    default:
      return <WarningIcon className="w-12 h-12 text-cyan-500/60 mx-auto" />;
  }
}

export default function EmptyState({
  title = "No items found",
  description = "Try adjusting your filters or search terms.",
  icon = null,
  action = null,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      <div className="mb-4">
        <EmojiToIcon emoji={icon} />
      </div>
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
