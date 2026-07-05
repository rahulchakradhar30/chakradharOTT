export const SITE_NAME = "Chakradhar Stream";
export const SITE_URL = "https://chakradharstream.vercel.app";
export const SITE_TITLE = "Chakradhar Stream – Watch Movies & Series Online";
export const SITE_DESCRIPTION =
  "Chakradhar Stream is a premium streaming platform to watch movies, series, and exclusive content.";
export const SITE_KEYWORDS = [
  "Chakradhar Stream",
  "Chakradhar OTT",
  "Streaming Platform",
  "Movies",
  "Series",
  "Entertainment",
];

export const DEFAULT_OG_IMAGE = "/homepage-banner.jpg";
export const DEFAULT_TWITTER_IMAGE = "/homepage-banner.jpg";

export function absoluteUrl(path = "/") {
  if (!path) return SITE_URL;
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

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    keywords,
    alternates: { canonical },
    robots: noIndex
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : { index: true, follow: true, googleBot: { index: true, follow: true } },
    openGraph: {
      type,
      url: canonical,
      siteName: SITE_NAME,
      title: openGraphTitle || title,
      description: openGraphDescription || description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: openGraphTitle || title,
        },
      ],
      ...extraOpenGraph,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [twImage],
      ...extraTwitter,
    },
    icons: {
      icon: [{ url: "/favicon.ico", type: "image/x-icon" }],
      apple: [{ url: "/favicon.ico" }],
    },
    verification: {
      google:
        verification.google ||
        process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ||
        "GOOGLE_SEARCH_CONSOLE_VERIFICATION_PLACEHOLDER",
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
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
