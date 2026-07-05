"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState, useMemo } from "react";
import { db } from "@/firebase";
import { collection, getDocs } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();

  const [scrolled, setScrolled] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [movies, setMovies] = useState([]);
  const [profileOpen, setProfileOpen] = useState(false);

  const dropdownRef = useRef(null);
  const profileRef = useRef(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "Home", icon: "🏠" },
    { href: "/movies", label: "Movies", icon: "🎬" },
    { href: "/posters", label: "Posters", icon: "🖼️" },
    { href: "/ai-assistant", label: "AI Guide", badge: "✦", icon: "🤖" },
    { href: "/trivia", label: "Trivia Arena", icon: "🏆" },
    { href: "/contact", label: "Contact", icon: "📧" },
  ];

  /* Scroll */
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /* Fetch Movies */
  useEffect(() => {
    const fetchMovies = async () => {
      const snapshot = await getDocs(collection(db, "movies"));
      setMovies(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      );
    };
    fetchMovies();
  }, []);

  /* Debounce */
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const results = useMemo(() => {
    if (!debouncedQuery) return [];
    return movies
      .filter((m) =>
        m.title?.toLowerCase().includes(debouncedQuery.toLowerCase())
      )
      .slice(0, 6);
  }, [debouncedQuery, movies]);

  /* Outside click */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setQuery("");
      }
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getInitials = (name = "U") => {
    const parts = name.split(" ");
    if (parts.length === 1)
      return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  return (
    <>
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${
          scrolled
            ? "bg-[#050814]/80 backdrop-blur-2xl border-b border-white/10"
            : "bg-gradient-to-b from-[#04060f]/85 to-transparent"
        }`}
      >
        <div className="px-4 md:px-8 lg:px-14 py-4">
          <div className="flex items-center gap-3 md:gap-6 justify-between">
            {/* Left Header Brand */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden flex items-center justify-center w-9 h-9 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 transition"
                title="Open Navigation"
              >
                <span className="text-lg">☰</span>
              </button>
              
              <Link
                href="/"
                className="whitespace-nowrap tracking-tight"
              >
                <span className="text-lg md:text-2xl font-black">CHAKRADHAR</span>{" "}
                <span className="bg-gradient-to-r from-cyan-300 via-blue-300 to-pink-300 bg-clip-text text-transparent font-black text-lg md:text-2xl">
                  STREAM
                </span>
              </Link>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex items-center gap-1.5 text-sm text-gray-300">
              {navLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3.5 py-2 rounded-full hover:bg-white/5 border border-transparent hover:border-white/5 transition flex items-center gap-1.5 font-bold"
                >
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="text-[10px] text-cyan-300 bg-cyan-500/10 px-1.5 py-0.5 rounded font-black border border-cyan-400/20">
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>

            {/* Search Input Box */}
            <div
              className="relative flex-1 max-w-md hidden sm:block mx-4"
              ref={dropdownRef}
            >
              <input
                type="text"
                placeholder="Search movies, genres, or cast"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="focus-ring w-full bg-white/5 border border-white/10 rounded-full px-5 py-2.5 text-xs text-white placeholder:text-gray-400 focus:outline-none"
              />

              <AnimatePresence>
                {results.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute top-[3.4rem] w-full max-h-80 overflow-y-auto rounded-2xl bg-[#080c1c]/95 border border-white/10 backdrop-blur-xl shadow-2xl"
                  >
                    {results.map((movie) => (
                      <Link
                        key={movie.id}
                        href={`/movie/${movie.id}`}
                        onClick={() => setQuery("")}
                        className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/10 transition"
                      >
                        <div className="relative w-10 h-14 rounded overflow-hidden shrink-0">
                          <Image
                            src={movie.posterImage || "https://images.unsplash.com/photo-1524985069026-dd778a71c7b4"}
                            alt={movie.title || "Movie"}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-medium text-white line-clamp-1">{movie.title}</p>
                          <p className="text-xs text-gray-400">Open details</p>
                        </div>
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile actions */}
            <div className="relative flex items-center gap-3" ref={profileRef}>
              {!user ? (
                <Link
                  href="/login"
                  className="whitespace-nowrap bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 px-5 py-2 rounded-full text-xs md:text-sm font-semibold transition shadow-md shadow-cyan-500/10"
                >
                  Login
                </Link>
              ) : (
                <>
                  <button
                    onClick={() =>
                      setProfileOpen(!profileOpen)
                    }
                    className="flex items-center transition hover:scale-105"
                  >
                    {user.photoURL && user.photoURL.startsWith("http") ? (
                      <Image
                        src={user.photoURL}
                        alt="profile"
                        width={36}
                        height={36}
                        className="rounded-full object-cover w-9 h-9 border border-cyan-300/40"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 to-blue-700 flex items-center justify-center text-white text-sm font-semibold">
                        {getInitials(
                          user.displayName || user.email
                        )}
                      </div>
                    )}
                  </button>

                  <AnimatePresence>
                    {profileOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute right-0 mt-12 top-0 w-48 bg-[#080c1c]/95 border border-white/10 rounded-xl shadow-xl backdrop-blur-xl overflow-hidden z-50"
                      >
                        <Link
                          href="/dashboard"
                          className="block px-4 py-3 text-sm hover:bg-white/10 transition border-b border-white/5"
                        >
                          📊 Dashboard
                        </Link>

                        <Link
                          href="/profile"
                          className="block px-4 py-3 text-sm hover:bg-white/10 transition border-b border-white/5"
                        >
                          👤 My Profile
                        </Link>

                        <button
                          onClick={logout}
                          className="w-full text-left px-4 py-3 text-sm hover:bg-white/10 transition text-red-400"
                        >
                          🚪 Logout
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Drawer Menu Layout */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Dark background overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.25 }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-[#050814]/95 border-r border-white/10 backdrop-blur-2xl p-6 z-50 lg:hidden flex flex-col justify-between shadow-2xl"
            >
              <div className="space-y-8">
                <div className="flex justify-between items-center pb-4 border-b border-white/10">
                  <span className="font-black text-[10px] uppercase tracking-widest text-cyan-300">
                    📂 Navigation menu
                  </span>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  {navLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-4 py-3 rounded-2xl bg-white/5 border border-white/5 hover:border-cyan-400/40 hover:bg-cyan-500/10 transition flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-base select-none">{item.icon}</span>
                        <span className="font-extrabold text-sm text-gray-200 group-hover:text-cyan-300">
                          {item.label}
                        </span>
                      </div>
                      {item.badge ? (
                        <span className="text-[9px] text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded font-black border border-cyan-400/20">
                          {item.badge}
                        </span>
                      ) : (
                        <span className="text-gray-600 group-hover:translate-x-0.5 transition-transform">→</span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-white/5 text-center">
                <p className="text-[10px] text-gray-500 font-extrabold tracking-widest uppercase">
                  Chakradhar Stream © 2026
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}