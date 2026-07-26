import {
  buildBaseMetadata,
  buildCollectionPageJsonLd,
  buildBreadcrumbJsonLd,
  jsonLdScript,
  SITE_NAME,
} from "@/lib/seo";
import PostersClient from "./PostersClient";

export const metadata = buildBaseMetadata({
  title: `Movie Posters Gallery | ${SITE_NAME}`,
  description: "Browse curated collections of movie posters, like your favorites, and join community discussions on Chakradhar Stream.",
  path: "/posters",
});

export default function PostersPage() {
  const collectionJsonLd = buildCollectionPageJsonLd({
    title: `Movie Posters Gallery | ${SITE_NAME}`,
    description: "Browse curated collections of movie posters, like your favorites, and join community discussions on Chakradhar Stream.",
    path: "/posters",
  });

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Posters", path: "/posters" },
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
      <PostersClient />
    </>
  );
}
