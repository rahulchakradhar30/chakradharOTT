"use client";

import { motion } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import { SparklesIcon } from "@/components/Icon";

export default function AccessibilityPage() {
  const { theme, toggleTheme, accessibility, updateAccessibility } = useTheme();

  return (
    <div className="min-h-screen px-4 md:px-10 lg:px-16 py-10 md:py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header */}
        <div className="mb-12">
          <p className="admin-kicker mb-2">Settings</p>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2">
            Accessibility
          </h1>
          <p className="text-gray-400">Customize your viewing experience</p>
        </div>

        {/* Settings Grid */}
        <div className="max-w-2xl space-y-8">
          {/* Theme Settings */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="glass-card rounded-2xl p-8 border border-white/10"
          >
            <h2 className="text-2xl font-bold mb-6">Theme</h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Dark Mode</p>
                  <p className="text-sm text-gray-400">Easier on the eyes</p>
                </div>
                <button
                  onClick={toggleTheme}
                  className={`relative w-14 h-8 rounded-full transition ${
                    theme === "dark"
                      ? "bg-cyan-500"
                      : "bg-gray-600"
                  }`}
                >
                  <div
                    className={`absolute top-1 w-6 h-6 bg-white rounded-full transition ${
                      theme === "dark" ? "left-1" : "left-7"
                    }`}
                  />
                </button>
              </div>
            </div>
          </motion.section>

          {/* Text Size */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="glass-card rounded-2xl p-8 border border-white/10"
          >
            <h2 className="text-2xl font-bold mb-6">Text Size</h2>

            <div className="space-y-4">
              {["normal", "large", "xlarge"].map((size) => (
                <button
                  key={size}
                  onClick={() => updateAccessibility({ fontSize: size })}
                  className={`w-full p-4 rounded-lg text-left transition ${
                    accessibility.fontSize === size
                      ? "bg-cyan-500/20 border-cyan-400 text-white"
                      : "bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10"
                  }`}
                >
                  <div className={`font-semibold ${
                    size === "normal" ? "text-base" : size === "large" ? "text-lg" : "text-xl"
                  }`}>
                    {size === "normal" ? "Normal" : size === "large" ? "Large" : "Extra Large"}
                  </div>
                  <div className={`text-sm text-gray-400 ${
                    size === "normal" ? "text-xs" : size === "large" ? "text-sm" : "text-base"
                  }`}>
                    {size === "normal"
                      ? "Default text size"
                      : size === "large"
                      ? "20% larger text"
                      : "40% larger text"}
                  </div>
                </button>
              ))}
            </div>
          </motion.section>

          {/* High Contrast */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="glass-card rounded-2xl p-8 border border-white/10"
          >
            <h2 className="text-2xl font-bold mb-6">Visual Enhancements</h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">High Contrast</p>
                  <p className="text-sm text-gray-400">
                    Increases text and element contrast
                  </p>
                </div>
                <button
                  onClick={() =>
                    updateAccessibility({
                      highContrast: !accessibility.highContrast,
                    })
                  }
                  className={`relative w-14 h-8 rounded-full transition ${
                    accessibility.highContrast
                      ? "bg-cyan-500"
                      : "bg-gray-600"
                  }`}
                >
                  <div
                    className={`absolute top-1 w-6 h-6 bg-white rounded-full transition ${
                      accessibility.highContrast ? "left-1" : "left-7"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Reduce Motion</p>
                  <p className="text-sm text-gray-400">
                    Minimizes animations and transitions
                  </p>
                </div>
                <button
                  onClick={() =>
                    updateAccessibility({
                      reduceMotion: !accessibility.reduceMotion,
                    })
                  }
                  className={`relative w-14 h-8 rounded-full transition ${
                    accessibility.reduceMotion
                      ? "bg-cyan-500"
                      : "bg-gray-600"
                  }`}
                >
                  <div
                    className={`absolute top-1 w-6 h-6 bg-white rounded-full transition ${
                      accessibility.reduceMotion ? "left-1" : "left-7"
                    }`}
                  />
                </button>
              </div>
            </div>
          </motion.section>

          {/* Keyboard Navigation */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="glass-card rounded-2xl p-8 border border-white/10"
          >
            <h2 className="text-2xl font-bold mb-6">Keyboard Shortcuts</h2>

            <div className="space-y-3 text-sm">
              {[
                { key: "Tab", description: "Navigate between elements" },
                { key: "Enter", description: "Activate buttons or links" },
                { key: "Space", description: "Play/pause video" },
                { key: "M", description: "Mute/unmute video" },
                { key: "F", description: "Toggle fullscreen" },
                { key: "T", description: "Open accessibility menu" },
              ].map((shortcut, i) => (
                <div key={i} className="flex justify-between py-2 border-b border-white/10">
                  <kbd className="px-3 py-1 rounded bg-white/10 border border-white/20 font-mono">
                    {shortcut.key}
                  </kbd>
                  <span className="text-gray-400">{shortcut.description}</span>
                </div>
              ))}
            </div>
          </motion.section>

          {/* Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6"
          >
            <p className="text-sm text-blue-200 flex items-center gap-1.5">
              <SparklesIcon className="w-4 h-4 text-blue-300" /> <strong>Tip:</strong> Your accessibility preferences are saved
              automatically and will apply across all pages.
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
