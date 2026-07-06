import { SITE_URL, slugifyGenre } from "@/lib/seo";

export const dynamic = "force-dynamic";

const STATIC_ROUTES = [
  "/",
  "/accessibility",
  "/contact",
  "/dashboard",
  "/discover",
  "/login",
  "/movies",
  "/notifications",
  "/posters",
  "/pricing",
  "/privacy",
  "/profile",
  "/search",
  "/terms",
  "/trivia",
  "/watch-party",
  "/ai-assistant",
];

function toDate(value) {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (typeof value?.toDate === "function") return value.toDate();
  if (typeof value === "object" && typeof value._seconds === "number") {
    return new Date(value._seconds * 1000 + Math.floor((value._nanoseconds || 0) / 1e6));
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function createUrl(path) {
  return `${SITE_URL}${path}`;
}

/**
 * Generates the dynamic XML sitemap.
 * @returns {Promise<import('next').MetadataRoute.Sitemap>}
 */
export default async function sitemap() {
  let movies = [];
  let premieres = [];

  try {
    if (
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
    ) {
      const { adminDb } = await import("@/lib/firebaseAdmin");

      const [moviesSnap, premieresSnap] = await Promise.all([
        adminDb.collection("movies").get().catch(() => null),
        adminDb.collection("premieres").get().catch(() => null),
      ]);

      movies = moviesSnap?.docs.map((doc) => ({ id: doc.id, ...doc.data() })) || [];
      premieres = premieresSnap?.docs.map((doc) => ({ id: doc.id, ...doc.data() })) || [];
    }
  } catch (error) {
    console.error("Sitemap generation error:", error);
  }

  // Parse and extract unique genres, filtering out null/undefined/empty/malformed values
  const genreSet = new Set();
  [...movies, ...premieres].forEach((item) => {
    if (item?.genre) {
      const parts = String(item.genre).split(",");
      parts.forEach((part) => {
        const trimmed = part.trim();
        if (
          trimmed &&
          trimmed.toLowerCase() !== "undefined" &&
          trimmed.toLowerCase() !== "null"
        ) {
          genreSet.add(trimmed);
        }
      });
    }
  });

  // Map unique genres to unique slugs to prevent duplicates
  const uniqueGenres = Array.from(genreSet);
  const slugSet = new Set();
  const dynamicGenres = [];

  uniqueGenres.forEach((genre) => {
    const slug = slugifyGenre(genre);
    if (slug && !slugSet.has(slug)) {
      slugSet.add(slug);
      dynamicGenres.push({
        name: genre,
        slug: slug,
      });
    }
  });

  // Filter and validate movies to remove drafts or entries with malformed/missing IDs
  const validMovies = movies.filter(
    (movie) =>
      movie &&
      movie.id &&
      typeof movie.id === "string" &&
      movie.id.trim() &&
      !movie.id.includes(" ") &&
      movie.id.toLowerCase() !== "undefined" &&
      movie.id.toLowerCase() !== "null"
  );

  // Filter and validate premieres to remove drafts or entries with malformed/missing IDs
  const validPremieres = premieres.filter(
    (premiere) =>
      premiere &&
      premiere.id &&
      typeof premiere.id === "string" &&
      premiere.id.trim() &&
      !premiere.id.includes(" ") &&
      premiere.id.toLowerCase() !== "undefined" &&
      premiere.id.toLowerCase() !== "null"
  );

  return [
    ...STATIC_ROUTES.map((path) => ({
      url: createUrl(path),
      lastModified: new Date(),
      changeFrequency: path === "/" ? "daily" : "weekly",
      priority: path === "/" ? 1.0 : 0.7,
    })),
    ...dynamicGenres.map((genreInfo) => ({
      url: createUrl(`/genre/${genreInfo.slug}`),
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    })),
    ...validMovies.map((movie) => ({
      url: createUrl(`/movie/${movie.id}`),
      lastModified: toDate(movie.updatedAt || movie.createdAt),
      changeFrequency: "weekly",
      priority: 0.9,
    })),
    ...validPremieres.map((premiere) => ({
      url: createUrl(`/premiere/${premiere.id}`),
      lastModified: toDate(premiere.updatedAt || premiere.createdAt || premiere.startTime),
      changeFrequency: "weekly",
      priority: 0.85,
    })),
  ];
}

