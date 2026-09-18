export const runtime = "nodejs";
export const revalidate = 60;

import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebaseAdmin";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  buildBaseMetadata,
  buildMovieJsonLd,
  buildVideoObjectJsonLd,
  buildBreadcrumbJsonLd,
  jsonLdScript,
  absoluteUrl,
} from "@/lib/seo";
import ViewTracker from "@/components/ViewTracker";
import MovieActionBar from "@/components/MovieActionBar";
import MovieVideoSection from "@/components/MovieVideoSection";
import {
  Film,
  Calendar,
  Eye,
  Clapperboard,
  Users,
  Sparkles,
  Play,
  Share2,
  Star,
} from "lucide-react";

const CommentSection = dynamic(() => import("@/components/CommentSection"), {
  loading: () => <div className="h-44 bg-white/[0.04] rounded-2xl animate-pulse" />,
});

const RatingSection = dynamic(() => import("@/components/RatingSection"), {
  loading: () => <div className="h-28 bg-white/[0.04] rounded-2xl animate-pulse" />,
});

/* =========================
   METADATA
========================= */

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id;

  if (!id) return {};

  try {
    let movie = null;
    try {
      const snapshot = await adminDb.collection("movies").doc(id).get();
      if (snapshot && snapshot.exists) {
        movie = snapshot.data();
      }
    } catch (e) {
      console.warn("adminDb metadata fetch skipped:", e);
    }

    if (!movie) {
      try {
        const { db } = await import("@/firebase");
        const { doc, getDoc } = await import("firebase/firestore");
        const clientSnap = await getDoc(doc(db, "movies", id));
        if (clientSnap.exists()) {
          movie = clientSnap.data();
        }
      } catch (clientErr) {
        console.warn("Client db metadata fallback error:", clientErr);
      }
    }

    if (!movie) return {};

    const title = movie.title || "Movie";
    const description =
      movie.description?.slice(0, 160) ||
      movie.tagline ||
      "Watch premium movies on Chakradhar Stream.";
    const image =
      movie.bannerImage || movie.posterImage || "/homepage-banner.jpg";

    return buildBaseMetadata({
      title: `${title} | Chakradhar Stream`,
      description,
      path: `/movie/${id}`,
      image,
      keywords: [title, movie.genre, "Chakradhar Stream", "Movies", "Streaming"].filter(Boolean),
      type: "video.movie",
      openGraphTitle: `${title} | Chakradhar Stream`,
      openGraphDescription: description,
    });
  } catch {
    return buildBaseMetadata({
      title: "Movie | Chakradhar Stream",
      path: `/movie/${id}`,
    });
  }
}

function toText(val, fallback = "") {
  if (val === undefined || val === null) return fallback;
  if (typeof val === "string") return val.trim() || fallback;
  return String(val);
}

function toDisplayDate(val, fallback = "Release date pending") {
  if (!val) return fallback;
  if (typeof val?.toDate === "function") {
    return val.toDate().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  const dateObj = new Date(val);
  if (!isNaN(dateObj.getTime())) {
    return dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  return fallback;
}

/* =========================
   PAGE
========================= */

export default async function MovieDetail({ params }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id;

  if (!id) notFound();

  let movie = null;
  let recommendedMovies = [];

  // Primary: Attempt Admin DB fetch
  try {
    const [snapshot, allMoviesSnap] = await Promise.all([
      adminDb.collection("movies").doc(id).get(),
      adminDb.collection("movies").limit(10).get(),
    ]);

    if (snapshot && snapshot.exists) {
      movie = snapshot.data();
    }
    if (allMoviesSnap && allMoviesSnap.docs) {
      recommendedMovies = allMoviesSnap.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .filter((m) => m.id !== id);
    }
  } catch (error) {
    console.warn("Firestore adminDb query skipped:", error);
  }

  // Fallback: Attempt Firebase Client SDK fetch if adminDb was unconfigured or returned null
  if (!movie) {
    try {
      const { db } = await import("@/firebase");
      const { doc, getDoc, getDocs, collection, limit } = await import("firebase/firestore");

      const clientSnap = await getDoc(doc(db, "movies", id));
      if (clientSnap.exists()) {
        movie = clientSnap.data();
      }

      if (recommendedMovies.length === 0) {
        const allSnap = await getDocs(collection(db, "movies"), limit(10));
        recommendedMovies = allSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((m) => m.id !== id);
      }
    } catch (clientErr) {
      console.error("Firestore client fallback query failed:", clientErr);
    }
  }

  if (!movie) notFound();

  const title = toText(movie.title, "Untitled");
  const tagline = toText(movie.tagline, "");
  const description = toText(movie.description, "");
  const genre = toText(movie.genre, "Cinema");
  const releaseDate = toDisplayDate(movie.releaseDate, "2026");
  const director = toText(movie.director, "The Fifth Age Films");
  const cast = toText(movie.cast, "Chakradhar Stream Originals");
  const embedLink = toText(movie.embedLink, "");
  const videoUrl = toText(movie.videoUrl, "");

  const viewsReal = movie.viewsReal || 0;
  const viewsBoost = movie.viewsBoost || 0;
  const totalViews = viewsReal + viewsBoost;
  const banner = toText(movie.bannerImage || movie.posterImage, "/homepage-banner.jpg");

  // Schema jsonld
  const movieJsonLd = buildMovieJsonLd(
    { id, ...movie, title, description, genre, director, cast, bannerImage: banner },
    `/movie/${id}`
  );
  const videoObjectJsonLd = buildVideoObjectJsonLd(
    { id, ...movie, title, description, bannerImage: banner, videoUrl, embedLink },
    `/movie/${id}`
  );
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Movies", path: "/movies" },
    { name: title, path: `/movie/${id}` },
  ]);

  return (
    <div className="min-h-screen bg-[#07090e] text-white px-4 sm:px-6 lg:px-8 py-6">
      {movieJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(movieJsonLd) }}
        />
      )}
      {videoObjectJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(videoObjectJsonLd) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd) }}
      />
      <ViewTracker movieId={id} />

      {/* THEATER AMBIENT GLOW BACKDROP */}
      <div className="max-w-7xl mx-auto relative">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-600/10 blur-[120px] rounded-full pointer-events-none -z-10" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* MAIN COLUMN (Video Player, Title, Action Bar, Info Card, Ratings, Comments) */}
          <div className="lg:col-span-8 space-y-5">
            {/* 1. ASPECT-RATIO VIDEO PLAYER */}
            <div className="rounded-2xl sm:rounded-3xl overflow-hidden bg-black border border-white/[0.1] shadow-[0_20px_50px_rgba(0,0,0,0.9)]">
              <MovieVideoSection
                movieId={id}
                title={title}
                embedLink={embedLink}
                videoUrl={videoUrl}
                posterImage={banner}
              />
            </div>

            {/* 2. VIDEO TITLE */}
            <div className="pt-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white leading-tight">
                Full Video: {title} | {genre} | {director}
              </h1>
            </div>

            {/* 3. INTERACTIVE MOVIE ACTION BAR */}
            <MovieActionBar
              movieId={id}
              title={title}
              initialLikes={movie.likesCount || totalViews || 0}
              posterImage={banner}
            />

            {/* 4. EXPANDABLE DESCRIPTION BOX */}
            <div className="glass-card rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-xs sm:text-sm space-y-3.5 border border-white/[0.08] shadow-lg">
              <div className="flex flex-wrap items-center gap-3 font-bold text-white text-xs">
                <span className="flex items-center gap-1 text-gray-200">
                  <Eye className="w-3.5 h-3.5 text-gray-400" />
                  {totalViews.toLocaleString()} views
                </span>
                <span className="text-gray-600">•</span>
                <span className="flex items-center gap-1 text-gray-200">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  {releaseDate}
                </span>
                <span className="text-gray-600">•</span>
                <span className="text-red-400 font-semibold">
                  #{genre.replace(/\s+/g, "")} #{director.replace(/\s+/g, "")}
                </span>
              </div>

              {tagline && (
                <p className="font-bold text-white text-sm sm:text-base tracking-tight">
                  {tagline}
                </p>
              )}

              <p className="text-gray-300 leading-relaxed whitespace-pre-wrap font-normal">
                {description ||
                  "Presenting the full official feature title from Chakradhar Stream & The Fifth Age Films."}
              </p>

              <div className="pt-3 border-t border-white/[0.08] grid grid-cols-2 sm:grid-cols-3 gap-3 text-gray-400 text-xs">
                <div>
                  <span className="block text-gray-500 font-bold uppercase tracking-wider text-[10px]">Director</span>
                  <strong className="text-white font-semibold">{director}</strong>
                </div>
                <div>
                  <span className="block text-gray-500 font-bold uppercase tracking-wider text-[10px]">Cast</span>
                  <strong className="text-white font-semibold truncate block">{cast}</strong>
                </div>
                <div>
                  <span className="block text-gray-500 font-bold uppercase tracking-wider text-[10px]">Studio</span>
                  <strong className="text-white font-semibold">Chakradhar OTT</strong>
                </div>
              </div>
            </div>

            {/* 5. COMMUNITY RATINGS */}
            <div className="glass-card rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-white/[0.08] shadow-lg">
              <RatingSection movieId={id} />
            </div>

            {/* 6. COMMENTS SECTION */}
            <div className="glass-card rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-white/[0.08] shadow-lg">
              <CommentSection movieId={id} />
            </div>
          </div>

          {/* SIDEBAR: UP NEXT / RECOMMENDED */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="font-black text-sm uppercase tracking-wider text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-red-400" />
                Up next
              </h3>
              <span className="text-[11px] text-gray-400 font-bold px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10">
                Autoplay ON
              </span>
            </div>

            <div className="space-y-3">
              {recommendedMovies.map((rec) => (
                <Link
                  key={rec.id}
                  href={`/movie/${rec.id}`}
                  className="flex gap-3 p-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] transition-all border border-white/[0.05] hover:border-white/[0.15] group"
                >
                  <div className="relative w-36 sm:w-40 aspect-video rounded-xl overflow-hidden shrink-0 bg-black border border-white/10 shadow-md">
                    <Image
                      src={rec.posterImage || rec.bannerImage || "/homepage-banner.jpg"}
                      alt={rec.title || "Movie"}
                      fill
                      sizes="160px"
                      className="object-cover group-hover:scale-105 transition duration-500"
                    />
                    {rec.quality && (
                      <div className="absolute bottom-1 right-1 bg-black/80 text-[9px] font-black text-white px-1.5 py-0.5 rounded">
                        {rec.quality}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex flex-col justify-center space-y-1">
                    <h4 className="font-bold text-xs sm:text-sm text-white line-clamp-2 leading-tight group-hover:text-red-400 transition-colors">
                      {rec.title}
                    </h4>
                    <p className="text-[11px] text-gray-400 truncate">
                      {rec.director || "Chakradhar Stream"}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 font-medium">
                      <span>{(rec.views || 0) + (rec.viewsReal || 0)} views</span>
                      <span>•</span>
                      <span>{rec.genre || "Drama"}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}