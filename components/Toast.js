"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info", duration = 4000) => {
    const id = Date.now();
    const toast = { id, message, type };
    setToasts((prev) => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="fixed bottom-6 right-6 z-[9999] max-w-sm w-full pointer-events-none px-4 sm:px-0">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ toast, onRemove }) {
  const styles = {
    success: {
      border: "border-emerald-500/30",
      glow: "shadow-[0_8px_30px_rgba(16,185,129,0.15)]",
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
      accent: "from-emerald-950/80 to-black/90",
    },
    error: {
      border: "border-rose-500/30",
      glow: "shadow-[0_8px_30px_rgba(244,63,94,0.2)]",
      icon: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
      accent: "from-rose-950/80 to-black/90",
    },
    warning: {
      border: "border-amber-500/30",
      glow: "shadow-[0_8px_30px_rgba(245,158,11,0.15)]",
      icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
      accent: "from-amber-950/80 to-black/90",
    },
    info: {
      border: "border-sky-500/30",
      glow: "shadow-[0_8px_30px_rgba(56,189,248,0.15)]",
      icon: <Info className="w-5 h-5 text-sky-400 shrink-0" />,
      accent: "from-slate-900/90 to-black/90",
    },
  }[toast.type] || {
    border: "border-white/20",
    glow: "shadow-2xl",
    icon: <Info className="w-5 h-5 text-gray-400 shrink-0" />,
    accent: "from-slate-900/90 to-black/90",
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: 15 }}
      transition={{ type: "spring", stiffness: 350, damping: 28 }}
      className="pointer-events-auto mb-3"
    >
      <div
        className={`bg-gradient-to-r ${styles.accent} backdrop-blur-xl border ${styles.border} ${styles.glow} text-white px-4 py-3.5 rounded-2xl flex items-center gap-3.5 cursor-pointer`}
        onClick={() => onRemove(toast.id)}
      >
        {styles.icon}
        <p className="text-xs sm:text-sm font-medium flex-1 text-gray-100 leading-snug">
          {toast.message}
        </p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(toast.id);
          }}
          className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
