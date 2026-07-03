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

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/movies", label: "Movies" },
    { href: "/ai-assistant", label: "AI Guide ✦" },
    { href: "/trivia", label: "Trivia Arena" },
    { href: "/interactive-story", label: "Interactive Story 🎮" },
    { href: "/contact", label: "Contact" },
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
        <div className="flex items-center gap-3 md:gap-6">
          <Link
            href="/"
            className="whitespace-nowrap tracking-tight"
          >
            <span className="text-lg md:text-2xl font-black">CHAKRADHAR</span>{" "}
            <span className="bg-gradient-to-r from-cyan-300 via-blue-300 to-pink-300 bg-clip-text text-transparent font-black text-lg md:text-2xl">
              STREAM
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-2 text-sm text-gray-300">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-2 rounded-full hover:bg-white/10 transition"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div
            className="relative flex-1 max-w-2xl"
            ref={dropdownRef}
          >
            <input
              type="text"
              placeholder="Search movies, genres, or cast"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="focus-ring w-full bg-white/5 md:bg-white/8 border border-white/10 rounded-full px-4 md:px-5 py-2.5 text-sm text-white placeholder:text-gray-400 focus:outline-none"
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

          <div className="relative" ref={profileRef}>
            {!user ? (
              <Link
                href="/login"
                className="whitespace-nowrap bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 px-4 py-2 rounded-full text-xs md:text-sm font-semibold transition"
              >
                Login
              </Link>
            ) : (
              <>
                <button
                  onClick={() =>
                    setProfileOpen(!profileOpen)
                  }
                  className="flex items-center"
                >
                  {user.photoURL ? (
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
                      className="absolute right-0 mt-3 w-48 bg-[#080c1c]/95 border border-white/10 rounded-xl shadow-xl backdrop-blur-xl overflow-hidden"
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
  );
}