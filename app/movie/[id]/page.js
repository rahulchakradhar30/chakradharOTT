export const runtime = "nodejs";
export const revalidate = 60;

import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebaseAdmin";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import ViewTracker from "@/components/ViewTracker";
import WishlistButton from "@/components/WishlistButton";
import MovieVideoSection from "@/components/MovieVideoSection";
import {
  UserIcon,
  ThumbsUpIcon,
  ThumbsDownIcon,
  ShareIcon,
  RobotIcon,
  BookmarkIcon,
  MoreHorizontalIcon,
  StarIcon,
} from "@/components/Icon";

const CommentSection = dynamic(() => import("@/components/CommentSection"), {
  loading: () => <div className="h-44 bg-[#272727] rounded-2xl animate-pulse" />,
});

const RatingSection = dynamic(() => import("@/components/RatingSection"), {
  loading: () => <div className="h-28 bg-[#272727] rounded-2xl animate-pulse" />,
});

/* =========================
   METADATA
========================= */

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id;

  if (!id) return {};

  try {
    const snapshot = await adminDb.collection("movies").doc(id).get();
    if (!snapshot.exists) return {};

    const movie = snapshot.data();
    const title = movie.title || "Movie";
    const description = movie.description?.slice(0, 160) || movie.tagline || "Watch premium movies on Chakradhar Stream.";
    const image = movie.bannerImage || movie.posterImage || "/homepage-banner.jpg";

    return {
      title: `${title} | Chakradhar Stream`,
      description,
      keywords: [title, movie.genre, "Chakradhar Stream", "Movies", "Streaming"].filter(Boolean),
      alternates: {
        canonical: `/movie/${id}`,
      },
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
        },
      },
      openGraph: {
        title,
        description,
        url: `/movie/${id}`,
        type: "article",
        images: [
          {
            url: image,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [image],
      },
    };
  } catch {
    return {};
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

  let snapshot;
  let allMoviesSnap;

  try {
    [snapshot, allMoviesSnap] = await Promise.all([
      adminDb.collection("movies").doc(id).get(),
      adminDb.collection("movies").limit(10).get(),
    ]);
  } catch (error) {
    console.error("Firestore error:", error);
    notFound();
  }

  if (!snapshot.exists) notFound();

  const movie = snapshot.data() || {};

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

  // Filter recommended up next movies
  const recommendedMovies = allMoviesSnap.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .filter((m) => m.id !== id);

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white px-3 sm:px-6 md:px-10 lg:px-14 py-6">
      <ViewTracker movieId={id} />

      {/* YOUTUBE WATCH PAGE MAIN LAYOUT GRID */}
      <div className="max-w-[1700px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT / MAIN COLUMN (Player, Title, Channel Action Bar, Description, Comments) */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* 1. ASPECT-RATIO VIDEO PLAYER */}
          <div className="rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl">
            <MovieVideoSection
              movieId={id}
              title={title}
              embedLink={embedLink}
              videoUrl={videoUrl}
              posterImage={banner}
            />
          </div>

          {/* 2. VIDEO TITLE */}
          <div className="pt-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white leading-snug">
              Full Video: {title} | {genre} | {director}
            </h1>
          </div>

          {/* 3. CHANNEL / STUDIO & ACTION BAR (YOUTUBE CHANNEL ROW) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-white/10 pb-4">
            
            {/* Left: Studio Avatar + Name + Subscribe Pill */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-600 text-white font-black flex items-center justify-center text-sm shadow-md shrink-0">
                CS
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-sm text-white truncate">Chakradhar Stream</span>
                  <span className="text-cyan-400 text-xs">✓</span>
                </div>
                <p className="text-[11px] text-gray-400 font-medium">Official Channel</p>
              </div>

              <Link
                href={`/watch-party?movie=${id}`}
                className="ml-2 bg-white hover:bg-gray-200 text-black font-bold text-xs md:text-sm py-2 px-5 rounded-full transition shadow-md shrink-0 flex items-center gap-1.5"
              >
                <UserIcon className="w-4 h-4 text-black" />
                <span>Join Premiere</span>
              </Link>
            </div>

            {/* Right: Connected Pill Actions (SVG Icons - Zero Emojis Policy) */}
            <div className="flex flex-wrap items-center gap-2">
              
              {/* Like / Dislike Split Pill */}
              <div className="flex items-center bg-white/10 hover:bg-white/15 rounded-full text-xs font-semibold text-white overflow-hidden border border-white/10">
                <button type="button" className="px-3.5 py-2 flex items-center gap-1.5 hover:bg-white/10 transition border-r border-white/10">
                  <ThumbsUpIcon className="w-4 h-4 text-white" />
                  <span>{movie.likesCount || totalViews || 0}</span>
                </button>
                <button type="button" className="px-3.5 py-2 hover:bg-white/10 transition">
                  <ThumbsDownIcon className="w-4 h-4 text-white" />
                </button>
              </div>

              {/* Share Pill */}
              <button
                type="button"
                className="bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold px-4 py-2 rounded-full flex items-center gap-1.5 transition text-white"
              >
                <ShareIcon className="w-4 h-4 text-white" />
                <span>Share</span>
              </button>

              {/* AI Guide Pill */}
              <Link
                href="/ai-assistant"
                className="bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold px-4 py-2 rounded-full flex items-center gap-1.5 transition text-white"
              >
                <RobotIcon className="w-4 h-4 text-cyan-400" />
                <span>Ask AI</span>
              </Link>

              {/* Watchlist Pill */}
              <div className="bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold px-3 py-1.5 rounded-full flex items-center transition">
                <WishlistButton
                  movie={{
                    id,
                    title,
                    posterImage: banner,
                  }}
                />
              </div>

              {/* More Pill */}
              <button
                type="button"
                className="bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold p-2.5 rounded-full flex items-center justify-center transition text-white"
              >
                <MoreHorizontalIcon className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {/* 4. EXPANDABLE DESCRIPTION BOX (YOUTUBE GREY CARD #272727) */}
          <div className="bg-[#272727] hover:bg-[#313131] transition rounded-2xl p-4 text-xs space-y-2 border border-white/5">
            <div className="flex flex-wrap items-center gap-3 font-bold text-white">
              <span>{totalViews.toLocaleString()} views</span>
              <span>•</span>
              <span>{releaseDate}</span>
              <span>•</span>
              <span className="text-gray-300">#{genre.replace(/\s+/g, "")} #{director.replace(/\s+/g, "")}</span>
            </div>

            {tagline && <p className="font-semibold text-gray-200">{tagline}</p>}

            <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
              {description || "Presenting the full official feature title from Chakradhar Stream & The Fifth Age Films."}
            </p>

            <div className="pt-2 border-t border-white/10 grid grid-cols-2 sm:grid-cols-3 gap-2 text-gray-400 font-medium">
              <div><strong className="text-white">Director:</strong> {director}</div>
              <div><strong className="text-white">Cast:</strong> {cast}</div>
              <div><strong className="text-white">Studio:</strong> Chakradhar OTT</div>
            </div>
          </div>

          {/* 5. COMMUNITY RATINGS */}
          <div className="bg-[#212121] rounded-2xl p-5 border border-white/10">
            <RatingSection movieId={id} />
          </div>

          {/* 6. COMMENTS SECTION */}
          <div className="bg-[#212121] rounded-2xl p-5 border border-white/10">
            <CommentSection movieId={id} />
          </div>
        </div>

        {/* RIGHT SIDE COLUMN ("UP NEXT / RECOMMENDED MOVIES" SIDEBAR) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <h3 className="font-bold text-base text-white">Up next</h3>
            <span className="text-xs text-gray-400 font-semibold">Autoplay ON</span>
          </div>

          <div className="space-y-3">
            {recommendedMovies.map((rec) => (
              <Link
                key={rec.id}
                href={`/movie/${rec.id}`}
                className="flex gap-3 p-2 rounded-xl bg-[#212121] hover:bg-[#2c2c2c] transition border border-white/5 group"
              >
                <div className="relative w-40 aspect-video rounded-lg overflow-hidden shrink-0 bg-black">
                  <Image
                    src={rec.posterImage || rec.bannerImage || "/homepage-banner.jpg"}
                    alt={rec.title || "Movie"}
                    fill
                    sizes="160px"
                    className="object-cover group-hover:scale-105 transition duration-300"
                  />
                  {rec.quality && (
                    <div className="absolute bottom-1 right-1 bg-black/80 text-[10px] font-bold text-white px-1.5 py-0.5 rounded">
                      {rec.quality}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex flex-col justify-center space-y-1">
                  <h4 className="font-bold text-xs text-white line-clamp-2 leading-tight group-hover:text-cyan-300 transition">
                    {rec.title}
                  </h4>
                  <p className="text-[11px] text-gray-400 truncate">{rec.director || "Chakradhar Stream"}</p>
                  <div className="flex items-center gap-2 text-[10px] text-gray-400">
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
  );
}