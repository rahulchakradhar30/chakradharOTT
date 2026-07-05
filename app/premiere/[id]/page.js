export const runtime = "nodejs";
export const revalidate = 60;

import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { adminDb } from "@/lib/firebaseAdmin";
import { jsonLdScript } from "@/lib/seo";

function toText(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === "function") return value.toDate();
  if (typeof value === "object" && typeof value._seconds === "number") {
    return new Date(value._seconds * 1000 + Math.floor((value._nanoseconds || 0) / 1e6));
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value) {
  const date = toDate(value);
  return date ? date.toLocaleString() : "Schedule pending";
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id;

  if (!id) return {};

  try {
    const snapshot = await adminDb.collection("premieres").doc(id).get();
    if (!snapshot.exists) return {};

    const premiere = snapshot.data();
    const title = toText(premiere.title, "Premiere");
    const description = toText(premiere.description, "") || `Watch ${title} on Chakradhar Stream.`;
    const image = toText(premiere.bannerImage || premiere.thumbnailImage, "/homepage-banner.jpg");

    return {
      title: `${title} | Chakradhar Stream`,
      description,
      keywords: [title, "TV Series", "Chakradhar Stream", "Premiere", toText(premiere.genre, "")].filter(Boolean),
      alternates: {
        canonical: `/premiere/${id}`,
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
        url: `/premiere/${id}`,
        type: "video.tv_show",
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
  } catch (error) {
    console.error("Premiere metadata error:", error);
    return {};
  }
}

export default async function PremiereDetailPage({ params }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id;

  if (!id) notFound();

  const snapshot = await adminDb.collection("premieres").doc(id).get();

  if (!snapshot.exists) notFound();

  const premiere = snapshot.data() || {};
  const title = toText(premiere.title, "Untitled Premiere");
  const description = toText(premiere.description, "Watch this premiere on Chakradhar Stream.");
  const banner = toText(premiere.bannerImage || premiere.thumbnailImage, "/homepage-banner.jpg");
  const startTime = formatDate(premiere.startTime);
  const displayTime = formatDate(premiere.displayTime || premiere.startTime);

  const seriesSchema = {
    "@context": "https://schema.org",
    "@type": "TVSeries",
    name: title,
    description,
    image: banner,
    url: `https://chakradharstream.vercel.app/premiere/${id}`,
    genre: toText(premiere.genre, undefined),
    datePublished: toDate(premiere.startTime)?.toISOString(),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://chakradharstream.vercel.app",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Premieres",
        item: "https://chakradharstream.vercel.app/premiere",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: title,
        item: `https://chakradharstream.vercel.app/premiere/${id}`,
      },
    ],
  };

  const videoSchema = premiere.embedLink
    ? {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        name: title,
        description,
        thumbnailUrl: [banner],
        embedUrl: premiere.embedLink,
      }
    : null;

  return (
    <div className="min-h-screen text-white px-4 md:px-10 lg:px-16 py-10 md:py-14 relative overflow-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(seriesSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbSchema) }} />
      {videoSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(videoSchema) }} />}

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(0,212,255,0.14),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(255,77,141,0.08),_transparent_28%)]" />

      <div className="relative z-10 max-w-6xl mx-auto space-y-8">
        <div className="glass-card rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl">
          <div className="relative h-[42vh] md:h-[60vh]">
            <Image
              src={banner}
              alt={title}
              fill
              priority
              sizes="100vw"
              unoptimized={banner.startsWith("data:")}
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#04070f] via-[#04070f]/55 to-transparent" />
            <div className="absolute inset-0 flex items-end p-6 md:p-10">
              <div className="max-w-3xl space-y-4">
                <p className="admin-kicker">Series Spotlight</p>
                <h1 className="text-3xl md:text-6xl font-black tracking-tight leading-[0.96]">{title}</h1>
                <p className="text-gray-200/90 text-sm md:text-lg max-w-2xl">{description}</p>
                <div className="flex flex-wrap gap-2 text-xs md:text-sm text-gray-200/90">
                  {premiere.genre && <span className="admin-chip">{premiere.genre}</span>}
                  <span className="admin-chip">{startTime}</span>
                  <span className="admin-chip">Live from {displayTime}</span>
                </div>
                <div className="flex flex-wrap gap-3 pt-2">
                  <Link href={`/premiere/${id}/join`} className="admin-button admin-button-primary px-5 py-3 rounded-full font-bold">
                    Join Premiere
                  </Link>
                  <Link href={`/premiere/${id}/tickets`} className="admin-button admin-button-secondary px-5 py-3 rounded-full font-bold">
                    View Tickets
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-card rounded-[2rem] p-6 md:p-8 space-y-4">
            <h2 className="text-xl md:text-2xl font-semibold">About this series</h2>
            <p className="text-gray-200/90 leading-relaxed whitespace-pre-line">
              {description}
            </p>
          </div>

          <aside className="glass-card rounded-[2rem] p-6 md:p-8 space-y-4">
            <h2 className="text-xl font-semibold">Details</h2>
            <div className="space-y-3 text-sm text-gray-200/90">
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wide">Status</p>
                <p className="font-medium">{premiere.status || "scheduled"}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wide">Start Time</p>
                <p className="font-medium">{startTime}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wide">Access</p>
                <p className="font-medium">{premiere.ticketRequired ? `Paid from ₹${premiere.ticketPrice || 0}` : "Free access"}</p>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
