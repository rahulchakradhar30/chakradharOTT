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
import MovieHoverCard from "@/components/MovieHoverCard";
import { SkeletonHero, SkeletonGrid } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import {
  Sparkles,
  Play,
  Clock,
  AlertTriangle,
  Flame,
  ChevronRight,
  Heart,
  MessageSquare,
  Ticket,
  Film,
  Compass,
} from "lucide-react";

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

  // Respect admin-controlled lifecycle first
  if (explicitStatus === "live") return "live";
  if (explicitStatus === "ended") return "ended";
  if (explicitStatus === "scheduled") return "scheduled";

  // Fallback to time-based status inference
  if (end && now >= end) return "ended";
  if (start && now >= start) return "live";
  if (!start && display && now >= display) return "live";
  return "scheduled";
}

function SectionHeader({ title, subtitle }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-6 md:mb-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <p className="text-[11px] uppercase tracking-[0.2em] font-black text-red-400">
            Discover
          </p>
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-white">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs sm:text-sm text-gray-400 mt-1.5 max-w-2xl leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      <Link
        href="/movies"
        className="hidden md:inline-flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-white transition-colors group px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] hover:border-white/20"
      >
        <span>See all</span>
        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
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
    <section className="relative h-[80vh] sm:h-[86vh] md:h-[92vh] w-full overflow-hidden -mt-20 md:-mt-24 select-none">
      {/* Hero Backdrop Image */}
      <div className="absolute inset-0">
        {image.startsWith("data:image/") ? (
          <img
            src={image}
            alt={movie.title || "Hero banner"}
            className="w-full h-full object-cover object-center lg:object-[right_center] scale-105 animate-fadeUp"
          />
        ) : (
          <Image
            src={image}
            alt={movie.title || "Hero banner"}
            fill
            priority
            sizes="100vw"
            className="object-cover object-center lg:object-[right_center] scale-105"
          />
        )}
      </div>

      {/* Multi-layer luxury cinematic vignette and radial highlights */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#06070a] via-[#06070a]/80 sm:via-[#06070a]/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#06070a] via-[#06070a]/30 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#06070a]/70 via-transparent to-transparent h-40" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(229,9,20,0.15),transparent_50%)] pointer-events-none" />

      {/* Content container */}
      <div className="absolute inset-0 flex items-end pb-12 sm:pb-16 md:pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-3xl space-y-4 sm:space-y-6">
            
            {/* Pill Badges */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-wrap items-center gap-2"
            >
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-red-600/90 text-white shadow-lg shadow-red-600/30 border border-red-400/40 backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-white" /> Featured Tonight
              </span>
              {movie.genre && (
                <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-white/[0.08] text-gray-200 border border-white/[0.15] backdrop-blur-md">
                  {movie.genre}
                </span>
              )}
              {movie.rating && (
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-300 border border-amber-400/30 backdrop-blur-md">
                  ★ {Number(movie.rating).toFixed(1)}
                </span>
              )}
            </motion.div>

            {/* Editorial Title */}
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[0.95] text-white drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]"
            >
              {movie.title}
            </motion.h1>

            {/* Tagline / Description */}
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="text-gray-300 text-sm sm:text-base md:text-lg max-w-2xl line-clamp-3 leading-relaxed drop-shadow-md font-normal"
            >
              {movie.tagline || movie.description || "Experience the next chapter of cinematic storytelling."}
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.2 }}
              className="flex items-center gap-3.5 flex-wrap pt-2"
            >
              <Link
                href={`/movie/${movie.id}`}
                className="btn-luxury-primary px-7 sm:px-9 py-3.5 rounded-full text-sm sm:text-base font-bold flex items-center gap-2.5 shadow-xl"
              >
                <Play className="w-4 h-4 fill-current ml-0.5" />
                <span>Watch Now</span>
              </Link>
              <Link
                href="/movies"
                className="btn-luxury-secondary px-7 sm:px-9 py-3.5 rounded-full text-sm sm:text-base font-semibold flex items-center gap-2"
              >
                <Compass className="w-4 h-4 text-gray-300" />
                <span>Explore More</span>
              </Link>
            </motion.div>

          </div>
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <div className="h-10 bg-white/10 rounded-xl w-56 mb-8 animate-pulse" />
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
    <Link href={href} className="group/card min-w-[280px] sm:min-w-[320px] md:min-w-[360px] flex-shrink-0">
      <article
        className={`relative h-[210px] md:h-[230px] rounded-3xl overflow-hidden border transition-all duration-500 hover:-translate-y-1.5 shadow-lg ${
          isLive
            ? "border-red-500/50 hover:border-red-400 hover:shadow-[0_15px_40px_rgba(229,9,20,0.3)] bg-gradient-to-b from-red-950/40 to-black"
            : "border-white/[0.1] hover:border-white/30 hover:shadow-[0_15px_40px_rgba(0,0,0,0.8)] bg-gradient-to-b from-white/[0.04] to-black"
        }`}
      >
        {p.bannerImage ? (
          p.bannerImage.startsWith("data:image/") ? (
            <img
              src={p.bannerImage}
              alt=""
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-105"
            />
          ) : (
            <Image
              src={p.bannerImage}
              alt=""
              fill
              sizes="(max-width: 768px) 320px, 360px"
              className="object-cover transition-transform duration-700 group-hover/card:scale-105"
            />
          )
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(135deg, ${accent})` }}
          />
        )}
        
        {/* Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent" />
        
        <div className="absolute inset-0 p-5 md:p-6 flex flex-col justify-between relative z-10">
          <div className="flex flex-wrap gap-2 text-xs">
            <span
              className={`px-3 py-1.5 rounded-full backdrop-blur-md font-black uppercase tracking-wider flex items-center gap-1.5 text-[10px] ${
                p.status === "live"
                  ? "bg-red-600 text-white shadow-md shadow-red-600/40 border border-red-400/50"
                  : "bg-white/[0.1] text-white border border-white/20"
              }`}
            >
              {p.status === "live" ? (
                <>
                  <span className="w-2 h-2 bg-white rounded-full animate-ping" /> LIVE NOW
                </>
              ) : (
                <>
                  <Clock className="w-3 h-3 text-amber-400" /> Coming Soon
                </>
              )}
            </span>
            {p.ticketRequired && p.ticketPrice && (
              <span className="px-3 py-1.5 rounded-full bg-white/15 border border-white/25 backdrop-blur-md font-bold text-[10px] text-white flex items-center gap-1">
                <Ticket className="w-3 h-3 text-amber-400" />
                ₹{p.ticketPrice}
              </span>
            )}
            <span className="px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md font-medium text-[10px] text-gray-200">
              {getTicketInfo(p)}
            </span>
          </div>

          <div>
            <h3 className="text-base md:text-lg font-black text-white line-clamp-1 drop-shadow-md group-hover/card:text-red-400 transition-colors">
              {p.title}
            </h3>
            <p className="text-xs text-gray-300 mt-1 line-clamp-1 font-normal">
              {p.status === "live"
                ? "Join now and be part of the experience"
                : "Reserve your spot for this exclusive event"}
            </p>
          </div>
        </div>
      </article>
    </Link>
  );

  if (!livePremieres.length && !scheduledPremieres.length) return null;

  return (
    <>
      {livePremieres.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <SectionHeader
            title={
              <span className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse shrink-0" />
                <span>Live Premieres</span>
              </span>
            }
            subtitle="Join ongoing events and watch together in real time"
          />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex gap-4 md:gap-6 overflow-x-auto hide-scrollbar pb-4 pt-1 snap-x"
          >
            {livePremieres.map((p) => (
              <Card
                key={p.id}
                p={p}
                isLive
                accent="rgba(229, 9, 20, 0.4), rgba(15, 23, 42, 0.8)"
                href={`/premiere/${p.id}/join`}
              />
            ))}
          </motion.div>
        </section>
      )}

      {scheduledPremieres.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <SectionHeader
            title="Coming Up Soon"
            subtitle="Upcoming premieres and special sessions"
          />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex gap-4 md:gap-6 overflow-x-auto hide-scrollbar pb-4 pt-1 snap-x"
          >
            {scheduledPremieres.map((p) => (
              <Card
                key={p.id}
                p={p}
                accent="rgba(245, 158, 11, 0.3), rgba(15, 23, 42, 0.8)"
                href={`/premiere/${p.id}/join`}
              />
            ))}
          </motion.div>
        </section>
      )}
    </>
  );
}

function MovieRow({ title, subtitle, movies, loading }) {
  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="h-8 bg-white/10 rounded-xl w-56 mb-6 animate-pulse" />
        <SkeletonGrid count={5} columns={5} />
      </section>
    );
  }

  if (!movies?.length) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <SectionHeader title={title} subtitle={subtitle} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "0px 0px -80px 0px" }}
        transition={{ duration: 0.5 }}
        className="flex gap-4 sm:gap-5 md:gap-6 overflow-x-auto hide-scrollbar pb-8 pt-2"
      >
        {movies.map((movie) => (
          <div key={movie.id} className="flex-shrink-0">
            <MovieHoverCard movie={movie} />
          </div>
        ))}
      </motion.div>
    </section>
  );
}

export default function HomeClient() {
  const { addToast } = useToast();
  const { user } = useAuth();
  const [hero, setHero] = useState(null);
  const [featured, setFeatured] = useState([]);
  const [trending, setTrending] = useState([]);
  const [newReleases, setNewReleases] = useState([]);
  const [premieres, setPremieres] = useState([]);
  const [scheduledPremieresData, setScheduledPremieresData] = useState([]);
  const [latestPosters, setLatestPosters] = useState([]);
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
          .filter((p) => !p.archived)
          .sort((a, b) => (b.displayTime?.getTime?.() || 0) - (a.displayTime?.getTime?.() || 0));

        const liveList = premiereData.filter((p) => p.status === "live");
        const scheduledList = premiereData.filter(
          (p) => p.status === "scheduled" && (!p.displayTime || now >= p.displayTime)
        );

        setPremieres(liveList);
        setScheduledPremieresData(scheduledList);

        const isMovieReleased = (movie) => {
          if (!movie) return false;
          if (!movie.scheduledRelease) return true;
          const releaseTime = movie.scheduledRelease.toDate 
            ? movie.scheduledRelease.toDate().getTime() 
            : new Date(movie.scheduledRelease).getTime();
          return now.getTime() >= releaseTime;
        };

        const heroMovie = heroSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter(isMovieReleased)[0];

        const trendingMovies = trendingSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter(isMovieReleased);

        const featuredMovies = featuredSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter(isMovieReleased);

        const newMovies = newSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter(isMovieReleased);

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

        // Fetch latest posters
        try {
          const res = await fetch("/api/posters");
          const data = await res.json();
          if (data.success && data.posters) {
            setLatestPosters(data.posters.slice(0, 8));
          }
        } catch (posterErr) {
          console.warn("Posters fetch skipped:", posterErr);
        }
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
        <div className="glass-card rounded-3xl p-8 max-w-md w-full border border-white/10 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-5 text-amber-400">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Something went wrong</h2>
          <p className="text-gray-300 text-sm mb-6 leading-relaxed">
            We&apos;re having trouble loading content. Please try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full btn-luxury-primary py-3 rounded-xl text-sm font-bold shadow-lg"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <h1 className="sr-only">Chakradhar Stream</h1>
      {loading ? (
        <div className="space-y-12 pb-16">
          <div className="h-[80vh] md:h-[92vh] w-full bg-white/[0.04] animate-pulse -mt-20 md:-mt-24" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
            <div className="h-8 bg-white/10 rounded-xl w-48 animate-pulse" />
            <div className="flex gap-6 overflow-x-hidden">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="w-[160px] sm:w-[200px] md:w-[240px] aspect-[2/3] bg-white/[0.04] rounded-3xl animate-pulse shrink-0"
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          <CinematicHero movie={hero} loading={loading} />

          <PremiereRow
            premieres={premieres}
            scheduled={scheduledPremieresData}
            loading={loading}
          />

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

          {/* Latest Posters Section */}
          {latestPosters.length > 0 && (
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
              <SectionHeader
                title="Latest Posters"
                subtitle="Explore our curated movie poster collection"
              />
              <div className="flex gap-4 md:gap-6 overflow-x-auto pb-4 hide-scrollbar snap-x snap-mandatory">
                {latestPosters.map((poster, idx) => (
                  <Link
                    key={poster.id}
                    href={`/posters/${poster.id}`}
                    className="group flex-shrink-0 snap-start"
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.04 }}
                      className="relative w-[160px] sm:w-[190px] md:w-[220px] aspect-[3/4] rounded-2xl md:rounded-3xl overflow-hidden border border-white/[0.08] group-hover:border-red-500/40 transition-all duration-300 shadow-lg group-hover:shadow-[0_15px_35px_rgba(0,0,0,0.8)]"
                    >
                      {poster.imageUrl?.startsWith("data:") ? (
                        <img
                          src={poster.imageUrl}
                          alt={poster.caption || "Poster"}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-700"
                        />
                      ) : poster.imageUrl ? (
                        <Image
                          src={poster.imageUrl}
                          alt={poster.caption || "Poster"}
                          fill
                          sizes="220px"
                          className="object-cover group-hover:scale-105 transition duration-700"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-red-950 to-black flex items-center justify-center">
                          <Film className="w-8 h-8 text-red-400" />
                        </div>
                      )}
                      
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3.5">
                        <p className="text-xs text-white font-bold line-clamp-2 leading-tight">
                          {poster.caption || "Chakradhar Poster"}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-300 font-semibold">
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3 text-rose-500 fill-current" />
                            {poster.likesCount || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3 text-sky-400" />
                            {poster.commentsCount || 0}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
