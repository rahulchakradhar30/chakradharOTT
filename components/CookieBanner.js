"use client";

import { useEffect, useState } from "react";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // delay state update to avoid sync setState warning
    const timer = setTimeout(() => {
      const accepted = localStorage.getItem("cookieAccepted");
      if (!accepted) {
        setVisible(true);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookieAccepted", "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 w-full z-50 bg-[#050a18]/90 backdrop-blur-xl border-t border-white/10">
      <div className="max-w-6xl mx-auto px-4 md:px-10 py-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <p className="text-xs md:text-sm text-gray-300 text-center md:text-left">
          We use cookies to enhance your experience and improve our platform.
        </p>

        <button
          onClick={handleAccept}
          className="focus-ring bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition"
        >
          Accept
        </button>
      </div>
    </div>
  );
}