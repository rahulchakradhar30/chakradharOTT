"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  limit,
} from "firebase/firestore";
import { motion } from "framer-motion";
import { SkeletonGrid } from "@/components/Skeleton";

export default function AnalyticsDashboard() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    totalEvents: 0,
    totalUsers: 0,
    eventTypes: {},
    topSearches: [],
    contentViews: {},
  });

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    const loadAnalytics = async () => {
      try {

        const timeframe = new Date();
        timeframe.setDate(timeframe.getDate() - 30);

        // Get all events
        const eventsSnap = await getDocs(
          query(
            collection(db, "analyticsEvents"),
            where("timestamp", ">=", timeframe),
            orderBy("timestamp", "desc"),
            limit(1000)
          )
        );

        const events = [];
        const uniqueUsers = new Set();
        const eventTypeCount = {};
        const contentViewCount = {};

        eventsSnap.forEach((doc) => {
          const data = doc.data();
          events.push(data);

          if (data.userId) {
            uniqueUsers.add(data.userId);
          }

          // Count event types
          eventTypeCount[data.eventType] =
            (eventTypeCount[data.eventType] || 0) + 1;

          // Count content views
          if (data.contentId) {
            contentViewCount[data.contentId] =
              (contentViewCount[data.contentId] || 0) + 1;
          }
        });

        // Get top searches
        const searchesSnap = await getDocs(
          query(
            collection(db, "searchAnalytics"),
            orderBy("count", "desc"),
            limit(10)
          )
        );

        const topSearches = [];
        searchesSnap.forEach((doc) => {
          topSearches.push({
            query: doc.data().query,
            count: doc.data().count,
          });
        });

        setAnalytics({
          totalEvents: events.length,
          totalUsers: uniqueUsers.size,
          eventTypes: eventTypeCount,
          topSearches,
          contentViews: Object.entries(contentViewCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .reduce((acc, [key, val]) => {
              acc[key] = val;
              return acc;
            }, {}),
        });
      } catch (err) {
        console.error("Error loading analytics:", err);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
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
          <p className="admin-kicker mb-2">Analytics</p>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2">
            Platform Analytics
          </h1>
          <p className="text-gray-400">Last 30 days performance metrics</p>
        </div>

        {loading ? (
          <SkeletonGrid count={4} columns={4} />
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
              {[
                {
                  label: "Total Events",
                  value: analytics.totalEvents.toLocaleString(),
                  icon: "📊",
                  color: "from-blue-600",
                },
                {
                  label: "Active Users",
                  value: analytics.totalUsers.toLocaleString(),
                  icon: "👥",
                  color: "from-cyan-600",
                },
                {
                  label: "Avg Events/User",
                  value: analytics.totalUsers > 0
                    ? (analytics.totalEvents / analytics.totalUsers).toFixed(1)
                    : "0",
                  icon: "📈",
                  color: "from-purple-600",
                },
                {
                  label: "Unique Content",
                  value: Object.keys(analytics.contentViews).length,
                  icon: "🎬",
                  color: "from-pink-600",
                },
              ].map((metric, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className={`glass-card rounded-2xl p-6 border border-white/10 bg-gradient-to-br ${metric.color} via-transparent`}
                >
                  <p className="text-gray-400 text-sm">{metric.label}</p>
                  <p className="text-3xl font-black mt-2">{metric.value}</p>
                  <p className="text-2xl mt-4 opacity-50">{metric.icon}</p>
                </motion.div>
              ))}
            </div>

            {/* Event Types Breakdown */}
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              {/* Event Types */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="glass-card rounded-2xl p-8 border border-white/10"
              >
                <h3 className="text-xl font-bold mb-6">Event Types</h3>
                <div className="space-y-4">
                  {Object.entries(analytics.eventTypes)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 8)
                    .map(([type, count], i) => (
                      <div key={type} className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium capitalize">
                              {type.replace(/_/g, " ")}
                            </span>
                            <span className="text-xs text-gray-400">
                              {count}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-white/10 rounded">
                            <motion.div
                              className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded"
                              initial={{ width: 0 }}
                              animate={{
                                width: `${
                                  (count / Object.values(analytics.eventTypes)[0]) *
                                  100
                                }%`,
                              }}
                              transition={{ duration: 0.5, delay: i * 0.05 }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </motion.div>

              {/* Top Searches */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="glass-card rounded-2xl p-8 border border-white/10"
              >
                <h3 className="text-xl font-bold mb-6">Top Searches</h3>
                {analytics.topSearches.length === 0 ? (
                  <p className="text-gray-400 text-sm">No search data available</p>
                ) : (
                  <div className="space-y-3">
                    {analytics.topSearches.map((search, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition"
                      >
                        <span className="text-sm">
                          {i + 1}. {search.query}
                        </span>
                        <span className="text-xs bg-cyan-500/20 px-3 py-1 rounded-full">
                          {search.count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>

            {/* Top Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="glass-card rounded-2xl p-8 border border-white/10"
            >
              <h3 className="text-xl font-bold mb-6">Top Viewed Content</h3>
              {Object.entries(analytics.contentViews).length === 0 ? (
                <p className="text-gray-400 text-sm">No content view data available</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 font-semibold">Content ID</th>
                        <th className="text-right py-3 font-semibold">Views</th>
                        <th className="text-right py-3 font-semibold">% of Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(analytics.contentViews).map(
                        ([contentId, views], i) => (
                          <tr
                            key={contentId}
                            className="border-b border-white/5 hover:bg-white/5 transition"
                          >
                            <td className="py-3">
                              <span className="text-cyan-400">#{i + 1}</span>
                              <br />
                              <span className="text-xs text-gray-500">
                                {contentId}
                              </span>
                            </td>
                            <td className="text-right py-3 font-semibold">
                              {views}
                            </td>
                            <td className="text-right py-3">
                              {(
                                (views /
                                  Object.values(analytics.contentViews).reduce(
                                    (a, b) => a + b,
                                    0
                                  )) *
                                100
                              ).toFixed(1)}
                              %
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          </>
        )}
      </motion.div>
    </div>
  );
}
