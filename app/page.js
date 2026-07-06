import { buildBaseMetadata, absoluteUrl, jsonLdScript, SITE_NAME, SITE_URL } from "@/lib/seo";
import HomeClient from "./HomeClient";

export const metadata = buildBaseMetadata({
  title: "Chakradhar Stream – Watch Movies & Series Online",
  description: "Chakradhar Stream is a premium streaming platform to watch movies, series, and exclusive live premiere content.",
  path: "/",
});

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": SITE_NAME,
  "url": SITE_URL,
  "potentialAction": {
    "@type": "SearchAction",
    "target": `${SITE_URL}/search?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": SITE_NAME,
  "url": SITE_URL,
  "logo": absoluteUrl("/favicon.ico"),
  "sameAs": [],
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(websiteJsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(organizationJsonLd),
        }}
      />
      <HomeClient />
    </>
  );
}
