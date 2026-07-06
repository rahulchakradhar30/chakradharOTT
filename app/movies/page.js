import { buildBaseMetadata, absoluteUrl, jsonLdScript } from "@/lib/seo";
import MoviesClient from "./MoviesClient";

export const metadata = buildBaseMetadata({
  title: "Explore Movies Catalog – Chakradhar Stream",
  description: "Browse and search through our complete premium streaming library of films and exclusive content on Chakradhar Stream.",
  path: "/movies",
});

const moviesCollectionJsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "Explore Movies Catalog – Chakradhar Stream",
  "description": "Browse and search through our complete premium streaming library of films and exclusive content on Chakradhar Stream.",
  "url": absoluteUrl("/movies"),
};

export default function MoviesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(moviesCollectionJsonLd),
        }}
      />
      <MoviesClient />
    </>
  );
}