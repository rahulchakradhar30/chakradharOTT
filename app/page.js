"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  where,
} from "firebase/firestore";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import CardWishlistIcon from "@/components/CardWishlistIcon";
import MovieHoverCard from "@/components/MovieHoverCard";
import { SkeletonHero, SkeletonGrid } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";

function toDateSafe(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value?.toDate === "function") {
    const converted = value.toDate();
    return converted instanceof Date && !Number.isNaN(converted.getTime()) ? converted : null;
  }
  if (
    typeof value === "object" &&
    typeof value._seconds === "number" &&
    typeof value._nanoseconds === "number"
  ) {
    const converted = new Date(value._seconds * 1000 + Math.floor(value._nanoseconds / 1e6));
    return Number.isNaN(converted.getTime()) ? null : converted;
  }
  const converted = new Date(value);
  return Number.isNaN(converted.getTime()) ? null : converted;
}

function resolvePremiereStatus(data, now, start, display, end) {
  const explicitStatus = String(data?.status || "").trim().toLowerCase();

  // Respect admin-controlled lifecycle first.
  if (explicitStatus === "live") return "live";
  if (explicitStatus === "ended") return "ended";
  if (explicitStatus === "scheduled") return "scheduled";

  // Fallback to time-based status inference.
  if (end && now >= end) return "ended";
  if (start && now >= start) return "live";
  if (!start && display && now >= display) return "live";
  return "scheduled";
}

function SectionHeader({ title, subtitle }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-6 md:mb-8">
      <div>
        <motion.p
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="admin-kicker mb-2 text-cyan-300 text-sm tracking-widest"
        >
          ✦ Discover
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="section-title text-3xl md:text-4xl lg:text-5xl font-black bg-gradient-to-r from-white via-cyan-200 to-blue-200 bg-clip-text text-transparent"
        >
          {title}
        </motion.h2>
        {subtitle && (
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-sm md:text-base text-gray-400 mt-2"
          >
            {subtitle}
          </motion.p>
        )}
      </div>
      <Link
        href="/movies"
        className="hidden md:inline-block text-sm text-cyan-300 hover:text-cyan-200 transition font-bold group"
      >
        <span className="inline-flex items-center gap-2">
          See all
          <span className="group-hover:translate-x-1 transition-transform">→</span>
        </span>
      </Link>
    </div>
  );
}

function CinematicHero({ movie, loading }) {
  const fallback =
    "https://images.unsplash.com/photo-1524985069026-dd778a71c7b4";

  if (loading) return <SkeletonHero />;
  if (!movie) return null;

  const image = movie.bannerImage || movie.posterImage || fallback;

  return (
    <section className="relative h-[75vh] md:h-[92vh] w-full overflow-hidden -mt-20 md:-mt-24">
      <Image 
        src={image} 
        alt={movie.title} 
        fill 
        priority 
        className="object-cover object-center lg:object-[right_center]" 
      />

      {/* Multi-layer gradient for premium look */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#04070f] via-[#04070f]/75 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#04070f] via-[#04070f]/20 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_25%,rgba(0,212,255,0.15),transparent_40%),radial-gradient(circle_at_20%_20%,rgba(255,77,141,0.08),transparent_30%)]" />

      {/* Animated glow elements */}
      <div className="absolute -top-20 -right-20 w-72 h-72 md:w-96 md:h-96 rounded-full bg-cyan-400/10 blur-3xl animate-pulse" />
      <div className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full bg-purple-500/5 blur-3xl" />

      {/* Content container aligned with Navbar margins */}
      <div className="absolute inset-0 flex items-end pb-12 md:pb-20">
        <div className="px-4 md:px-8 lg:px-14 max-w-4xl w-full space-y-5 md:space-y-7">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-wrap items-center gap-2"
          >
            <span className="animate-softPulse text-xs md:text-sm tracking-widest uppercase px-4 py-2 rounded-full glass-card border-cyan-300/50 backdrop-blur-md font-semibold">
              ✨ Featured Tonight
            </span>
            {movie.genre && (
              <span className="text-xs md:text-sm px-4 py-2 rounded-full bg-white/10 border border-white/25 backdrop-blur-sm font-medium">
                {movie.genre}
              </span>
            )}
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[0.95] drop-shadow-2xl"
          >
            {movie.title}
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="text-gray-200/95 text-base md:text-lg lg:text-xl max-w-3xl line-clamp-3 drop-shadow-lg leading-relaxed"
          >
            {movie.tagline || movie.description || "Experience the next chapter of cinematic storytelling."}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.2 }}
            className="flex items-center gap-4 flex-wrap pt-2"
          >
            <Link
              href={`/movie/${movie.id}`}
              className="focus-ring admin-button admin-button-primary px-8 md:px-10 py-3.5 rounded-full text-base md:text-lg font-bold shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all hover:-translate-y-0.5"
            >
              ▶ Watch Now
            </Link>
            <Link
              href="/movies"
              className="focus-ring admin-button admin-button-secondary px-8 md:px-10 py-3.5 rounded-full text-base md:text-lg font-bold backdrop-blur-md border-white/25 hover:border-white/40 transition-all"
            >
              Explore More
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function PremiereRow({ premieres, scheduled, loading }) {
  const livePremieres = premieres?.filter((p) => p.status === "live") || [];
  const scheduledPremieres = scheduled?.filter((p) => p.status !== "live") || [];

  if (loading) {
    return (
      <section className="px-4 md:px-10 lg:px-16 py-10 md:py-14">
        <div className="h-10 bg-white/10 rounded w-56 mb-8" />
        <SkeletonGrid count={3} columns={3} />
      </section>
    );
  }

  const getTicketInfo = (premiere) => {
    if (!premiere.ticketLimit || premiere.ticketLimit === 0) return "Open entry";
    const available = Math.max(0, premiere.ticketLimit - (premiere.ticketsSold || 0));
    if (available === 0) return "Sold out";
    if (available < 20) return `${available} seats left`;
    return `${available} seats`;
  };

  const Card = ({ p, accent, href, isLive }) => (
    <Link href={href} className="group/card min-w-[280px] md:min-w-[320px] flex-shrink-0">
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className={`relative h-[200px] md:h-[220px] rounded-3xl overflow-hidden border transition-all duration-500 group-hover/card:-translate-y-2 group-hover/card:shadow-[0_25px_50px_rgba(0,212,255,0.2)] ${
          isLive ? "border-red-400/50 group-hover/card:border-red-300/80" : "border-cyan-300/30 group-hover/card:border-cyan-300/60"
        }`}
        style={{
          background: `linear-gradient(135deg, ${accent})`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-[#04070f]/40 to-[#04070f]/80" />
        <div className="absolute inset-0 p-5 md:p-6 flex flex-col justify-between">
          <div className="flex flex-wrap gap-2 text-xs">
            <motion.span
              initial={{ scale: 0.8 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              className={`px-3 py-1.5 rounded-full backdrop-blur-md font-bold uppercase tracking-widest ${
                p.status === "live"
                  ? "bg-red-500/80 border border-red-300/50 text-white animate-pulse"
                  : "bg-cyan-500/60 border border-cyan-300/40 text-white"
              }`}
            >
              {p.status === "live" ? "🔴 LIVE NOW" : "🕐 Coming"}
            </motion.span>
            {p.ticketRequired && p.ticketPrice && (
              <span className="px-3 py-1.5 rounded-full bg-white/15 border border-white/25 backdrop-blur-md font-bold">
                ₹{p.ticketPrice}
              </span>
            )}
            <span className="px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md font-medium">
              {getTicketInfo(p)}
            </span>
          </div>

          <div>
            <h3 className="text-lg md:text-xl font-black line-clamp-1 drop-shadow-lg">{p.title}</h3>
            <p className="text-xs md:text-sm text-gray-200/90 mt-2 line-clamp-1">
              {p.status === "live" ? "Join now and be part of the experience" : "Reserve your spot for this exclusive event"}
            </p>
          </div>
        </div>
      </motion.article>
    </Link>
  );

  if (!livePremieres.length && !scheduledPremieres.length) return null;

  return (
    <>
      {livePremieres.length > 0 && (
        <section className="px-4 md:px-10 lg:px-16 py-10 md:py-16">
          <SectionHeader title="🔴 Live Premieres" subtitle="Join ongoing events and watch together in real time" />
          <div className="flex gap-5 md:gap-6 overflow-x-auto hide-scrollbar pb-4">
            {livePremieres.map((p) => (
              <Card
                key={p.id}
                p={p}
                isLive
                accent="rgba(239, 68, 68, 0.3), rgba(236, 72, 153, 0.2), rgba(99, 102, 241, 0.25)"
                href={`/premiere/${p.id}/join`}
              />
            ))}
          </div>
        </section>
      )}

      {scheduledPremieres.length > 0 && (
        <section className="px-4 md:px-10 lg:px-16 py-10 md:py-16">
          <SectionHeader title="Coming Up Soon" subtitle="Upcoming premieres and special sessions" />
          <div className="flex gap-5 md:gap-6 overflow-x-auto hide-scrollbar pb-4">
            {scheduledPremieres.map((p) => (
              <Card
                key={p.id}
                p={p}
                accent="rgba(251, 191, 36, 0.3), rgba(249, 115, 22, 0.2), rgba(99, 102, 241, 0.25)"
                href={`/premiere/${p.id}/join`}
              />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function MovieRow({ title, subtitle, movies, loading }) {
  if (loading) {
    return (
      <section className="px-4 md:px-10 lg:px-16 py-10 md:py-14">
        <div className="h-10 bg-white/10 rounded w-56 mb-8" />
        <SkeletonGrid count={5} columns={5} />
      </section>
    );
  }

  if (!movies?.length) return null;

  return (
    <section className="px-4 md:px-10 lg:px-16 py-10 md:py-16">
      <SectionHeader title={title} subtitle={subtitle} />

      <div className="flex gap-5 md:gap-6 overflow-x-auto hide-scrollbar pb-10 pt-4 group">
        {movies.map((movie, index) => (
          <motion.div
            key={movie.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px 0px -50px 0px" }}
            transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.25) }}
            className="flex-shrink-0"
          >
            <MovieHoverCard movie={movie} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const { addToast } = useToast();
  const { user } = useAuth();
  const [hero, setHero] = useState(null);
  const [featured, setFeatured] = useState([]);
  const [trending, setTrending] = useState([]);
  const [newReleases, setNewReleases] = useState([]);
  const [premieres, setPremieres] = useState([]);
  const [scheduledPremieresData, setScheduledPremieresData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(false);
        const [
          heroSnap,
          trendingSnap,
          featuredSnap,
          newSnap,
          premiereSnap,
        ] = await Promise.all([
          getDocs(
            query(
              collection(db, "movies"),
              where("isHero", "==", true),
              limit(1)
            )
          ),
          getDocs(
            query(
              collection(db, "movies"),
              where("isTrending", "==", true),
              limit(12)
            )
          ),
          getDocs(
            query(
              collection(db, "movies"),
              where("isFeatured", "==", true),
              limit(12)
            )
          ),
          getDocs(
            query(
              collection(db, "movies"),
              orderBy("releaseDate", "desc"),
              limit(12)
            )
          ),
          getDocs(
            query(
              collection(db, "premieres"),
              orderBy("startTime", "desc"),
              limit(60)
            )
          ),
        ]);

        const now = new Date();

        const premiereData = premiereSnap.docs
          .map((doc) => {
            const data = doc.data();
            const display = toDateSafe(data.displayTime) || toDateSafe(data.startTime);
            const start = toDateSafe(data.startTime);
            const end = toDateSafe(data.endTime);

            const status = resolvePremiereStatus(data, now, start, display, end);

            return { id: doc.id, ...data, status, displayTime: display };
          })
          .filter((p) => !p.archived) // Filter out archived/disabled premieres from homepage
          .sort((a, b) => (b.displayTime?.getTime?.() || 0) - (a.displayTime?.getTime?.() || 0));

        const liveList = premiereData.filter((p) => p.status === "live");
        const scheduledList = premiereData.filter(
          (p) => p.status === "scheduled" && (!p.displayTime || now >= p.displayTime)
        );

        setPremieres(liveList);
        setScheduledPremieresData(scheduledList);

        const heroMovie =
          heroSnap.docs.map((d) => ({ id: d.id, ...d.data() }))[0];

        const trendingMovies = trendingSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const featuredMovies = featuredSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const newMovies = newSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        setHero(
          heroMovie ||
            featuredMovies[0] ||
            trendingMovies[0] ||
            newMovies[0] ||
            null
        );

        setTrending(trendingMovies);
        setFeatured(featuredMovies);
        setNewReleases(newMovies);
      } catch (err) {
        console.error("Homepage error:", err);
        setError(true);
        addToast("Failed to load content. Please refresh the page.", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [addToast]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4">
        <div className="glass-card rounded-2xl px-6 py-8 max-w-sm w-full">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-black mb-2">Something went wrong</h2>
          <p className="text-gray-300 text-sm mb-6">
            We&apos;re having trouble loading content. Please try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {loading ? (
        <div className="space-y-12 pb-16">
          {/* Main Hero Banner skeleton */}
          <div className="h-[75vh] md:h-[92vh] w-full bg-white/5 animate-pulse -mt-20 md:-mt-24" />
          
          {/* Movie rows skeletons */}
          <div className="px-4 md:px-8 lg:px-14 space-y-4">
            <div className="h-8 bg-white/10 rounded w-48 animate-pulse" />
            <div className="flex gap-6 overflow-x-hidden">
              <div className="w-[160px] md:w-[220px] lg:w-[260px] aspect-[2/3] bg-white/5 rounded-3xl animate-pulse shrink-0" />
              <div className="w-[160px] md:w-[220px] lg:w-[260px] aspect-[2/3] bg-white/5 rounded-3xl animate-pulse shrink-0" />
              <div className="w-[160px] md:w-[220px] lg:w-[260px] aspect-[2/3] bg-white/5 rounded-3xl animate-pulse shrink-0" />
              <div className="w-[160px] md:w-[220px] lg:w-[260px] aspect-[2/3] bg-white/5 rounded-3xl animate-pulse shrink-0" />
              <div className="w-[160px] md:w-[220px] lg:w-[260px] aspect-[2/3] bg-white/5 rounded-3xl animate-pulse shrink-0" />
            </div>
          </div>
        </div>
      ) : (
        <>
          <CinematicHero movie={hero} loading={loading} />

          <PremiereRow premieres={premieres} scheduled={scheduledPremieresData} loading={loading} />

          <MovieRow
            title="Trending Now"
            subtitle="Most watched titles on the platform"
            movies={trending}
            loading={loading}
          />
          <MovieRow
            title="Editors' Choice"
            subtitle="Handpicked spotlight picks"
            movies={featured}
            loading={loading}
          />
          <MovieRow
            title="Latest Drops"
            subtitle="Freshly released titles"
            movies={newReleases}
            loading={loading}
          />
        </>
      )}
    </div>
  );
}
