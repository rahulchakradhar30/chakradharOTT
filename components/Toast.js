"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
    <div className="fixed bottom-6 right-6 z-[9999] max-w-sm pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onRemove={onRemove} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function Toast({ toast, onRemove }) {
  const bgColor = {
    success: "bg-green-600",
    error: "bg-red-600",
    warning: "bg-amber-600",
    info: "bg-blue-600",
  }[toast.type] || "bg-gray-600";

  const icon = {
    success: "✓",
    error: "✕",
    warning: "⚠",
    info: "ℹ",
  }[toast.type] || "•";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, x: 100 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, y: -20, x: 100 }}
      transition={{ duration: 0.3 }}
      className="pointer-events-auto mb-3"
    >
      <div
        className={`${bgColor} text-white px-4 py-3 rounded-lg flex items-center gap-3 shadow-lg border border-white/10 cursor-pointer`}
        onClick={() => onRemove(toast.id)}
      >
        <span className="text-lg font-bold">{icon}</span>
        <p className="text-sm flex-1">{toast.message}</p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(toast.id);
          }}
          className="text-white/70 hover:text-white transition"
        >
          ✕
        </button>
      </div>
    </motion.div>
  );
}
