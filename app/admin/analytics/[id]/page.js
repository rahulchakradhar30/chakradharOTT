"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { useParams } from "next/navigation";

export default function MovieAnalytics() {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);
  const [boostInput, setBoostInput] = useState(0);
  const [ratingBoostInput, setRatingBoostInput] = useState(0);
  const [ratingCountBoostInput, setRatingCountBoostInput] = useState(0);

  const [realRatingAverage, setRealRatingAverage] = useState(0);
  const [realRatingCount, setRealRatingCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const snap = await getDoc(doc(db, "movies", id));
      if (!snap.exists()) return;

      const movieData = snap.data();
      setMovie(movieData);
      setBoostInput(movieData.viewsBoost || 0);
      setRatingBoostInput(movieData.ratingBoost || 0);
      setRatingCountBoostInput(movieData.ratingCountBoost || 0);

      const q = query(
        collection(db, "ratings"),
        where("movieId", "==", id)
      );

      const ratingSnap = await getDocs(q);

      const ratings = ratingSnap.docs.map((d) => d.data().rating);
      const count = ratings.length;

      const avg =
        count === 0
          ? 0
          : ratings.reduce((a, b) => a + b, 0) / count;

      setRealRatingAverage(avg);
      setRealRatingCount(count);
    };

    fetchData();
  }, [id]);

  if (!movie) return null;

  const viewsReal = movie.viewsReal || 0;
  const viewsBoost = movie.viewsBoost || 0;
  const totalViews = viewsReal + viewsBoost;

  const finalRating =
    realRatingAverage + (movie.ratingBoost || 0);

  const finalRatingCount =
    realRatingCount + (movie.ratingCountBoost || 0);

  // Engagement Ratio (Real Data Only)
  const engagement =
    viewsReal === 0
      ? 0
      : ((realRatingCount / viewsReal) * 100);

  const handleSave = async () => {
    await updateDoc(doc(db, "movies", id), {
      viewsBoost: Number(boostInput) || 0,
      ratingBoost: Number(ratingBoostInput) || 0,
      ratingCountBoost: Number(ratingCountBoostInput) || 0,
    });

    setMovie((prev) => ({
      ...prev,
      viewsBoost: Number(boostInput) || 0,
      ratingBoost: Number(ratingBoostInput) || 0,
      ratingCountBoost: Number(ratingCountBoostInput) || 0,
    }));

    alert("Boost values updated successfully.");
  };

  const handleReset = async () => {
    const confirmReset = confirm(
      "Are you sure you want to reset all boost values? Real data will remain untouched."
    );

    if (!confirmReset) return;

    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;

    const answer = prompt(`CAPTCHA: What is ${a} + ${b}?`);

    if (Number(answer) !== a + b) {
      alert("Incorrect CAPTCHA. Reset cancelled.");
      return;
    }

    await updateDoc(doc(db, "movies", id), {
      viewsBoost: 0,
      ratingBoost: 0,
      ratingCountBoost: 0,
    });

    setBoostInput(0);
    setRatingBoostInput(0);
    setRatingCountBoostInput(0);

    setMovie((prev) => ({
      ...prev,
      viewsBoost: 0,
      ratingBoost: 0,
      ratingCountBoost: 0,
    }));

    alert("All boost values reset successfully.");
  };

  return (
    <div className="space-y-10">

      <div className="admin-toolbar items-end">
        <div className="admin-section max-w-3xl">
          <p className="admin-kicker">Movie Intelligence</p>
          <h1 className="admin-title">{movie.title} analytics</h1>
          <p className="admin-lead">Review the real data, understand the boost layer, and adjust the display metrics with fewer surprises.</p>
        </div>

        <div className="admin-chip">Studio analytics</div>
      </div>

      {/* KPI GRID */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5">

        <div className="admin-surface p-6 rounded-3xl shadow-xl">
          <p className="text-gray-400 text-sm uppercase tracking-[0.2em]">Real Views</p>
          <p className="admin-metric-value mt-2">
            {viewsReal.toLocaleString()}
          </p>
        </div>

        <div className="admin-surface p-6 rounded-3xl shadow-xl">
          <p className="text-gray-400 text-sm uppercase tracking-[0.2em]">Total Displayed Views</p>
          <p className="admin-metric-value mt-2 text-emerald-300">
            {totalViews.toLocaleString()}
          </p>
        </div>

        <div className="admin-surface p-6 rounded-3xl shadow-xl">
          <p className="text-gray-400 text-sm uppercase tracking-[0.2em]">Real Rating</p>
          <p className="admin-metric-value mt-2">
            {realRatingAverage.toFixed(2)}
          </p>
        </div>

        <div className="admin-surface p-6 rounded-3xl shadow-xl">
          <p className="text-gray-400 text-sm uppercase tracking-[0.2em]">Engagement Ratio</p>
          <p className="admin-metric-value mt-2 text-amber-300">
            {engagement.toFixed(2)}%
          </p>
          <p className="text-xs text-gray-500">
            (Real Ratings / Real Views)
          </p>
        </div>

      </div>

      {/* MANIPULATION PANEL */}
      <div className="admin-surface p-8 rounded-[1.75rem] shadow-xl max-w-2xl">

        <h2 className="text-2xl font-semibold mb-2">
          Manipulate Metrics
        </h2>
        <p className="text-sm text-gray-400 mb-6">Use these adjustments carefully. They only change display values.</p>

        <div className="space-y-4">

          <div>
            <label className="block text-sm mb-2">Views Boost</label>
            <input
              type="number"
              value={boostInput}
              onChange={(e) => setBoostInput(e.target.value)}
              className="admin-input focus-ring"
            />
          </div>

          <div>
            <label className="block text-sm mb-2">Rating Boost</label>
            <input
              type="number"
              step="0.1"
              value={ratingBoostInput}
              onChange={(e) =>
                setRatingBoostInput(e.target.value)
              }
              className="admin-input focus-ring"
            />
          </div>

          <div>
            <label className="block text-sm mb-2">Rating Count Boost</label>
            <input
              type="number"
              value={ratingCountBoostInput}
              onChange={(e) =>
                setRatingCountBoostInput(e.target.value)
              }
              className="admin-input focus-ring"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              onClick={handleSave}
              className="admin-button admin-button-primary"
            >
              Save Boost
            </button>

            <button
              onClick={handleReset}
              className="admin-button px-6 py-2 bg-rose-500/15 text-rose-100 border border-rose-300/20"
            >
              Reset All Boosts
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}