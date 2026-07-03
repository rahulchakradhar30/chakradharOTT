"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebase";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import Link from "next/link";
import { motion } from "framer-motion";

export default function SearchAnalytics() {
  const [searchData, setSearchData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSearches: 0,
    uniqueQueries: 0,
    avgSearchesPerUser: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const searchSnap = await getDocs(
          query(collection(db, "searchAnalytics"), orderBy("count", "desc"), limit(50))
        );

        const searches = searchSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        setSearchData(searches);

        // Calculate stats
        const totalSearches = searches.reduce((sum, s) => sum + (s.count || 0), 0);
        const uniqueQueries = searches.length;

        setStats({
          totalSearches,
          uniqueQueries,
          avgSearchesPerUser: uniqueQueries > 0 ? Math.round(totalSearches / uniqueQueries) : 0,
        });
      } catch (error) {
        console.error("Fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="space-y-10 pb-16">
      {/* HEADER */}
      <motion.div initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} className="admin-toolbar items-end">
        <div className="admin-section max-w-2xl">
          <p className="admin-kicker text-cyan-300 text-sm tracking-widest">✦ Search Analytics</p>
          <h1 className="admin-title text-4xl font-black">Search Insights</h1>
          <p className="admin-lead text-gray-300">Track user search behavior, popular queries, and content discoverability.</p>
        </div>

        <Link href="/admin" className="admin-button admin-button-secondary text-sm">
          ← Back to Dashboard
        </Link>
      </motion.div>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[
          ["🔍 Total Searches", stats.totalSearches, "cyan"],
          ["📝 Unique Queries", stats.uniqueQueries, "blue"],
          ["📊 Avg per Query", stats.avgSearchesPerUser, "amber"],
        ].map(([label, value, tone]) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`glass-card rounded-2xl md:rounded-3xl p-6 md:p-8 border border-${tone}-400/20 bg-gradient-to-br from-${tone}-500/10 to-${tone}-500/5`}
          >
            <p className="text-xs uppercase tracking-widest font-bold text-gray-300 mb-3">{label}</p>
            <p className="text-3xl md:text-4xl font-black">{value}</p>
          </motion.div>
        ))}
      </div>

      {/* TOP SEARCHES */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-2xl md:rounded-3xl p-6 md:p-8 border border-cyan-400/20"
      >
        <h2 className="text-xl md:text-2xl font-bold mb-6">🔥 Top Search Queries</h2>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading search data...</div>
        ) : searchData.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No search data available yet.</div>
        ) : (
          <div className="space-y-3">
            {searchData.slice(0, 20).map((search, index) => {
              const maxCount = searchData[0]?.count || 1;
              const percentage = (search.count / maxCount) * 100;

              return (
                <motion.div
                  key={search.id}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.03 }}
                  className="group"
                >
                  <div className="flex items-center gap-4 mb-2">
                    <span className="text-sm font-bold text-gray-400 w-6">#{index + 1}</span>
                    <span className="text-sm md:text-base font-semibold flex-1 group-hover:text-cyan-300 transition">
                       &ldquo;{search.query || search.id}&rdquo;
                    </span>
                    <span className="text-sm font-bold text-cyan-300">{search.count} searches</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${percentage}%` }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.03 + 0.1 }}
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* INSIGHTS */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card rounded-2xl md:rounded-3xl p-6 md:p-8 border border-blue-400/20 bg-gradient-to-r from-blue-500/10 to-cyan-500/5"
      >
        <h2 className="text-xl md:text-2xl font-bold mb-6">💡 Search Insights</h2>

        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <span className="text-2xl">📈</span>
            <div>
              <p className="font-semibold">Popular Search Terms</p>
              <p className="text-sm text-gray-400">
                {searchData.length > 0
                  ? `Users are actively searching for content. The top query "${searchData[0]?.query || "content"}" has been searched ${searchData[0]?.count || 0} times.`
                  : "No search data available yet."}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 pt-4 border-t border-white/10">
            <span className="text-2xl">🎯</span>
            <div>
              <p className="font-semibold">Content Discovery Recommendation</p>
              <p className="text-sm text-gray-400">
                Consider creating content recommendations based on these search patterns, and ensure catalog includes movies related to these queries.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 pt-4 border-t border-white/10">
            <span className="text-2xl">⚡</span>
            <div>
              <p className="font-semibold">Quick Action</p>
              <p className="text-sm text-gray-400">
                Review the Discovery page to ensure popular content is marked as Featured or Trending.
              </p>
              <Link href="/admin/discovery" className="text-sm text-cyan-300 hover:text-cyan-200 font-semibold mt-2 inline-block">
                Go to Discovery Settings →
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
