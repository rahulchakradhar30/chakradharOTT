"use client";

import { useCallback, useEffect, useState } from "react";
import { db } from "@/firebase";
import { collection, getDocs } from "firebase/firestore";
import { slugifyGenre } from "./seo";

// Session-level timed caches to minimize Firestore read counts
let cachedMovies = null;
let cachedPremieres = null;
let lastCacheFetch = 0;
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes TTL

export async function getCachedData() {
  const now = Date.now();
  if (cachedMovies && cachedPremieres && (now - lastCacheFetch < CACHE_TTL)) {
    return { movies: cachedMovies, premieres: cachedPremieres };
  }

  try {
    const [moviesSnapshot, premieresSnapshot] = await Promise.all([
      getDocs(collection(db, "movies")),
      getDocs(collection(db, "premieres"))
    ]);

    cachedMovies = moviesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    cachedPremieres = premieresSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    lastCacheFetch = now;
    return { movies: cachedMovies, premieres: cachedPremieres };
  } catch (err) {
    console.error("Firestore cache pre-fetch error:", err);
    // Return stale cache if load fails
    return {
      movies: cachedMovies || [],
      premieres: cachedPremieres || []
    };
  }
}

/**
 * Advanced search engine with caching and intelligent filtering
 */
export function useAdvancedSearch() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const search = useCallback(async (searchTerm, filters = {}) => {
    if (!searchTerm?.trim()) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const searchLower = searchTerm.toLowerCase();
      const { movies, premieres } = await getCachedData();

      const movieItems = movies.map((doc) => ({
        type: "movie",
        ...doc,
      }));

      const premiereItems = premieres.map((doc) => ({
        type: "premiere",
        ...doc,
      }));

      // Search in title, description, genre
      const allItems = [...movieItems, ...premiereItems].filter((item) => {
        const title = (item.title || "").toLowerCase();
        const description = (item.description || "").toLowerCase();
        const genre = (item.genre || "").toLowerCase();

        const matchesSearch =
          title.includes(searchLower) ||
          description.includes(searchLower) ||
          genre.includes(searchLower);

        if (!matchesSearch) return false;

        // Apply filters
        if (filters.genre && item.genre !== filters.genre) return false;
        if (filters.year && item.releaseYear !== filters.year) return false;
        if (filters.type && item.type !== filters.type) return false;
        if (
          filters.minRating &&
          (item.rating || 0) < filters.minRating
        )
          return false;

        return true;
      });

      // Sort by relevance (title matches first)
      allItems.sort((a, b) => {
        const aTitle = (a.title || "").toLowerCase();
        const bTitle = (b.title || "").toLowerCase();
        const aMatch = aTitle.startsWith(searchLower) ? 1 : 0;
        const bMatch = bTitle.startsWith(searchLower) ? 1 : 0;
        return bMatch - aMatch;
      });

      setResults(allItems.slice(0, 50));
    } catch (err) {
      console.error("Search error:", err);
      setError("Failed to search. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, error, search };
}

/**
 * Recommendation engine based on user viewing patterns
 */
export function useRecommendations(userHistory = []) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userHistory || userHistory.length === 0) {
      setRecommendations([]);
      return;
    }

    const loadRecommendations = async () => {
      try {
        setLoading(true);
        const { movies: allMovies } = await getCachedData();

        // Extract genres from watched movies
        const watchedGenres = new Set();
        userHistory.forEach((historyItem) => {
          const movie = allMovies.find((m) => m.id === historyItem.movieId);
          if (movie?.genre) {
            watchedGenres.add(movie.genre);
          }
        });

        // Find movies with same genres
        const recommended = allMovies.filter(
          (movie) =>
            !userHistory.find((h) => h.movieId === movie.id) &&
            (watchedGenres.has(movie.genre) ||
              movie.isTrending ||
              movie.isFeatured)
        );

        // Sort by trending/featured/rating
        recommended.sort((a, b) => {
          const aScore = (a.isTrending ? 10 : 0) + (a.isFeatured ? 5 : 0) + (a.rating || 0);
          const bScore = (b.isTrending ? 10 : 0) + (b.isFeatured ? 5 : 0) + (b.rating || 0);
          return bScore - aScore;
        });

        setRecommendations(recommended.slice(0, 20));
      } catch (err) {
        console.error("Recommendation error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadRecommendations();
  }, [userHistory]);

  return { recommendations, loading };
}

/**
 * Trending content calculator
 */
export async function getTrendingContent() {
  try {
    const { movies } = await getCachedData();
    const trending = movies
      .filter((m) => m.isTrending)
      .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
    return trending.slice(0, 20);
  } catch (err) {
    console.error("Trending error:", err);
    return [];
  }
}

/**
 * Content discovery by category
 */
export async function getContentByGenre(genreSlugOrName) {
  try {
    const { movies, premieres } = await getCachedData();
    const movieItems = movies.map((m) => ({ ...m, type: "movie" }));
    const premiereItems = premieres.map((p) => ({ ...p, type: "premiere" }));
    const allContent = [...movieItems, ...premiereItems];
    const targetSlug = slugifyGenre(genreSlugOrName);

    return allContent.filter((item) => {
      if (!item.genre) return false;
      const parts = String(item.genre).split(",");
      return parts.some((part) => slugifyGenre(part) === targetSlug);
    });
  } catch (err) {
    console.error("Genre fetch error:", err);
    return [];
  }
}
