"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { getContentByGenre } from "@/lib/searchEngine";
import { SkeletonGrid } from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";
import { getReadableGenreName, slugifyGenre } from "@/lib/seo";

const GENRE_DESCRIPTIONS = {
  Action: "Heart-pounding adventures filled with thrilling sequences",
  Comedy: "Laugh out loud with hilarious characters and witty humor",
  Drama: "Compelling stories that explore the depth of human experience",
  Horror: "Spine-chilling tales designed to frighten and unsettle",
  Thriller: "Edge-of-your-seat suspense that keeps you guessing",
  Romance: "Heartfelt stories of love and connection",
  "Sci-Fi": "Futuristic worlds and mind-bending concepts",
  Fantasy: "Magical realms and extraordinary adventures",
  Animation: "Beautifully crafted animated stories for all ages",
  Documentary: "Real stories and fascinating insights",
};

const GENRE_COLORS = {
  Action: "from-red-600 to-red-900",
  Comedy: "from-yellow-500 to-orange-900",
  Drama: "from-purple-600 to-purple-900",
  Horror: "from-gray-800 to-black",
  Thriller: "from-blue-700 to-indigo-900",
  Romance: "from-pink-600 to-pink-900",
  "Sci-Fi": "from-cyan-600 to-blue-900",
  Fantasy: "from-emerald-600 to-emerald-900",
  Animation: "from-violet-600 to-violet-900",
  Documentary: "from-amber-600 to-amber-900",
};

export default function GenreClient() {
  const params = useParams();
  const genreSlug = params.genre || "";

  const [genreName, setGenreName] = useState(getReadableGenreName(genreSlug));
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadContent = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getContentByGenre(genreSlug);
        setContent(data);

        // Resolve original database capitalization/spacing if a match exists in the records
        const targetSlug = slugifyGenre(genreSlug);
        let foundName = null;
        for (const item of data) {
          if (!item.genre) continue;
          const parts = String(item.genre).split(",");
          for (const part of parts) {
            if (slugifyGenre(part) === targetSlug) {
              foundName = part.trim();
              break;
            }
          }
          if (foundName) break;
        }

        if (foundName) {
          setGenreName(foundName);
        } else {
          setGenreName(getReadableGenreName(genreSlug));
        }
      } catch (err) {
        console.error("Error loading genre content:", err);
        setError("Failed to load content");
      } finally {
        setLoading(false);
      }
    };

    if (genreSlug) {
      loadContent();
    }
  }, [genreSlug]);

  const gradientClass = GENRE_COLORS[genreName] || "from-blue-600 to-blue-900";
  const description = GENRE_DESCRIPTIONS[genreName] || "Explore amazing content";

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className={`relative h-[40vh] md:h-[50vh] bg-gradient-to-br ${gradientClass} overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-r from-[#04070f] via-transparent to-[#04070f]" />
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-30" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full blur-3xl opacity-30" />

        <div className="relative h-full flex items-center px-4 md:px-10 lg:px-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-sm md:text-base uppercase tracking-widest text-white/80 mb-2">
              Genre
            </p>
            <h1 className="text-4xl md:text-6xl font-black mb-4 text-white">{genreName}</h1>
            <p className="text-lg md:text-xl text-white/90 max-w-2xl">{description}</p>
            <div className="mt-6 flex gap-3">
              <div className="px-4 py-2 rounded-full bg-white/15 border border-white/30 text-sm">
                {content.length} titles
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content Section */}
      <div className="px-4 md:px-10 lg:px-16 py-12 md:py-16">
        {error ? (
          <EmptyState
            title="Something went wrong"
            description={error}
            icon="❌"
          />
        ) : loading ? (
          <SkeletonGrid count={15} columns={5} />
        ) : content.length === 0 ? (
          <EmptyState
            title="No content available"
            description={`No ${genreName.toLowerCase()} titles available yet. Check back soon!`}
            icon="🎬"
          />
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-2xl md:text-3xl font-black tracking-tight">
                All {genreName} Content
              </h2>
              <p className="text-gray-400 text-sm mt-2">
                Browse {content.length} amazing {genreName.toLowerCase()} titles
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5 md:gap-7">
              {content.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: Math.min(index * 0.02, 0.2) }}
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
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#04070f] via-transparent to-transparent" />
                      <div className="absolute inset-x-3 bottom-3 opacity-0 group-hover:opacity-100 transition duration-300">
                        <span className="inline-block bg-white/15 backdrop-blur-lg border border-white/25 px-3 py-1.5 rounded-full text-xs font-medium">
                          View →
                        </span>
                      </div>
                    </div>
                    <h3 className="mt-3 text-sm md:text-base text-gray-200 group-hover:text-white line-clamp-2 font-medium">
                      {item.title}
                    </h3>
                  </Link>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

