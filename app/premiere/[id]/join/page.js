"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function PremiereJoinPage() {
  const params = useParams();
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const { user } = useAuth();

  const [premiere, setPremieres] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeUntilStart, setTimeUntilStart] = useState(null);
  const [isRemoved, setIsRemoved] = useState(false);
  const [removalReason, setRemovalReason] = useState("");
  const [hasTicket, setHasTicket] = useState(false);
  const [ticketChecking, setTicketChecking] = useState(true);

  useEffect(() => {
    if (!id) {
      setError("Invalid premiere link");
      setLoading(false);
      return;
    }

    const fetchPremiere = async () => {
      try {
        const docRef = doc(db, "premieres", String(id));
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          setError("Premiere not found");
          return;
        }

        const data = docSnap.data();
        setPremieres({ id: docSnap.id, ...data });
        setError(null);

        // Check if user has a ticket when required
        if (data.ticketRequired) {
          if (user?.uid) {
            const ticketQuery = query(
              collection(db, "users", user.uid, "tickets"),
              where("premiereId", "==", String(id))
            );
            const ticketSnap = await getDocs(ticketQuery);
            setHasTicket(!ticketSnap.empty);
          } else {
            setHasTicket(false);
          }
        } else {
          setHasTicket(true);
        }
        setTicketChecking(false);

        // Optional removal check should never break page loading.
        if (user?.uid) {
          try {
            const removedRef = doc(db, "premieres", String(id), "removed_users", user.uid);
            const removedSnap = await getDoc(removedRef);

            if (removedSnap.exists()) {
              const removedData = removedSnap.data();
              setIsRemoved(true);
              setRemovalReason(removedData.reason || "You have been removed");
            } else {
              setIsRemoved(false);
              setRemovalReason("");
            }
          } catch (removedErr) {
            console.warn("Removed-user check skipped:", removedErr);
          }
        } else {
          setIsRemoved(false);
          setRemovalReason("");
        }
      } catch (err) {
        console.error("Error fetching premiere:", err);
        setError("Failed to load premiere");
      } finally {
        setLoading(false);
      }
    };

    fetchPremiere();
  }, [id, user?.uid]);

  // Update countdown timer
  useEffect(() => {
    if (!premiere) return;

    const updateTimer = () => {
      const startTime = premiere.startTime?.toDate?.() || new Date(premiere.startTime);
      const hasValidStartTime = startTime instanceof Date && !Number.isNaN(startTime.getTime());

      if (!hasValidStartTime) {
        setTimeUntilStart(null);
        return;
      }

      const now = new Date();
      const diff = startTime - now;

      if (diff <= 0) {
        setTimeUntilStart(null);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeUntilStart({ hours, minutes, seconds });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [premiere]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="admin-empty text-center max-w-sm w-full">Loading premiere...</div>
      </div>
    );
  }

  if (isRemoved) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="admin-surface max-w-md w-full rounded-[1.75rem] p-8 text-center space-y-4 border border-red-500/40 bg-red-900/20">
          <h2 className="text-xl font-bold">Access Denied</h2>
          <p className="text-gray-300">
            You have been removed from this premiere session.
          </p>
          {removalReason && (
            <div className="bg-black/50 rounded-lg p-3">
              <p className="text-xs text-gray-400">Reason:</p>
              <p className="text-sm">{removalReason}</p>
            </div>
          )}
          <Link href="/" className="admin-button admin-button-primary inline-block mt-4">
            Back Home
          </Link>
        </div>
      </div>
    );
  }

  if (error || !premiere) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-red-500 mb-4">{error || "Premiere not found"}</p>
        <Link href="/" className="admin-button admin-button-primary px-6 py-2">
          Back to Home
        </Link>
      </div>
    );
  }

  const startTime = premiere.startTime?.toDate?.() || new Date(premiere.startTime);
  const hasValidStartTime = startTime instanceof Date && !Number.isNaN(startTime.getTime());
  const isLive = premiere.status === "live" || (hasValidStartTime && new Date() >= startTime);
  const isTicketed = premiere.ticketRequired;

  return (
    <div className="min-h-screen text-white pb-12">
      {premiere.bannerImage && (
        <div className="relative h-[56vh] md:h-[65vh] w-full overflow-hidden rounded-b-[2rem] md:rounded-b-[3rem]">
          {premiere.bannerImage.startsWith("data:image/") ? (
            <img
              src={premiere.bannerImage}
              alt={premiere.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <Image
              src={premiere.bannerImage}
              alt={premiere.title}
              fill
              priority
              sizes="100vw"
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-[#04070f] via-[#04070f]/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#04070f] via-[#04070f]/35 to-transparent" />
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 md:px-10 lg:px-16 py-10 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="glass-card rounded-[2rem] p-6 md:p-8"
        >
          <div className="flex justify-between items-start gap-4 mb-8 flex-wrap">
            <div>
              <p className="admin-kicker mb-3">Premiere Event</p>
              <h1 className="text-3xl md:text-5xl font-black mb-2 tracking-tight">
                {premiere.title}
              </h1>
              <p className="text-gray-200 text-sm md:text-lg max-w-3xl">
                {premiere.description}
              </p>
            </div>

            {!isLive && timeUntilStart && (
              <div className="bg-black/30 border border-cyan-300/40 rounded-[1.25rem] p-4 text-right whitespace-nowrap animate-softPulse">
                <p className="text-xs text-gray-300 mb-2">Starts in</p>
                <p className="text-2xl font-bold">
                  {timeUntilStart.hours}h {timeUntilStart.minutes}m {timeUntilStart.seconds}s
                </p>
              </div>
            )}
          </div>

          <div className="bg-black/25 border border-white/15 rounded-[1.25rem] p-4 mb-8">
            <p className="text-gray-300 text-sm md:text-base">
              <span className="font-semibold text-white">Start Time:</span>{" "}
              {hasValidStartTime ? startTime.toLocaleString() : "TBA"}
            </p>
          </div>

          {isLive ? (
            <div className="aspect-video bg-black rounded-[1.75rem] overflow-hidden mb-8 border border-white/15">
              {premiere.embedLink ? (
                <iframe
                  src={premiere.embedLink}
                  title={premiere.title}
                  allowFullScreen
                  loading="lazy"
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-400">Stream starting soon...</p>
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-video bg-gradient-to-br from-[#13203e] via-[#0d152b] to-black rounded-[1.75rem] overflow-hidden mb-8 border border-white/15 flex items-center justify-center">
              <div className="text-center">
                <p className="text-gray-300 mb-2">Premiere coming soon</p>
                <p className="text-sm text-cyan-300">Your seat will unlock at showtime</p>
              </div>
            </div>
          )}

          {isTicketed && !hasTicket && (
            <div className="bg-red-900/25 border border-red-500/30 text-red-200 rounded-[1.25rem] p-4 mb-8 text-sm">
              A valid entry ticket is required to view this premiere. If you have already purchased a ticket or hold a promo code, navigate to the checkout page to redeem it.
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            {isLive ? (
              hasTicket ? (
                <Link
                  href={`/premiere/${id}/room`}
                  className="flex-1 admin-button admin-button-primary text-center animate-softPulse"
                >
                  Join Live Room
                </Link>
              ) : (
                <div className="flex-1 admin-button admin-button-secondary text-center cursor-not-allowed opacity-60">
                  Ticket Required
                </div>
              )
            ) : (
              <div className="flex-1 admin-button admin-button-secondary text-center cursor-not-allowed">
                Coming Soon
              </div>
            )}

            {isTicketed && (
              <Link
                href={`/premiere/${id}/tickets`}
                className="focus-ring admin-button admin-button-primary flex-1 text-center"
              >
                {hasTicket ? "View Tickets" : "Get Ticket / Redeem"}
              </Link>
            )}

            <Link
              href="/"
              className="focus-ring admin-button admin-button-secondary flex-1 text-center"
            >
              Back Home
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
