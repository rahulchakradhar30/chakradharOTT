"use client";

import Link from "next/link";
import Script from "next/script";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();

  // Hide Footer on all /admin and /sub-admin routes
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/sub-admin")) {
    return null;
  }
  return (
    <footer className="mt-16 border-t border-white/10 bg-[#050915]/70 backdrop-blur-xl text-sm relative z-10">
      <div className="max-w-7xl mx-auto px-4 md:px-10 py-12 space-y-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left section containing brand, links, and support */}
          <div className="lg:col-span-7 grid md:grid-cols-3 gap-8 text-center md:text-left">
            <div className="space-y-3">
              <h2 className="text-white font-black text-xl tracking-tight">
                CHAKRADHAR STREAM
              </h2>
              <p className="text-xs md:text-sm text-gray-400 max-w-sm leading-relaxed">
                Premium movies, limited-run premieres, and cinematic storytelling crafted for modern audiences.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 text-gray-300">
              <span className="text-xs uppercase tracking-[0.2em] text-gray-400 font-bold mb-1">Navigation</span>
              <Link href="/movies" className="hover:text-cyan-300 transition-colors">
                Browse Movies
              </Link>
              <Link href="/terms" className="hover:text-cyan-300 transition-colors">
                Terms & Conditions
              </Link>
              <Link href="/privacy" className="hover:text-cyan-300 transition-colors">
                Privacy Policy
              </Link>
              <Link href="/contact" className="hover:text-cyan-300 transition-colors">
                Contact
              </Link>
            </div>

            <div className="space-y-2.5 text-gray-300">
              <span className="text-xs uppercase tracking-[0.2em] text-gray-400 font-bold">Support</span>
              <p className="text-sm">
                thefifthagefilms@gmail.com
              </p>
              <p className="text-xs text-gray-500">Response within 24 hours</p>
            </div>
          </div>

          {/* Right section containing the feedback card */}
          <div className="lg:col-span-5">
            <div className="relative group overflow-hidden bg-white/[0.01] hover:bg-white/[0.02] border border-white/10 hover:border-cyan-500/30 rounded-2xl p-6 backdrop-blur-md shadow-2xl transition-all duration-500">
              {/* Decorative cyan glow behind card */}
              <div className="absolute -right-20 -top-20 w-40 h-40 bg-cyan-500/5 rounded-full blur-3xl group-hover:bg-cyan-500/10 transition-all duration-700 pointer-events-none" />

              <div className="flex items-center gap-2.5 mb-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                  </svg>
                </div>
                <h3 className="text-white font-bold text-base tracking-tight">
                  Share Your Experience
                </h3>
              </div>
              
              <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                Help us improve Chakradhar Stream with your feedback.
              </p>

              {/* FormFacade target element */}
              <div className="relative min-h-[300px] w-full flex items-center justify-center">
                <div id="ff-compose" className="w-full">
                  {/* Spinner inside the form element which gets replaced when FormFacade finishes loading */}
                  <div className="flex flex-col items-center justify-center py-12 space-y-3">
                    <div className="w-7 h-7 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin"></div>
                    <span className="text-xs text-gray-500 tracking-wider">Loading feedback form...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Global style overrides for the FormFacade injected elements inside footer */}
        <style dangerouslySetInnerHTML={{ __html: `
          #ff-compose {
            width: 100%;
          }
          #ff-compose .ff-form {
            background: transparent !important;
            background-color: transparent !important;
            color: #e2e8f0 !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #ff-compose .ff-section {
            background: transparent !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #ff-compose .ff-title, 
          #ff-compose .ff-description {
            display: none !important;
          }
          #ff-compose .ff-item {
            margin-bottom: 1rem !important;
          }
          #ff-compose .ff-item label {
            color: #94a3b8 !important;
            font-weight: 500 !important;
            font-size: 0.8rem !important;
            margin-bottom: 0.25rem !important;
          }
          #ff-compose .ff-form input[type="text"],
          #ff-compose .ff-form input[type="email"],
          #ff-compose .ff-form textarea,
          #ff-compose .ff-form select {
            background: rgba(255, 255, 255, 0.02) !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            color: #f8fafc !important;
            border-radius: 0.5rem !important;
            padding: 0.5rem 0.75rem !important;
            font-size: 0.8rem !important;
            width: 100% !important;
            transition: all 0.2s ease !important;
          }
          #ff-compose .ff-form input[type="text"]:focus,
          #ff-compose .ff-form input[type="email"]:focus,
          #ff-compose .ff-form textarea:focus,
          #ff-compose .ff-form select:focus {
            border-color: rgba(6, 182, 212, 0.4) !important;
            background: rgba(255, 255, 255, 0.04) !important;
            outline: none !important;
          }
          #ff-compose .ff-form button,
          #ff-compose .ff-form .btn-primary,
          #ff-compose .ff-form #ff-submit-root,
          #ff-compose .ff-form input[type="submit"] {
            background: linear-gradient(135deg, #06b6d4, #0891b2) !important;
            color: #ffffff !important;
            font-weight: 600 !important;
            border: none !important;
            border-radius: 0.5rem !important;
            padding: 0.5rem 1rem !important;
            font-size: 0.8rem !important;
            cursor: pointer !important;
            transition: all 0.2s ease !important;
            box-shadow: 0 4px 10px rgba(6, 182, 212, 0.15) !important;
            width: auto !important;
            display: inline-flex !important;
          }
          #ff-compose .ff-form button:hover,
          #ff-compose .ff-form .btn-primary:hover,
          #ff-compose .ff-form #ff-submit-root:hover,
          #ff-compose .ff-form input[type="submit"]:hover {
            background: linear-gradient(135deg, #0891b2, #0e7490) !important;
            box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3) !important;
            transform: translateY(-0.5px) !important;
          }
          #ff-compose a {
            color: #22d3ee !important;
            text-decoration: none !important;
          }
          #ff-compose a:hover {
            color: #67e8f9 !important;
          }
        `}} />

        <Script
          src="https://formfacade.com/include/111331476523137867874/form/1FAIpQLScS6JdNRLTzsnEXq7xyUsAQrqnTscaGDONhQ5Z8lp3Ngjpxzg/classic.js?div=ff-compose"
          strategy="lazyOnload"
        />

        <div className="border-t border-white/10 pt-5 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} Chakradhar OTT Platform • Created by Rahul Chakradhar & The Fifth Age Films Productions • Version 3.0
        </div>
      </div>
    </footer>
  );
}