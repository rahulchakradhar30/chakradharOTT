"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-white/10 bg-[#050915]/70 backdrop-blur-xl text-sm">
      <div className="max-w-7xl mx-auto px-4 md:px-10 py-10 space-y-8">
        <div className="grid md:grid-cols-3 gap-8 text-center md:text-left">
          <div>
            <h2 className="text-white font-black text-xl tracking-tight">
              CHAKRADHAR STREAM
            </h2>
            <p className="mt-3 text-xs md:text-sm text-gray-400 max-w-sm">
              Premium movies, limited-run premieres, and cinematic storytelling crafted for modern audiences.
            </p>
          </div>

          <div className="flex flex-col gap-2 text-gray-300">
            <Link href="/movies" className="hover:text-cyan-300 transition">
              Browse Movies
            </Link>
            <Link href="/terms" className="hover:text-cyan-300 transition">
              Terms & Conditions
            </Link>
            <Link href="/privacy" className="hover:text-cyan-300 transition">
              Privacy Policy
            </Link>
            <Link href="/contact" className="hover:text-cyan-300 transition">
              Contact
            </Link>
          </div>

          <div className="text-gray-300">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Support</p>
            <p className="text-sm mt-2">
              thefifthagefilms@gmail.com
            </p>
            <p className="text-xs text-gray-500 mt-2">Response within 24 hours</p>
          </div>
        </div>

        <div className="border-t border-white/10 pt-5 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} Chakradhar OTT Platform • Created by Rahul Chakradhar & The Fifth Age Films Productions
        </div>
      </div>
    </footer>
  );
}