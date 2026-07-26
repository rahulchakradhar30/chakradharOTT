export const SITE_NAME = "Chakradhar Stream";
export const SITE_URL = "https://chakradharstream.vercel.app";
export const SITE_TITLE = "Chakradhar Stream – Watch Movies & Series Online";
export const SITE_DESCRIPTION =
  "Chakradhar Stream is a premium streaming platform to watch movies, series, and exclusive live premiere content.";
export const SITE_KEYWORDS = [
  "Chakradhar Stream",
  "Chakradhar Stream OTT",
  "Chakradhar OTT",
  "CS OTT",
  "Streaming Platform",
  "Watch Movies Online",
  "Series",
  "Live Premieres",
  "Entertainment",
];

export const DEFAULT_OG_IMAGE = "/homepage-banner.jpg";
export const DEFAULT_TWITTER_IMAGE = "/homepage-banner.jpg";

export function absoluteUrl(path = "/") {
  if (!path) return `${SITE_URL}/`;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function clampText(value, maxLength = 160) {
  if (!value) return "";
  const text = String(value).replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}…` : text;
}

export function buildBaseMetadata({
  title = SITE_TITLE,
  description = SITE_DESCRIPTION,
  path = "/",
  image = DEFAULT_OG_IMAGE,
  twitterImage = DEFAULT_TWITTER_IMAGE,
  keywords = SITE_KEYWORDS,
  type = "website",
  noIndex = false,
  openGraphTitle,
  openGraphDescription,
  extraOpenGraph = {},
  extraTwitter = {},
  verification = {},
}) {
  const canonical = absoluteUrl(path);
  const ogImage = absoluteUrl(image);
  const twImage = absoluteUrl(twitterImage || image);

  const parsedTitle = title === SITE_TITLE
    ? { default: SITE_TITLE, template: `%s | ${SITE_NAME}` }
    : title;

  return {
    metadataBase: new URL(SITE_URL),
    applicationName: SITE_NAME,
    generator: "Next.js",
    creator: SITE_NAME,
    publisher: SITE_NAME,
    authors: [{ name: SITE_NAME, url: SITE_URL }],
    category: "entertainment",
    formatDetection: {
      telephone: false,
    },
    appleWebApp: {
      capable: true,
      title: SITE_NAME,
      statusBarStyle: "black-translucent",
    },
    title: parsedTitle,
    description,
    keywords,
    alternates: { canonical },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          googleBot: { index: false, follow: false },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        },
    openGraph: {
      type,
      url: canonical,
      siteName: SITE_NAME,
      title: openGraphTitle || (typeof parsedTitle === "string" ? parsedTitle : SITE_TITLE),
      description: openGraphDescription || description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: openGraphTitle || (typeof parsedTitle === "string" ? parsedTitle : SITE_TITLE),
        },
      ],
      ...extraOpenGraph,
    },
    twitter: {
      card: "summary_large_image",
      site: "@ChakradharStream",
      creator: "@ChakradharStream",
      title: typeof parsedTitle === "string" ? parsedTitle : SITE_TITLE,
      description,
      images: [twImage],
      ...extraTwitter,
    },
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
        { url: "/icon-96x96.png", sizes: "96x96", type: "image/png" },
        { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
        { url: "/icon.svg", type: "image/svg+xml" },
      ],
      apple: [
        { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      ],
    },
    manifest: "/manifest.webmanifest",
    verification: {
      google:
        verification.google ||
        process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ||
        "Csxb9nxcEL6g8tDMkQro8B9G0qlNfMIncWdLgN-T7p0",
      yandex:
        verification.yandex ||
        process.env.NEXT_PUBLIC_YANDEX_SITE_VERIFICATION ||
        "YANDEX_WEBMASTER_VERIFICATION_PLACEHOLDER",
      other: {
        "msvalidate.01":
          verification.other?.["msvalidate.01"] ||
          process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION ||
          "BING_WEBMASTER_VERIFICATION_PLACEHOLDER",
        ...verification.other,
      },
    },
  };
}

export function jsonLdScript(data) {
  if (!data) return "";
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/* ======================================================
   STRUCTURED DATA (JSON-LD) BUILDERS
====================================================== */

export function buildWebSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    alternateName: [
      "Chakradhar Stream OTT",
      "Chakradhar OTT",
      "CS OTT"
    ],
    url: `${SITE_URL}/`,
    inLanguage: "en",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  };
}

export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    logo: absoluteUrl("/icon-512x512.png"),
    sameAs: [
      "https://twitter.com/ChakradharStream",
      "https://www.youtube.com/@ChakradharStream"
    ]
  };
}

export function buildMovieJsonLd(movie, path) {
  if (!movie) return null;
  const canonicalUrl = absoluteUrl(path || `/movie/${movie.id}`);
  const posterUrl = absoluteUrl(movie.bannerImage || movie.posterImage || DEFAULT_OG_IMAGE);
  
  return {
    "@context": "https://schema.org",
    "@type": "Movie",
    name: movie.title || "Movie",
    url: canonicalUrl,
    image: posterUrl,
    description: movie.description || movie.tagline || SITE_DESCRIPTION,
    genre: movie.genre ? String(movie.genre).split(",").map(g => g.trim()) : undefined,
    datePublished: movie.releaseDate ? new Date(movie.releaseDate).toISOString() : undefined,
    director: movie.director
      ? { "@type": "Person", name: movie.director }
      : { "@type": "Organization", name: SITE_NAME },
    actor: movie.cast
      ? String(movie.cast).split(",").map(name => ({ "@type": "Person", name: name.trim() }))
      : undefined,
    aggregateRating: movie.likesCount || movie.viewsReal
      ? {
          "@type": "AggregateRating",
          ratingValue: "4.8",
          bestRating: "5",
          ratingCount: Math.max(10, (movie.likesCount || 0) + (movie.viewsReal || 0))
        }
      : undefined,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: absoluteUrl("/icon-512x512.png")
    }
  };
}

export function buildVideoObjectJsonLd(movie, path) {
  if (!movie) return null;
  const canonicalUrl = absoluteUrl(path || `/movie/${movie.id}`);
  const thumbnailUrl = absoluteUrl(movie.bannerImage || movie.posterImage || DEFAULT_OG_IMAGE);

  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: movie.title || "Movie Video",
    description: movie.description || movie.tagline || SITE_DESCRIPTION,
    thumbnailUrl: [thumbnailUrl],
    uploadDate: movie.createdAt ? new Date(movie.createdAt).toISOString() : new Date().toISOString(),
    contentUrl: movie.videoUrl || movie.embedLink || canonicalUrl,
    embedUrl: movie.embedLink || canonicalUrl
  };
}

export function buildBreadcrumbJsonLd(items = []) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path)
    }))
  };
}

export function buildCollectionPageJsonLd({ title, description, path = "/movies", items = [] }) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    description: description,
    url: absoluteUrl(path),
    mainEntity: {
      "@type": "ItemList",
      itemListElement: items.map((item, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        url: absoluteUrl(`/movie/${item.id}`),
        name: item.title
      }))
    }
  };
}

export function buildFAQJsonLd(faqs = []) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(faq => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer
      }
    }))
  };
}

/**
 * Convert a genre string into an SEO-friendly slug.
 */
export function slugifyGenre(genre) {
  if (!genre) return "";
  return String(genre)
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const STANDARD_GENRES = {
  "action": "Action",
  "comedy": "Comedy",
  "drama": "Drama",
  "horror": "Horror",
  "thriller": "Thriller",
  "romance": "Romance",
  "sci-fi": "Sci-Fi",
  "fantasy": "Fantasy",
  "animation": "Animation",
  "documentary": "Documentary",
  "love": "Love"
};

/**
 * Convert a slug back to a readable genre name.
 */
export function getReadableGenreName(slugOrName) {
  if (!slugOrName) return "";
  const slug = slugifyGenre(slugOrName);
  if (STANDARD_GENRES[slug]) {
    return STANDARD_GENRES[slug];
  }
  return slug
    .split("-")
    .map(word => {
      if (word === "and") return "and";
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ")
    .replace(/\bSci\b \bFi\b/gi, "Sci-Fi")
    .replace(/\bScifi\b/gi, "Sci-Fi");
}
