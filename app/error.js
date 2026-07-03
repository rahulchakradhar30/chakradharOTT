"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorBoundary({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-[#04070f] to-[#0b1328]">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">⚠️</div>
        <h1 className="text-3xl font-black text-white mb-3">Something went wrong</h1>
        <p className="text-gray-400 mb-8">
          An unexpected error occurred. Please try again or contact support if the problem persists.
        </p>
        <div className="flex gap-4 flex-col sm:flex-row">
          <button
            onClick={() => reset()}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="flex-1 bg-white/10 hover:bg-white/20 text-white font-medium py-3 rounded-lg transition text-center"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
