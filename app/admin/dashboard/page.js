"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/firebase";
import { collection, getDocs } from "firebase/firestore";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  MovieIcon,
  TicketIcon,
  UserIcon,
  AnalyticsIcon,
  PlusIcon,
  PencilIcon,
  MailIcon,
  SettingsIcon,
  ShieldCheckIcon,
} from "@/components/Icon";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMovies: 0,
    totalPremiers: 0,
    totalUsers: 0,
    totalViews: 0,
  });

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    const loadStats = async () => {
      try {
        const [moviesSnap, premiersSnap, usersSnap] = await Promise.all([
          getDocs(collection(db, "movies")),
          getDocs(collection(db, "premieres")),
          getDocs(collection(db, "users")),
        ]);

        let totalViews = 0;
        moviesSnap.forEach((doc) => {
          const data = doc.data();
          totalViews += (data.viewsReal || 0) + (data.views || 0);
        });

        setStats({
          totalMovies: moviesSnap.size,
          totalPremiers: premiersSnap.size,
          totalUsers: usersSnap.size,
          totalViews,
        });
      } catch (err) {
        console.error("Error loading stats:", err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [user, router]);

  if (!user) return null;

  return (
    <div className="min-h-screen px-4 md:px-10 lg:px-16 py-10 md:py-12 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header */}
        <div className="mb-12">
          <p className="admin-kicker mb-2 text-cyan-300 uppercase tracking-widest text-xs font-bold">Admin Management Desk</p>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2 text-white">
            Dashboard
          </h1>
          <p className="text-gray-400 text-sm">Manage content and monitor platform metrics with 100% real-time Firestore synchronization.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            {
              label: "Total Movies",
              value: stats.totalMovies,
              Icon: MovieIcon,
              color: "from-blue-600",
            },
            {
              label: "Live Premieres",
              value: stats.totalPremiers,
              Icon: TicketIcon,
              color: "from-purple-600",
            },
            {
              label: "Total Users",
              value: stats.totalUsers,
              Icon: UserIcon,
              color: "from-cyan-600",
            },
            {
              label: "Total Views",
              value: stats.totalViews.toLocaleString("en-IN"),
              Icon: AnalyticsIcon,
              color: "from-pink-600",
            },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.1 }}
              className={`glass-card rounded-2xl p-6 border border-white/10 bg-gradient-to-br ${stat.color} via-transparent flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">{stat.label}</p>
                  <p className="text-3xl font-black mt-2 text-white">{loading ? "..." : stat.value}</p>
                </div>
                <stat.Icon className="w-8 h-8 text-cyan-300 shrink-0" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Management Links */}
        <div className="grid md:grid-cols-2 gap-6">
          {[
            {
              title: "Content Management",
              description: "Add, edit, and manage movies and premieres",
              SectionIcon: MovieIcon,
              links: [
                { label: "Add Movie", href: "/admin/movies/create", Icon: PlusIcon },
                { label: "Edit Movies", href: "/admin/movies", Icon: PencilIcon },
                { label: "Add Premiere", href: "/admin/premieres/create", Icon: PlusIcon },
                { label: "Edit Premieres", href: "/admin/premieres", Icon: PencilIcon },
              ],
            },
            {
              title: "Analytics & Monitoring",
              description: "Track user activity and content performance",
              SectionIcon: AnalyticsIcon,
              links: [
                { label: "Search Analytics", href: "/admin/search-analytics", Icon: AnalyticsIcon },
                { label: "User Activity", href: "/admin/users", Icon: UserIcon },
                { label: "Admin Mail", href: "/admin/mail", Icon: MailIcon },
                { label: "Staff Attendance", href: "/admin/attendance", Icon: ShieldCheckIcon },
              ],
            },
          ].map((section, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.1 }}
              className="glass-card rounded-3xl p-8 border border-white/10"
            >
              <div className="flex items-center gap-3 mb-4">
                <section.SectionIcon className="w-8 h-8 text-cyan-400 shrink-0" />
                <div>
                  <h3 className="text-xl font-bold text-white">{section.title}</h3>
                  <p className="text-xs text-gray-400">{section.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6 pt-6 border-t border-white/10">
                {section.links.map((link, j) => (
                  <Link
                    key={j}
                    href={link.href}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-500/30 transition text-xs font-bold text-gray-200 group"
                  >
                    <link.Icon className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="group-hover:translate-x-1 transition truncate">
                      {link.label}
                    </span>
                  </Link>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
