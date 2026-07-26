import {
  buildBaseMetadata,
  buildCollectionPageJsonLd,
  buildBreadcrumbJsonLd,
  jsonLdScript,
  SITE_NAME,
} from "@/lib/seo";
import MoviesClient from "./MoviesClient";

export const metadata = buildBaseMetadata({
  title: `Explore Movies Catalog | ${SITE_NAME}`,
  description: "Browse and search through our complete premium streaming library of films and exclusive content on Chakradhar Stream.",
  path: "/movies",
});

export default function MoviesPage() {
  const collectionJsonLd = buildCollectionPageJsonLd({
    title: `Explore Movies Catalog | ${SITE_NAME}`,
    description: "Browse and search through our complete premium streaming library of films and exclusive content on Chakradhar Stream.",
    path: "/movies",
  });

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Movies", path: "/movies" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(collectionJsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(breadcrumbJsonLd),
        }}
      />
      <MoviesClient />
    </>
  );
}