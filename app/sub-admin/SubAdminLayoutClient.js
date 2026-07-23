"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  CalendarIcon,
  UserIcon,
  PencilIcon,
  BellIcon,
  SettingsIcon,
  LockShieldIcon,
} from "@/components/Icon";

const ALL_SUB_ADMIN_NAV_ITEMS = [
  { href: "/sub-admin", moduleKey: "dashboard", label: "Dashboard", Icon: DashboardIcon },
  { href: "/sub-admin/movies", moduleKey: "movies", label: "Movies", Icon: MovieIcon },
  { href: "/sub-admin/premieres", moduleKey: "premieres", label: "Premieres", Icon: TicketIcon },
  { href: "/sub-admin/posters", moduleKey: "posters", label: "Posters", Icon: PosterIcon },
  { href: "/sub-admin/discovery", moduleKey: "discovery", label: "Discovery", Icon: SearchIcon },
  { href: "/sub-admin/genres", moduleKey: "genres", label: "Genres", Icon: TagIcon },
  { href: "/sub-admin/analytics", moduleKey: "analytics", label: "Analytics", Icon: AnalyticsIcon },
  { href: "/sub-admin/contacts", moduleKey: "contacts", label: "Contacts", Icon: MailIcon },
  { href: "/sub-admin/attendance", moduleKey: "dashboard", label: "Attendance & Leaves", Icon: CalendarIcon },
  { href: "/sub-admin/users", moduleKey: "users", label: "Users", Icon: UserIcon },
  { href: "/sub-admin/drafts", moduleKey: "drafts", label: "Drafts", Icon: PencilIcon },
  { href: "/sub-admin/mail", moduleKey: "mail", label: "Admin Mail", Icon: MailIcon },
  { href: "/sub-admin/notifications", moduleKey: "notifications", label: "Notifications", Icon: BellIcon },
  { href: "/sub-admin/settings", moduleKey: "settings", label: "Settings", Icon: SettingsIcon },
];

export default function SubAdminLayoutClient({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  const [checking, setChecking] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminName, setAdminName] = useState("");
  const [permissions, setPermissions] = useState(null);
  const [unreadMailsCount, setUnreadMailsCount] = useState(0);
  const touchStartX = useRef(null);

  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {
      // silent catch
    }
    router.replace("/admin/login");
  }, [router]);

  /* ---------- SESSION VERIFICATION ---------- */
  useEffect(() => {
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const checkSession = async () => {
      let authenticated = false;
      let email = "";
      let name = "";
      let perms = null;

      try {
        for (let attempt = 0; attempt < 3; attempt++) {
          const res = await fetch("/api/admin/session", { cache: "no-store" });
          if (res.ok) {
            const data = await res.json();
            if (data.authenticated) {
              authenticated = true;
              email = data.email || "";
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

        setAdminEmail(email || "subadmin");
        setAdminName(name || "");
        setPermissions(perms);
      } catch {
        router.replace("/admin/login");
      } finally {
        setChecking(false);
      }
    };

    checkSession();
  }, [router]);

  /* ---------- REAL-TIME REVOCATION LISTENER ---------- */
  useEffect(() => {
    if (!adminEmail) return;

    const normalizedEmail = adminEmail.toLowerCase();
    const adminDocRef = doc(db, "admins", normalizedEmail);

    const unsubscribe = onSnapshot(
      adminDocRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          console.warn("[SUB-ADMIN REVOKED] Account doc deleted. Force logging out...");
          handleLogout();
          return;
        }

        const data = snapshot.data() || {};
        if (data.status === "disabled" || data.status === "removed") {
          console.warn("[SUB-ADMIN REVOKED] Account status disabled. Force logging out...");
          handleLogout();
        }
      },
      (error) => {
        console.warn("Firestore snapshot error:", error);
      }
    );

    return () => unsubscribe();
  }, [adminEmail, handleLogout]);

  /* ---------- UNREAD MAIL POLLING ---------- */
  useEffect(() => {
    if (!adminEmail) return;

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
  }, [adminEmail]);

  /* ---------- NAV FILTERING ---------- */
  const filteredNavItems = ALL_SUB_ADMIN_NAV_ITEMS.filter((item) => {
    if (!permissions) return false;
    if (item.moduleKey === "dashboard") return true;
    const modules = permissions.modules || {};
    return modules[item.moduleKey] === true;
  });

  const isActive = (path) => pathname === path || (path !== "/sub-admin" && pathname.startsWith(path + "/"));

  /* ---------- MOBILE SWIPE TO CLOSE ---------- */
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff < -50) {
      setMenuOpen(false);
    }
    touchStartX.current = null;
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white px-4">
        <div className="glass-card rounded-3xl px-6 py-5 shadow-2xl text-center max-w-sm w-full">
          <div className="mx-auto mb-4 h-10 w-10 rounded-full border-4 border-cyan-400/30 border-t-cyan-400 animate-spin" />
          <p className="font-semibold">Validating Sub-Admin session</p>
          <p className="text-sm text-gray-400 mt-1">Checking secure access permissions...</p>
        </div>
      </div>
    );
  }

  const roleBadge = (
    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 font-bold uppercase tracking-wider">
      Sub Admin
    </span>
  );

  const sidebarContent = (
    <>
      <div>
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-300/80 mb-2">Restricted Desk</p>
          <h2 className="text-2xl font-black tracking-tight">Sub-Admin Portal</h2>
        </div>

        <div className="mb-6 rounded-xl border border-white/15 bg-black/20 p-3 text-xs text-gray-300 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-gray-400 text-[10px]">Signed in as</p>
            {roleBadge}
          </div>
          <p className="font-medium break-all">{adminName || adminEmail || "sub-admin"}</p>
          {adminName && <p className="text-[10px] text-gray-500 break-all">{adminEmail}</p>}
        </div>

        <nav className="space-y-1 text-sm">
          {filteredNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl transition ${
                isActive(item.href)
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20 font-bold"
                  : "text-gray-300 hover:bg-white/10"
              }`}
            >
              <div className="flex items-center gap-3">
                {item.Icon && <item.Icon className="w-4 h-4 shrink-0" />}
                <span>{item.label}</span>
              </div>
              {item.moduleKey === "mail" && unreadMailsCount > 0 && (
                <span className="bg-cyan-400 text-black text-[10px] font-black px-2 py-0.5 rounded-full">
                  {unreadMailsCount}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </div>

      <div className="space-y-4 pt-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 px-4 py-2.5 rounded-xl transition text-sm font-semibold text-red-300 focus-ring"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout Session
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#060b19] text-white flex flex-col md:flex-row">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex w-64 border-r border-white/10 p-6 flex-col justify-between shrink-0 sticky top-0 h-screen overflow-y-auto bg-[#040814]/90 backdrop-blur-xl">
        {sidebarContent}
      </aside>

      {/* MOBILE HEADER */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#040814]/95 sticky top-0 z-40 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔐</span>
          <div>
            <p className="text-[10px] text-cyan-300 font-bold uppercase tracking-wider">Sub-Admin Desk</p>
            <p className="text-xs font-bold text-white truncate max-w-[180px]">{adminName || adminEmail}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadMailsCount > 0 && (
            <Link
              href="/sub-admin/mail"
              className="bg-cyan-500/20 border border-cyan-400/40 px-2.5 py-1 rounded-full text-[10px] font-black text-cyan-300 flex items-center gap-1"
            >
              <span>✉️</span>
              <span>{unreadMailsCount}</span>
            </Link>
          )}

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-white focus-ring"
            aria-label="Toggle Navigation Menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* MOBILE DRAWER */}
      {menuOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex"
          onClick={() => setMenuOpen(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="w-4/5 max-w-sm bg-[#040814] h-full p-6 flex flex-col justify-between border-r border-white/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
