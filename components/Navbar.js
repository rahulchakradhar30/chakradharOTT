"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useMemo } from "react";
import { db } from "@/firebase";
import { collection, getDocs } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import {
  Home,
  Film,
  Image as ImageIcon,
  Bot,
  Trophy,
  Users,
  Mail,
  Search,
  Menu,
  X,
  LayoutDashboard,
  User,
  LogOut,
  Sparkles,
  ChevronRight,
  Star,
} from "lucide-react";

function NavLinkIcon({ itemKey, className = "w-4 h-4" }) {
  switch (itemKey) {
    case "/":
      return <Home className={className} />;
    case "/movies":
      return <Film className={className} />;
    case "/posters":
      return <ImageIcon className={className} />;
    case "/ai-assistant":
      return <Bot className={className} />;
    case "/trivia":
      return <Trophy className={className} />;
    case "/watch-party":
      return <Users className={className} />;
    case "/contact":
      return <Mail className={className} />;
    default:
      return null;
  }
}

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const [scrolled, setScrolled] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [movies, setMovies] = useState([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const dropdownRef = useRef(null);
  const profileRef = useRef(null);
  const searchInputRef = useRef(null);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/movies", label: "Movies" },
    { href: "/posters", label: "Posters" },
    { href: "/ai-assistant", label: "AI Guide", badge: "✦" },
    { href: "/trivia", label: "Trivia Arena" },
    { href: "/watch-party", label: "Watch Party", badge: "👥" },
    { href: "/contact", label: "Contact" },
  ];

  /* Scroll Listener */
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /* Fetch Movies for Search */
  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const snapshot = await getDocs(collection(db, "movies"));
        setMovies(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
        );
      } catch (e) {
        console.warn("Navbar movies fetch skipped:", e);
      }
    };
    fetchMovies();
  }, []);

  /* Debounce Search Query */
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  /* Keyboard shortcut '/' or 'Cmd+K' to focus search */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        (e.key === "/" || ((e.metaKey || e.ctrlKey) && e.key === "k")) &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const results = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    return movies
      .filter((m) =>
        (m.title || "").toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        (m.genre || "").toLowerCase().includes(debouncedQuery.toLowerCase())
      )
      .slice(0, 6);
  }, [debouncedQuery, movies]);

  /* Outside click handling */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setQuery("");
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getInitials = (name = "U") => {
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  // Hide Navbar on all /admin and /sub-admin routes
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/sub-admin")) {
    return null;
  }

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "py-2.5 bg-black/75 backdrop-blur-2xl border-b border-white/[0.08] shadow-[0_10px_30px_rgba(0,0,0,0.8)]"
            : "py-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3 md:gap-6">
            
            {/* Left: Hamburger & Brand */}
            <div className="flex items-center gap-3 md:gap-4">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 text-white hover:bg-white/[0.12] transition-colors"
                title="Open Navigation"
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              <Link
                href="/"
                className="flex items-center gap-2.5 whitespace-nowrap tracking-tight group"
              >
                <div className="relative">
                  <Image
                    src="/apple-touch-icon.png"
                    alt="Chakradhar Stream Logo"
                    width={34}
                    height={34}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover border border-red-500/40 group-hover:border-red-500 transition-all duration-300 shadow-md shadow-red-500/20 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 rounded-xl bg-red-500/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div>
                  <span className="text-base sm:text-xl font-black text-white tracking-tight">
                    CHAKRADHAR
                  </span>{" "}
                  <span className="bg-gradient-to-r from-red-500 via-rose-400 to-amber-400 bg-clip-text text-transparent font-black text-base sm:text-xl tracking-tight">
                    STREAM
                  </span>
                </div>
              </Link>
            </div>

            {/* Center: Desktop Nav Links with Floating Glow Pills */}
            <nav className="hidden lg:flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl shadow-inner">
              {navLinks.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative px-4 py-2 rounded-full text-xs font-bold tracking-wide transition-all duration-200 flex items-center gap-1.5 ${
                      isActive
                        ? "text-white shadow-sm"
                        : "text-gray-300 hover:text-white hover:bg-white/[0.06]"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeNavPill"
                        className="absolute inset-0 rounded-full bg-gradient-to-r from-red-600/90 to-red-700/90 border border-red-500/50 shadow-[0_2px_12px_rgba(229,9,20,0.4)]"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      <NavLinkIcon itemKey={item.href} className="w-3.5 h-3.5 opacity-80" />
                      {item.label}
                      {item.badge && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-red-500/20 text-red-300 border border-red-400/30 font-black">
                          {item.badge}
                        </span>
                      )}
                    </span>
                  </Link>
                );
              })}
            </nav>

            {/* Right: Search & User Profile */}
            <div className="flex items-center gap-3">
              {/* Search Bar */}
              <div
                className="relative hidden sm:block w-48 md:w-64 lg:w-72"
                ref={dropdownRef}
              >
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 absolute left-3.5 text-gray-400 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search titles, genres..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full bg-white/[0.06] hover:bg-white/[0.09] focus:bg-black/80 border border-white/[0.1] focus:border-red-500/60 rounded-full pl-9 pr-8 py-2 text-xs text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all shadow-inner"
                    aria-label="Search movies, genres, or cast"
                  />
                  {query ? (
                    <button
                      onClick={() => setQuery("")}
                      className="absolute right-3 text-gray-400 hover:text-white p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <kbd className="hidden md:inline-block absolute right-3 px-1.5 py-0.5 text-[10px] font-mono text-gray-400 bg-white/[0.08] border border-white/10 rounded">
                      /
                    </kbd>
                  )}
                </div>

                {/* Search Dropdown Results */}
                <AnimatePresence>
                  {results.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.98 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-full mt-2 w-full max-h-80 overflow-y-auto rounded-2xl bg-[#0c0f17]/95 border border-white/[0.12] backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] p-2 z-50 divide-y divide-white/[0.05]"
                    >
                      {results.map((movie) => (
                        <Link
                          key={movie.id}
                          href={`/movie/${movie.id}`}
                          onClick={() => setQuery("")}
                          className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.08] transition-colors group"
                        >
                          <div className="relative w-11 h-14 rounded-lg overflow-hidden bg-black shrink-0 border border-white/10">
                            {movie.posterImage ? (
                              <Image
                                src={movie.posterImage}
                                alt={movie.title || "Movie"}
                                fill
                                sizes="44px"
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-red-950 to-black flex items-center justify-center">
                                <Film className="w-4 h-4 text-red-400" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-xs text-white line-clamp-1 group-hover:text-red-400 transition-colors">
                              {movie.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400">
                              <span>{movie.genre || "Cinema"}</span>
                              {movie.rating && (
                                <span className="flex items-center gap-0.5 text-amber-400 font-semibold">
                                  <Star className="w-2.5 h-2.5 fill-current" />
                                  {Number(movie.rating).toFixed(1)}
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Profile Avatar / Login Button */}
              <div className="relative" ref={profileRef}>
                {!user ? (
                  <Link
                    href="/login"
                    className="whitespace-nowrap btn-luxury-primary px-4 sm:px-5 py-2 rounded-full text-xs font-bold transition-all shadow-md"
                  >
                    Login
                  </Link>
                ) : (
                  <>
                    <button
                      onClick={() => setProfileOpen(!profileOpen)}
                      className="relative flex items-center p-0.5 rounded-full border border-white/20 hover:border-red-500/60 transition-all hover:scale-105 focus:outline-none"
                      aria-label="Open profile menu"
                    >
                      {user.photoURL && user.photoURL.startsWith("http") ? (
                        <Image
                          src={user.photoURL}
                          alt={user.displayName || "User profile avatar"}
                          width={34}
                          height={34}
                          className="rounded-full object-cover w-8 h-8 sm:w-8.5 sm:h-8.5"
                        />
                      ) : (
                        <div className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full bg-gradient-to-br from-red-600 to-amber-600 flex items-center justify-center text-white text-xs font-black shadow-inner">
                          {getInitials(user.displayName || user.email)}
                        </div>
                      )}
                    </button>

                    <AnimatePresence>
                      {profileOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.96 }}
                          transition={{ duration: 0.18 }}
                          className="absolute right-0 mt-3 w-52 bg-[#0c0f17]/95 border border-white/[0.12] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-2xl p-1.5 z-50 divide-y divide-white/[0.06]"
                        >
                          <div className="px-3 py-2.5">
                            <p className="text-xs font-bold text-white truncate">
                              {user.displayName || "Viewer"}
                            </p>
                            <p className="text-[10px] text-gray-400 truncate">
                              {user.email}
                            </p>
                          </div>

                          <div className="py-1">
                            <Link
                              href="/dashboard"
                              onClick={() => setProfileOpen(false)}
                              className="px-3 py-2 text-xs font-semibold hover:bg-white/[0.08] rounded-xl transition flex items-center gap-2.5 text-gray-200 hover:text-white"
                            >
                              <LayoutDashboard className="w-3.5 h-3.5 text-red-400" />
                              Dashboard
                            </Link>
                            <Link
                              href="/profile"
                              onClick={() => setProfileOpen(false)}
                              className="px-3 py-2 text-xs font-semibold hover:bg-white/[0.08] rounded-xl transition flex items-center gap-2.5 text-gray-200 hover:text-white"
                            >
                              <User className="w-3.5 h-3.5 text-sky-400" />
                              My Profile
                            </Link>
                          </div>

                          <div className="pt-1">
                            <button
                              onClick={() => {
                                setProfileOpen(false);
                                logout();
                              }}
                              className="w-full text-left px-3 py-2 text-xs font-semibold hover:bg-red-500/10 rounded-xl transition text-red-400 hover:text-red-300 flex items-center gap-2.5"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                              Logout
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* Mobile Drawer Menu Layout */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 lg:hidden"
            />
            
            {/* Drawer */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-[#07090e] border-r border-white/[0.1] backdrop-blur-3xl p-6 z-50 lg:hidden flex flex-col justify-between shadow-[0_0_50px_rgba(0,0,0,0.9)]"
            >
              <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center pb-4 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2.5">
                    <Image
                      src="/apple-touch-icon.png"
                      alt="Logo"
                      width={28}
                      height={28}
                      className="w-7 h-7 rounded-lg object-cover border border-red-500/40"
                    />
                    <span className="font-black text-xs uppercase tracking-widest text-red-400">
                      Chakradhar Stream
                    </span>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition"
                    aria-label="Close navigation menu"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Mobile Search */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search movies..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full bg-white/[0.06] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-gray-400 focus:outline-none focus:border-red-500"
                  />
                </div>

                {/* Nav Links */}
                <div className="flex flex-col gap-1.5">
                  {navLinks.map((item, idx) => {
                    const isActive = pathname === item.href;
                    return (
                      <motion.div
                        key={item.href}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.04 }}
                      >
                        <Link
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`px-4 py-3 rounded-2xl transition flex items-center justify-between border ${
                            isActive
                              ? "bg-red-600/20 border-red-500/50 text-white font-bold shadow-md shadow-red-600/10"
                              : "bg-white/[0.03] border-white/[0.05] hover:bg-white/[0.08] text-gray-300"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <NavLinkIcon
                              itemKey={item.href}
                              className={`w-4 h-4 ${isActive ? "text-red-400" : "text-gray-400"}`}
                            />
                            <span className="text-sm font-semibold">{item.label}</span>
                          </div>
                          {item.badge ? (
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-400/30 font-bold">
                              {item.badge}
                            </span>
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-600" />
                          )}
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="pt-6 border-t border-white/[0.06] text-center">
                <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">
                  CHAKRADHAR STREAM © 2026
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}