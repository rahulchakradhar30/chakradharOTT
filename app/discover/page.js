import {
  buildBaseMetadata,
  buildCollectionPageJsonLd,
  buildBreadcrumbJsonLd,
  jsonLdScript,
  SITE_NAME,
} from "@/lib/seo";
import DiscoverClient from "./DiscoverClient";

export const metadata = buildBaseMetadata({
  title: `Discover Movies & Series | ${SITE_NAME}`,
  description: "Explore all movie genres and discover new titles to stream on Chakradhar Stream.",
  path: "/discover",
});

export default function DiscoverPage() {
  const collectionJsonLd = buildCollectionPageJsonLd({
    title: `Discover Movies & Series | ${SITE_NAME}`,
    description: "Explore all movie genres and discover new titles to stream on Chakradhar Stream.",
    path: "/discover",
  });

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Discover", path: "/discover" },
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
      <DiscoverClient />
    </>
  );
}
