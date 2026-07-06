"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LockIcon } from "@/components/Icon";

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/movies", label: "Movies" },
  { href: "/admin/premieres", label: "Premieres" },
  { href: "/admin/posters", label: "Posters" },
  { href: "/admin/discovery", label: "Discovery" },
  { href: "/admin/genres", label: "Genres" },
  { href: "/admin/search-analytics", label: "Analytics" },
  { href: "/admin/contacts", label: "Contacts" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/sub-admins", label: "Sub-Admins" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminLayoutClient({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  const [checking, setChecking] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminRole, setAdminRole] = useState("");

  const isLoginPage = pathname === "/admin/login";

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
        for (let attempt = 0; attempt < 3; attempt += 1) {
          const res = await fetch("/api/admin/session", {
            method: "GET",
            cache: "no-store",
            credentials: "include",
            headers: {
              "Cache-Control": "no-cache",
            },
          });

          if (res.ok) {
            const data = await res.json();
            if (data?.authenticated) {
              authenticated = true;
              email = data.email || "admin";
              role = data.role || "sub_admin";
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

        setAdminEmail(email || "admin");
        setAdminRole(role || "sub_admin");
      } catch {
        router.replace("/admin/login");
      } finally {
        setChecking(false);
      }
    };

    checkSession();
  }, [isLoginPage, router]);

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.push("/admin/login");
  };

  const isActive = (path) => pathname === path;

  const filteredNavItems = navItems.filter((item) => {
    if (adminRole === "sub_admin") {
      return ["/admin", "/admin/movies", "/admin/contacts"].includes(item.href);
    }
    return true;
  });

  const isAllowedPath = () => {
    if (isLoginPage) return true;
    if (adminRole === "sub_admin") {
      const isEditMoviePage = pathname.startsWith("/admin/movies/edit");
      return ["/admin", "/admin/movies", "/admin/contacts"].includes(pathname) || isEditMoviePage;
    }
    return true;
  };

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

  return (
    <div className="app-shell flex min-h-screen text-white">
      <aside className="hidden md:flex w-72 bg-[#060b19]/90 backdrop-blur-xl p-6 flex-col justify-between border-r border-white/10 shadow-2xl shadow-black/30">
        <div>
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-300/80 mb-2">Admin Portal</p>
            <h2 className="text-2xl font-black tracking-tight">Control Center</h2>
          </div>

          <div className="mb-6 rounded-xl border border-white/15 bg-black/20 p-3 text-xs text-gray-300">
            <p className="text-gray-400 mb-1">Signed in as</p>
            <p className="font-medium break-all">{adminEmail || "admin"}</p>
            <p className="text-[10px] text-cyan-400 font-mono mt-1 capitalize">{adminRole.replace("_", " ")}</p>
          </div>

          <nav className="space-y-2 text-sm">
            {filteredNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-2.5 rounded-xl transition ${
                  isActive(item.href)
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                    : "text-gray-300 hover:bg-white/10"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleLogout}
            className="w-full bg-white/10 hover:bg-white/20 px-4 py-2.5 rounded-xl transition text-sm font-semibold focus-ring"
          >
            Logout
          </button>
          <div className="text-[10px] text-center text-gray-500 uppercase tracking-widest">
            Version 3.0
          </div>
        </div>
      </aside>

      <div className="md:hidden fixed top-0 left-0 w-full bg-[#060b19]/95 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-4 py-4 z-50">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/70">Admin</p>
          <h2 className="text-base font-semibold">Control Center</h2>
        </div>
        <button
          onClick={() => setMenuOpen(true)}
          className="rounded-full border border-white/15 px-3 py-1.5 text-sm focus-ring"
          aria-label="Open admin menu"
        >
          Menu
        </button>
      </div>

      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="absolute left-0 top-0 h-full w-72 bg-[#060b19]/95 p-6 border-r border-white/10 flex flex-col justify-between shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-bold">Admin</h2>
                <button onClick={() => setMenuOpen(false)} className="text-sm text-gray-300 focus-ring rounded-md px-2 py-1">
                  Close
                </button>
              </div>

              <nav className="space-y-2 text-sm">
                {filteredNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`block px-3 py-2.5 rounded-xl transition ${
                      isActive(item.href)
                        ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                        : "text-gray-300 hover:bg-white/10"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="space-y-4">
              <button
                onClick={handleLogout}
                className="w-full bg-white/10 hover:bg-white/20 px-4 py-2.5 rounded-xl transition text-sm font-semibold focus-ring"
              >
                Logout
              </button>
              <div className="text-[10px] text-center text-gray-500 uppercase tracking-widest">
                Version 3.0
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 p-5 md:p-10 pt-24 md:pt-10 overflow-y-auto w-full">
        {!isLoginPage && !checking && !isAllowedPath() ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
            <div className="glass-card rounded-[2rem] p-8 md:p-12 max-w-md w-full border border-red-500/20 bg-red-950/10 shadow-2xl relative overflow-hidden">
              <div className="absolute -top-12 -left-12 w-32 h-32 bg-red-500/10 rounded-full blur-2xl animate-pulse" />
              <LockIcon className="w-16 h-16 text-red-400 mx-auto mb-6" />
              <h1 className="text-3xl font-black mb-3 text-red-400">Access Denied</h1>
              <p className="text-sm text-gray-300 leading-relaxed mb-8">
                This page is restricted to **Super Administrators**. Your current role (**Sub-Admin**) does not have permission to view this section.
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
