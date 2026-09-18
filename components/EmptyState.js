"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  Search,
  Film,
  Sparkles,
  Clapperboard,
} from "lucide-react";
import Button from "@/components/Button";

function EmojiToIcon({ emoji }) {
  if (!emoji) return <AlertTriangle className="w-10 h-10 text-red-500/80 mx-auto" />;
  if (typeof emoji !== "string") return emoji;

  switch (emoji.trim()) {
    case "🔍":
    case "🔎":
      return <Search className="w-10 h-10 text-red-400 mx-auto" />;
    case "❌":
      return <AlertTriangle className="w-10 h-10 text-rose-500/90 mx-auto" />;
    case "🎬":
      return <Film className="w-10 h-10 text-red-400 mx-auto" />;
    case "✨":
      return <Sparkles className="w-10 h-10 text-amber-400 mx-auto" />;
    case "🍿":
      return <Clapperboard className="w-10 h-10 text-red-400 mx-auto" />;
    default:
      return <AlertTriangle className="w-10 h-10 text-red-500/80 mx-auto" />;
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
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-20 px-6 max-w-md mx-auto text-center"
    >
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-red-600/15 blur-2xl rounded-full scale-150" />
        <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-b from-white/10 to-white/5 border border-white/15 flex items-center justify-center backdrop-blur-xl shadow-2xl">
          <EmojiToIcon emoji={icon} />
        </div>
      </div>
      <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-2.5">
        {title}
      </h3>
      <p className="text-gray-400 text-sm leading-relaxed max-w-xs mb-8">
        {description}
      </p>
      {action && (
        <Button
          onClick={action.onClick}
          variant="primary"
          size="md"
        >
          {action.label}
        </Button>
      )}
    </motion.div>
  );
}
