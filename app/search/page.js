import {
  buildBaseMetadata,
  absoluteUrl,
  jsonLdScript,
  buildBreadcrumbJsonLd,
  SITE_NAME,
} from "@/lib/seo";
import SearchClient from "./SearchClient";
import { Suspense } from "react";
import { SkeletonGrid } from "@/components/Skeleton";

export const metadata = buildBaseMetadata({
  title: `Search Catalog | ${SITE_NAME}`,
  description: "Search through the full cinematic collection of movies, live premieres, and genres on Chakradhar Stream.",
  path: "/search",
});

const searchResultsPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "SearchResultsPage",
  "name": `Search Catalog | ${SITE_NAME}`,
  "description": "Search through the full cinematic collection of movies, live premieres, and genres on Chakradhar Stream.",
  "url": absoluteUrl("/search"),
};

const breadcrumbJsonLd = buildBreadcrumbJsonLd([
  { name: "Home", path: "/" },
  { name: "Search", path: "/search" },
]);

export default function SearchPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(searchResultsPageJsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(breadcrumbJsonLd),
        }}
      />
      <Suspense fallback={<div className="min-h-screen px-4 py-10 md:px-10 lg:px-16"><SkeletonGrid count={12} columns={5} /></div>}>
        <SearchClient />
      </Suspense>
    </>
  );
}
