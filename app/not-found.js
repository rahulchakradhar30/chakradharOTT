"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-[#04070f] to-[#0b1328]">
      <div className="text-center max-w-md">
        <div className="text-7xl font-black mb-6 bg-gradient-to-r from-cyan-400 to-blue-500 text-transparent bg-clip-text">
          404
        </div>
        <h1 className="text-3xl font-black text-white mb-3">Page not found</h1>
        <p className="text-gray-400 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved. Check the URL and try again.
        </p>
        <div className="flex gap-4 flex-col sm:flex-row">
          <Link
            href="/"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition text-center"
          >
            Go Home
          </Link>
          <Link
            href="/movies"
            className="flex-1 bg-white/10 hover:bg-white/20 text-white font-medium py-3 rounded-lg transition text-center"
          >
            Browse Movies
          </Link>
        </div>
      </div>
    </div>
  );
}
