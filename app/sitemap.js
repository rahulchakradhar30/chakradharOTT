import { SITE_URL } from "@/lib/seo";

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

  const genreMap = new Map();
  [...movies, ...premieres].forEach((item) => {
    if (item?.genre) {
      genreMap.set(String(item.genre).trim(), true);
    }
  });

  const dynamicGenres = Array.from(genreMap.keys()).filter(Boolean);

  return [
    ...STATIC_ROUTES.map((path) => ({
      url: createUrl(path),
      lastModified: new Date(),
      changeFrequency: path === "/" ? "daily" : "weekly",
      priority: path === "/" ? 1 : 0.7,
    })),
    ...dynamicGenres.map((genre) => ({
      url: createUrl(`/genre/${encodeURIComponent(genre)}`),
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    })),
    ...movies.map((movie) => ({
      url: createUrl(`/movie/${movie.id}`),
      lastModified: toDate(movie.updatedAt || movie.createdAt),
      changeFrequency: "weekly",
      priority: 0.9,
    })),
    ...premieres.map((premiere) => ({
      url: createUrl(`/premiere/${premiere.id}`),
      lastModified: toDate(premiere.updatedAt || premiere.createdAt || premiere.startTime),
      changeFrequency: "weekly",
      priority: 0.85,
    })),
  ];
}
