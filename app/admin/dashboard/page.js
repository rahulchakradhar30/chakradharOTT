"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/firebase";
import { collection, getDocs, query, limit } from "firebase/firestore";
import { motion } from "framer-motion";
import Link from "next/link";

export default function AdminDashboard() {
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
        setLoading(true);

        const moviesSnap = await getDocs(collection(db, "movies"));
        const premiersSnap = await getDocs(collection(db, "premieres"));
        const usersSnap = await getDocs(collection(db, "users"));

        let totalViews = 0;
        moviesSnap.forEach((doc) => {
          const data = doc.data();
          totalViews +=
            (data.viewsReal || 0) + (data.viewsBoost || 0);
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
    <div className="min-h-screen px-4 md:px-10 lg:px-16 py-10 md:py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header */}
        <div className="mb-12">
          <p className="admin-kicker mb-2">Admin Panel</p>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2">
            Dashboard
          </h1>
          <p className="text-gray-400">Manage content and monitor platform metrics</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            {
              label: "Total Movies",
              value: stats.totalMovies,
              icon: "🎬",
              color: "from-blue-600",
            },
            {
              label: "Premieres",
              value: stats.totalPremiers,
              icon: "🎭",
              color: "from-purple-600",
            },
            {
              label: "Total Users",
              value: stats.totalUsers,
              icon: "👥",
              color: "from-cyan-600",
            },
            {
              label: "Total Views",
              value: stats.totalViews.toLocaleString(),
              icon: "👁️",
              color: "from-pink-600",
            },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.1 }}
              className={`glass-card rounded-2xl p-6 border border-white/10 bg-gradient-to-br ${stat.color} via-transparent`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">{stat.label}</p>
                  <p className="text-3xl font-black mt-2">{stat.value}</p>
                </div>
                <span className="text-4xl">{stat.icon}</span>
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
              icon: "📽️",
              links: [
                { label: "Add Movie", href: "/admin/movies/create", icon: "➕" },
                { label: "Edit Movies", href: "/admin/movies", icon: "✏️" },
                { label: "Add Premiere", href: "/admin/premieres/create", icon: "⭐" },
                { label: "Edit Premieres", href: "/admin/premieres", icon: "✏️" },
              ],
            },
            {
              title: "Analytics & Monitoring",
              description: "Track user activity and content performance",
              icon: "📊",
              links: [
                { label: "View Analytics", href: "/admin/analytics", icon: "📈" },
                {
                  label: "User Activity",
                  href: "/admin/users",
                  icon: "📋",
                },
                { label: "Content Stats", href: "/admin/content-stats", icon: "📉" },
                { label: "Revenue", href: "/admin/revenue", icon: "💰" },
              ],
            },
            {
              title: "User Management",
              description: "Manage users, subscriptions, and support",
              icon: "👤",
              links: [
                { label: "All Users", href: "/admin/users-list", icon: "👥" },
                { label: "Subscriptions", href: "/admin/subscriptions", icon: "🎁" },
                { label: "Support Tickets", href: "/admin/support", icon: "🎫" },
                { label: "Banned Users", href: "/admin/banned", icon: "🚫" },
              ],
            },
            {
              title: "System Settings",
              description: "Configure platform settings and features",
              icon: "⚙️",
              links: [
                { label: "Site Settings", href: "/admin/settings", icon: "🔧" },
                { label: "Email Templates", href: "/admin/email", icon: "✉️" },
                { label: "Categories", href: "/admin/categories", icon: "🏷️" },
                { label: "Notifications", href: "/admin/notifications-config", icon: "🔔" },
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
                <span className="text-3xl">{section.icon}</span>
                <div>
                  <h3 className="text-xl font-bold">{section.title}</h3>
                  <p className="text-sm text-gray-400">{section.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6 pt-6 border-t border-white/10">
                {section.links.map((link, j) => (
                  <Link
                    key={j}
                    href={link.href}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition text-sm font-medium group"
                  >
                    <span>{link.icon}</span>
                    <span className="group-hover:translate-x-1 transition">
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
