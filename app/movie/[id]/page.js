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

const CommentSection = dynamic(() => import("@/components/CommentSection"), {
  loading: () => <SectionSkeleton className="h-44" />,
});

const RatingSection = dynamic(() => import("@/components/RatingSection"), {
  loading: () => <SectionSkeleton className="h-28" />,
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

    return {
      title: `${movie.title} | Chakradhar OTT`,
      description: movie.description?.slice(0, 160) || "",
      openGraph: {
        title: movie.title,
        description: movie.description?.slice(0, 160) || "",
        images: movie.bannerImage ? [movie.bannerImage] : [],
      },
    };
  } catch {
    return {};
  }
}

/* =========================
   PAGE
========================= */

export default async function MovieDetail({ params }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id;

  if (!id) notFound();

  let snapshot;

  try {
    snapshot = await adminDb.collection("movies").doc(id).get();
  } catch (error) {
    console.error("Firestore error:", error);
    notFound();
  }

  if (!snapshot.exists) notFound();

  const movie = snapshot.data() || {};

  const title = toText(movie.title, "Untitled");
  const tagline = toText(movie.tagline, "");
  const description = toText(movie.description, "");
  const genre = toText(movie.genre, "Genre not set");
  const releaseDate = toDisplayDate(movie.releaseDate, "Release date pending");
  const director = toText(movie.director, "Not Available");
  const embedLink = toText(movie.embedLink, "");

  const viewsReal = movie.viewsReal || 0;
  const viewsBoost = movie.viewsBoost || 0;
  const totalViews = viewsReal + viewsBoost;
  const banner = toText(movie.bannerImage || movie.posterImage, "/homepage-banner.jpg");

  return (
    <div className="min-h-screen relative overflow-hidden text-white">
      <ViewTracker movieId={id} />

      <section className="relative h-[72vh] md:h-[86vh] flex items-end rounded-b-[2rem] md:rounded-b-[3rem] overflow-hidden">
        {banner.startsWith("data:image/") ? (
          <img
            src={banner}
            alt={title || "Movie banner"}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <Image
            src={banner}
            alt={title || "Movie banner"}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-r from-[#050915] via-[#050915]/85 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#04070f] via-[#04070f]/55 to-transparent" />

        <div className="relative z-10 w-full px-4 md:px-10 lg:px-16 pb-8 md:pb-16 animate-fadeUp">
          <div className="max-w-5xl glass-card rounded-[2rem] p-5 md:p-8 shadow-[0_10px_70px_rgba(0,0,0,0.35)]">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <p className="admin-kicker mb-3">Now Streaming</p>
                <h1 className="text-3xl md:text-6xl font-black mb-3 tracking-tight leading-[0.96]">
                  {title}
                </h1>

                {tagline && (
                  <p className="text-gray-200/90 text-sm md:text-lg mb-4 max-w-3xl">
                    {tagline}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 text-xs md:text-sm text-gray-200/90">
                  <span className="admin-chip">{genre}</span>
                  <span className="admin-chip">{releaseDate}</span>
                  <span className="admin-chip">{totalViews.toLocaleString()} views</span>
                </div>
              </div>

              <div className="mt-4 md:mt-0 flex flex-wrap items-center gap-3">
                <Link
                  href={`/watch-party?movie=${id}`}
                  className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-2.5 px-4 rounded-xl transition text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/10"
                >
                  👥 Watch Party
                </Link>
                <WishlistButton
                  movie={{
                    id,
                    title,
                    posterImage: toText(movie.posterImage || movie.bannerImage, ""),
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 md:px-10 lg:px-16 py-10 md:py-14 space-y-10">
        <MovieVideoSection
          movieId={id}
          title={title}
          embedLink={embedLink}
          videoUrl={toText(movie.videoUrl, "")}
          posterImage={banner}
        />

        <section className="glass-card rounded-[2rem] p-6 md:p-8 shadow-xl transition duration-500 hover:border-blue-300/40">
          <RatingSection movieId={id} />
        </section>

        <section className="grid lg:grid-cols-3 gap-6 md:gap-8">
          <div className="lg:col-span-2 glass-card rounded-[2rem] p-6 md:p-8 shadow-xl transition duration-500 hover:border-pink-300/30">
            <h2 className="text-xl md:text-2xl font-semibold mb-5">
              About the Movie
            </h2>

            <div className="text-gray-200/90 text-sm md:text-base leading-relaxed max-h-[300px] overflow-y-auto pr-2">
              {description
                ? description.split("\n").map((line, index) => (
                    <p key={index} className="mb-4">
                      {line}
                    </p>
                  ))
                : "No description available."}
            </div>
          </div>

          <div className="glass-card rounded-[2rem] p-6 md:p-8 shadow-xl space-y-6 transition duration-500 hover:border-cyan-300/40">
            <Info label="Genre" value={genre} />
            <Info label="Release Date" value={releaseDate} />
            <Info label="Director" value={director} />
          </div>
        </section>

        <section className="glass-card rounded-[2rem] p-6 md:p-8 shadow-xl transition duration-500 hover:border-blue-300/35">
          <CommentSection movieId={id} />
        </section>
      </section>
    </div>
  );
}

/* ========================= */

function SectionSkeleton({ className = "h-24" }) {
  return <div className={`rounded-2xl bg-white/10 animate-pulse ${className}`} />;
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
        {label}
      </p>
      <p className="font-medium text-lg">
        {value || "Not Available"}
      </p>
    </div>
  );
}

function toText(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function toDisplayDate(value, fallback = "Release date pending") {
  if (value === null || value === undefined) return fallback;

  if (typeof value === "string") {
    return value.trim() || fallback;
  }

  if (value instanceof Date) {
    return value.toLocaleDateString();
  }

  if (typeof value?.toDate === "function") {
    const converted = value.toDate();
    if (converted instanceof Date && !Number.isNaN(converted.getTime())) {
      return converted.toLocaleDateString();
    }
  }

  if (
    typeof value === "object" &&
    typeof value._seconds === "number" &&
    typeof value._nanoseconds === "number"
  ) {
    const converted = new Date(value._seconds * 1000 + Math.floor(value._nanoseconds / 1e6));
    if (!Number.isNaN(converted.getTime())) {
      return converted.toLocaleDateString();
    }
  }

  return fallback;
}