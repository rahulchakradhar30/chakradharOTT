"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useAdvancedSearch } from "@/lib/searchEngine";
import FormInput from "@/components/FormInput";
import EmptyState from "@/components/EmptyState";
import { SkeletonGrid } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { MovieIcon } from "@/components/Icon";

const GENRES = [
  "Action",
  "Comedy",
  "Drama",
  "Horror",
  "Thriller",
  "Romance",
  "Sci-Fi",
  "Fantasy",
  "Animation",
  "Documentary",
];

const SORT_OPTIONS = [
  { value: "relevance", label: "Most Relevant" },
  { value: "newest", label: "Newest First" },
  { value: "rating", label: "Highest Rated" },
  { value: "trending", label: "Trending" },
];

export default function SearchClient() {
  const { addToast } = useToast();
  const { results, loading, error, search } = useAdvancedSearch();

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState({
    genre: "",
    type: "all",
    year: "",
    sortBy: "relevance",
  });
  const [showFilters, setShowFilters] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Trigger search
  useEffect(() => {
    if (debouncedSearch.trim()) {
      search(debouncedSearch, filters);
    }
  }, [debouncedSearch, filters, search]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      genre: "",
      type: "all",
      year: "",
      sortBy: "relevance",
    });
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
  };

  return (
    <div className="min-h-screen px-4 md:px-10 lg:px-16 py-10 md:py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header */}
        <div className="mb-10">
          <p className="admin-kicker mb-2">Search & Discover</p>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-3">
            Find Your Next Favorite
          </h1>
          <p className="text-gray-400 text-sm md:text-base">
            Advanced search with smart filters and personalized results
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative mb-8">
          <FormInput
            value={searchTerm}
            onChange={handleSearch}
            placeholder="Search by title, genre, actor..."
            icon="🔍"
            className="w-full"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Toggle */}
        <div className="mb-6 flex gap-3 flex-wrap">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition font-medium border border-white/20"
          >
            {showFilters ? "Hide Filters" : "Show Filters"}
          </button>
          {(filters.genre || filters.year || filters.type !== "all") && (
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition font-medium border border-white/20"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-8 glass-card rounded-[2rem] p-6 border border-white/10"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Genre Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Genre
                  </label>
                  <select
                    value={filters.genre}
                    onChange={(e) => handleFilterChange("genre", e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Genres</option>
                    {GENRES.map((genre) => (
                      <option key={genre} value={genre}>
                        {genre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Type
                  </label>
                  <select
                    value={filters.type}
                    onChange={(e) => handleFilterChange("type", e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Types</option>
                    <option value="movie">Movies</option>
                    <option value="premiere">Premieres</option>
                  </select>
                </div>

                {/* Year Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Year
                  </label>
                  <input
                    type="number"
                    value={filters.year}
                    onChange={(e) => handleFilterChange("year", e.target.value)}
                    placeholder="2024"
                    className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Sort Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Sort By
                  </label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange("sortBy", e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Count */}
        {searchTerm && (
          <div className="mb-6 text-sm text-gray-400">
            {loading ? (
              "Searching..."
            ) : (
              <>
                Found <span className="text-white font-medium">{results.length}</span> result
                {results.length !== 1 ? "s" : ""}
              </>
            )}
          </div>
        )}

        {/* Results */}
        {error ? (
          <EmptyState
            title="Search failed"
            description={error}
            icon="❌"
            action={{
              label: "Try Again",
              onClick: () => setSearchTerm(""),
            }}
          />
        ) : loading ? (
          <SkeletonGrid count={12} columns={5} />
        ) : searchTerm && results.length === 0 ? (
          <EmptyState
            title="No results found"
            description={`No movies or premieres match "${searchTerm}". Try different keywords or adjust filters.`}
            icon="🔎"
            action={{
              label: "Clear Search",
              onClick: () => setSearchTerm(""),
            }}
          />
        ) : searchTerm ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5 md:gap-7">
            {results.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.02 }}
              >
                <Link
                  href={
                    item.type === "movie"
                      ? `/movie/${item.id}`
                      : `/premiere/${item.id}/join`
                  }
                  className="group block"
                >
                  <div className="relative aspect-[2/3] rounded-2xl overflow-hidden border border-white/15 bg-[#0b1328] transition duration-500 group-hover:-translate-y-1 group-hover:border-cyan-300/50 group-hover:shadow-lg group-hover:shadow-cyan-500/20">
                    <Image
                      src={
                        item.posterImage ||
                        "https://images.unsplash.com/photo-1524985069026-dd778a71c7b4"
                      }
                      alt={item.title}
                      fill
                      className="object-cover transition duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#04070f] via-transparent to-transparent" />
                    <div className="absolute top-3 right-3">
                      <span className="inline-flex items-center gap-1 bg-[#0b1328]/80 backdrop-blur-lg border border-white/20 px-2.5 py-1 rounded-lg text-[10px] uppercase font-bold tracking-wider">
                        {item.type === "movie" ? (
                          <>
                            <MovieIcon className="w-3.5 h-3.5 text-cyan-400" />
                            <span className="text-cyan-100">Movie</span>
                          </>
                        ) : (
                          <>
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-red-400 font-bold">Live</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                  <h3 className="mt-3 text-sm md:text-base text-gray-200 group-hover:text-white line-clamp-2 font-medium">
                    {item.title}
                  </h3>
                  {item.genre && (
                    <p className="text-xs text-gray-500 mt-1">{item.genre}</p>
                  )}
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Start searching"
            description="Use the search bar above to find movies, premieres, genres, and more."
            icon="🔍"
          />
        )}
      </motion.div>
    </div>
  );
}
