"use client";

import { useCallback, useEffect, useState } from "react";
import { db } from "@/firebase";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { slugifyGenre } from "./seo";

/**
 * Advanced search engine with caching and intelligent filtering
 */
export function useAdvancedSearch() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cache, setCache] = useState(new Map());

  const search = useCallback(async (searchTerm, filters = {}) => {
    if (!searchTerm?.trim()) {
      setResults([]);
      return;
    }

    const cacheKey = `${searchTerm}-${JSON.stringify(filters)}`;

    // Check cache first
    if (cache.has(cacheKey)) {
      setResults(cache.get(cacheKey));
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const searchLower = searchTerm.toLowerCase();
      const moviesSnapshot = await getDocs(collection(db, "movies"));
      const premieresSnapshot = await getDocs(collection(db, "premieres"));

      let movies = moviesSnapshot.docs.map((doc) => ({
        id: doc.id,
        type: "movie",
        ...doc.data(),
      }));

      let premieres = premieresSnapshot.docs.map((doc) => ({
        id: doc.id,
        type: "premiere",
        ...doc.data(),
      }));

      // Search in title, description, genre
      const allItems = [...movies, ...premieres].filter((item) => {
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

      const cachedResults = allItems.slice(0, 50); // Limit to 50 results
      cache.set(cacheKey, cachedResults);
      setCache(new Map(cache)); // Trigger re-render
      setResults(cachedResults);
    } catch (err) {
      console.error("Search error:", err);
      setError("Failed to search. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [cache]);

  const clearCache = useCallback(() => {
    setCache(new Map());
  }, []);

  return { results, loading, error, search, clearCache };
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

        // Get all movies
        const moviesSnapshot = await getDocs(collection(db, "movies"));
        const allMovies = moviesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

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
    const moviesSnapshot = await getDocs(
      query(
        collection(db, "movies"),
        where("isTrending", "==", true),
        orderBy("viewCount", "desc"),
        limit(20)
      )
    );

    return moviesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
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
    const [moviesSnapshot, premiersSnapshot] = await Promise.all([
      getDocs(collection(db, "movies")),
      getDocs(collection(db, "premieres")),
    ]);

    const movies = moviesSnapshot.docs.map((doc) => ({
      id: doc.id,
      type: "movie",
      ...doc.data(),
    }));

    const premiers = premiersSnapshot.docs.map((doc) => ({
      id: doc.id,
      type: "premiere",
      ...doc.data(),
    }));

    const allContent = [...movies, ...premiers];
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
