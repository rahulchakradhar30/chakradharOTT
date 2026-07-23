"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { db } from "@/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import {
  DashboardIcon,
  MovieIcon,
  TicketIcon,
  PosterIcon,
  SearchIcon,
  TagIcon,
  AnalyticsIcon,
  MailIcon,
  UserIcon,
  LockIcon,
  CalendarIcon,
  PencilIcon,
  BellIcon,
  SettingsIcon,
} from "@/components/Icon";

const ALL_NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", Icon: DashboardIcon },
  { href: "/admin/movies", label: "Movies", Icon: MovieIcon },
  { href: "/admin/premieres", label: "Premieres", Icon: TicketIcon },
  { href: "/admin/posters", label: "Posters", Icon: PosterIcon },
  { href: "/admin/discovery", label: "Discovery", Icon: SearchIcon },
  { href: "/admin/genres", label: "Genres", Icon: TagIcon },
  { href: "/admin/search-analytics", label: "Analytics", Icon: AnalyticsIcon },
  { href: "/admin/contacts", label: "Contacts", Icon: MailIcon },
  { href: "/admin/users", label: "Users", Icon: UserIcon },
  { href: "/admin/sub-admins", label: "Sub-Admins", Icon: LockIcon },
  { href: "/admin/attendance", label: "Attendance & Leaves", Icon: CalendarIcon },
  { href: "/admin/drafts", label: "Drafts", Icon: PencilIcon },
  { href: "/admin/mail", label: "Admin Mail", Icon: MailIcon },
  { href: "/admin/notifications", label: "Notifications", Icon: BellIcon },
  { href: "/admin/settings", label: "Settings", Icon: SettingsIcon },
];

export default function AdminLayoutClient({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  const [checking, setChecking] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminRole, setAdminRole] = useState("");
  const [permissions, setPermissions] = useState(null);
  const [unreadMailsCount, setUnreadMailsCount] = useState(0);
  const touchStartX = useRef(null);

  const isLoginPage = pathname === "/admin/login";

  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch (e) {
      console.warn("Logout fetch failed:", e);
    }
    router.push("/admin/login");
  }, [router]);

  /* ---------- SESSION CHECK ---------- */
  useEffect(() => {
    setMenuOpen(false);

    if (isLoginPage) {
      setChecking(false);
      return;
    }

    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const checkSession = async () => {
      try {
        let authenticated = false;
        let email = "";
        let role = "sub_admin";
        let name = "";
        let perms = null;

        for (let attempt = 0; attempt < 3; attempt += 1) {
          const res = await fetch("/api/admin/session", {
            method: "GET",
            cache: "no-store",
            credentials: "include",
            headers: { "Cache-Control": "no-cache" },
          });

          if (res.ok) {
            const data = await res.json();
            if (data?.authenticated) {
              authenticated = true;
              email = data.email || "admin";
              role = data.role || "sub_admin";
              name = data.name || "";
              perms = data.permissions || null;
              break;
            }
          }

          if (attempt < 2) {
            await delay(200);
          }
        }

        if (!authenticated) {
          router.replace("/admin/login");
          return;
        }

        if (role === "sub_admin") {
          router.replace("/sub-admin");
          return;
        }

        setAdminEmail(email || "admin");
        setAdminRole(role || "super_admin");
        setAdminName(name || "");
        setPermissions(perms);
      } catch {
        router.replace("/admin/login");
      } finally {
        setChecking(false);
      }
    };

    checkSession();
  }, [isLoginPage, router]);

  /* ---------- REAL-TIME REVOCATION LISTENER ---------- */
  useEffect(() => {
    if (isLoginPage || !adminEmail || adminRole === "super_admin") return;

    // Sub-admins: listen to their admin doc for removal/disable
    const normalizedEmail = adminEmail.toLowerCase();
    const adminDocRef = doc(db, "admins", normalizedEmail);

    const unsubscribe = onSnapshot(
      adminDocRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          // Doc deleted → sub-admin was removed
          console.warn("[ADMIN] Admin doc removed — forcing logout");
          handleLogout();
          return;
        }

        const data = snapshot.data();
        if (data.status === "disabled" || data.status === "removed") {
          console.warn("[ADMIN] Admin account disabled — forcing logout");
          handleLogout();
        }
      },
      (error) => {
        console.warn("[ADMIN] Firestore listener error:", error);
      }
    );

    return () => unsubscribe();
  }, [adminEmail, adminRole, isLoginPage, handleLogout]);

  /* ---------- UNREAD MAIL POLLING ---------- */
  useEffect(() => {
    if (isLoginPage || !adminEmail) return;

    const fetchUnread = async () => {
      try {
        const res = await fetch("/api/admin/mail");
        if (res.ok) {
          const data = await res.json();
          setUnreadMailsCount(data.unreadCount || 0);
        }
      } catch (e) {
        // silent fallback
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [adminEmail, isLoginPage]);

  /* ---------- NAV FILTERING ---------- */
  const filteredNavItems = ALL_NAV_ITEMS.filter((item) => {
    if (!permissions) return false;
    if (permissions.navItems.includes("*")) return true;
    // Allow sub-paths like /admin/movies/edit/xxx
    return permissions.navItems.some((allowed) =>
      item.href === allowed || item.href.startsWith(allowed + "/")
    );
  });

  const isActive = (path) => pathname === path;

  const isAllowedPath = () => {
    if (isLoginPage) return true;
    if (!permissions) return false;
    if (permissions.navItems.includes("*")) return true;

    // Check exact match and sub-paths
    return permissions.navItems.some((allowed) =>
      pathname === allowed ||
      pathname.startsWith(allowed + "/")
    );
  };

  /* ---------- MOBILE SWIPE TO CLOSE ---------- */
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    // Swipe left to close (diff > 50px)
    if (diff < -50) {
      setMenuOpen(false);
    }
    touchStartX.current = null;
  };

  /* ---------- RENDER ---------- */
  if (isLoginPage) return <>{children}</>;

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white px-4">
        <div className="glass-card rounded-3xl px-6 py-5 shadow-2xl text-center max-w-sm w-full">
          <div className="mx-auto mb-4 h-10 w-10 rounded-full border-4 border-cyan-400/30 border-t-cyan-400 animate-spin" />
          <p className="font-semibold">Validating admin session</p>
          <p className="text-sm text-gray-400 mt-1">Checking secure access before loading the dashboard.</p>
        </div>
      </div>
    );
  }

  const roleBadge = adminRole === "super_admin" ? (
    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-cyan-500/30 to-blue-500/30 border border-cyan-400/40 text-cyan-200 font-bold uppercase tracking-wider">
      Super Admin
    </span>
  ) : (
    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 font-bold uppercase tracking-wider">
      Sub Admin
    </span>
  );

  const sidebarContent = (
    <>
      <div>
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-300/80 mb-2">Admin Portal</p>
          <h2 className="text-2xl font-black tracking-tight">Control Center</h2>
        </div>

        <div className="mb-6 rounded-xl border border-white/15 bg-black/20 p-3 text-xs text-gray-300 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-gray-400 text-[10px]">Signed in as</p>
            {roleBadge}
          </div>
          <p className="font-medium break-all">{adminName || adminEmail || "admin"}</p>
          {adminName && <p className="text-[10px] text-gray-500 break-all">{adminEmail}</p>}
        </div>

        <nav className="space-y-1 text-sm">
          {filteredNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition ${
                isActive(item.href)
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20"
                  : "text-gray-300 hover:bg-white/10"
              }`}
            >
              <div className="flex items-center gap-2.5">
                {item.Icon && <item.Icon className="w-4 h-4 shrink-0" />}
                <span>{item.label}</span>
              </div>
              {item.href === "/admin/mail" && unreadMailsCount > 0 && (
                <span className="bg-cyan-400 text-black text-[10px] font-black px-2 py-0.5 rounded-full">
                  {unreadMailsCount}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </div>

      <div className="space-y-4 pt-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 px-4 py-2.5 rounded-xl transition text-sm font-semibold text-red-300 focus-ring"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
        <div className="text-[10px] text-center text-gray-500 uppercase tracking-widest">
          Version 4.0
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-[#0f0f0f] text-white">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex w-72 bg-[#181818] p-6 flex-col justify-between border-r border-white/10 shadow-2xl fixed top-0 left-0 h-full z-40 overflow-y-auto">
        {sidebarContent}
      </aside>

      {/* MOBILE HEADER */}
      <div className="md:hidden fixed top-0 left-0 w-full bg-[#0f0f0f] border-b border-white/10 flex items-center justify-between px-4 py-3 z-50 safe-area-top">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMenuOpen(true)}
            className="rounded-lg border border-white/15 p-2 hover:bg-white/10 transition focus-ring"
            aria-label="Open admin menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/70">Admin</p>
            <h2 className="text-sm font-semibold leading-tight">Control Center</h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {roleBadge}
          <button
            onClick={handleLogout}
            className="rounded-lg border border-red-500/20 bg-red-500/10 p-2 hover:bg-red-500/20 transition focus-ring"
            aria-label="Logout"
            title="Logout"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* MOBILE SLIDE-OUT MENU */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="absolute left-0 top-0 h-full w-72 bg-[#060b19]/95 p-6 border-r border-white/10 flex flex-col justify-between shadow-2xl overflow-y-auto safe-area-top"
            onClick={(event) => event.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-bold">Admin</h2>
                <button onClick={() => setMenuOpen(false)} className="text-sm text-gray-300 focus-ring rounded-md px-2 py-1 hover:bg-white/10 transition">
                  ✕
                </button>
              </div>

              <div className="mb-6 rounded-xl border border-white/15 bg-black/20 p-3 text-xs text-gray-300 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-gray-400 text-[10px]">Signed in</p>
                  {roleBadge}
                </div>
                <p className="font-medium break-all text-[11px]">{adminName || adminEmail}</p>
              </div>

              <nav className="space-y-1 text-sm">
                {filteredNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition ${
                      isActive(item.href)
                        ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                        : "text-gray-300 hover:bg-white/10"
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="space-y-4 pt-4">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 px-4 py-2.5 rounded-xl transition text-sm font-semibold text-red-300 focus-ring"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
              <div className="text-[10px] text-center text-gray-500 uppercase tracking-widest">
                Version 4.0
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <main className="flex-1 p-5 md:p-10 pt-20 md:pt-10 md:ml-72 overflow-y-auto w-full min-h-screen safe-area-bottom">
        {!isLoginPage && !checking && !isAllowedPath() ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
            <div className="glass-card rounded-[2rem] p-8 md:p-12 max-w-md w-full border border-red-500/20 bg-red-950/10 shadow-2xl relative overflow-hidden">
              <div className="absolute -top-12 -left-12 w-32 h-32 bg-red-500/10 rounded-full blur-2xl animate-pulse" />
              <LockIcon className="w-16 h-16 text-red-400 mx-auto mb-6" />
              <h1 className="text-3xl font-black mb-3 text-red-400">Access Denied</h1>
              <p className="text-sm text-gray-300 leading-relaxed mb-8">
                This page is restricted to <strong>Super Administrators</strong>. Your current role (<strong>Sub-Admin</strong>) does not have permission to view this section.
              </p>
              <Link
                href="/admin"
                className="admin-button admin-button-primary px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-wider inline-block"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
