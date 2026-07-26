import {
  buildBaseMetadata,
  getReadableGenreName,
  buildCollectionPageJsonLd,
  buildBreadcrumbJsonLd,
  jsonLdScript,
  SITE_NAME,
} from "@/lib/seo";
import GenreClient from "./GenreClient";

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const rawGenre = resolvedParams?.genre;
  const genre = Array.isArray(rawGenre) ? rawGenre[0] : rawGenre;
  const genreName = getReadableGenreName(genre);

  return buildBaseMetadata({
    title: `${genreName} Movies | ${SITE_NAME}`,
    description: `Explore the best of ${genreName} movies and live premiere events available for streaming on Chakradhar Stream.`,
    path: `/genre/${genre}`,
  });
}

export default async function GenrePage({ params }) {
  const resolvedParams = await params;
  const rawGenre = resolvedParams?.genre;
  const genre = Array.isArray(rawGenre) ? rawGenre[0] : rawGenre;
  const genreName = getReadableGenreName(genre);

  const collectionJsonLd = buildCollectionPageJsonLd({
    title: `${genreName} Movies | ${SITE_NAME}`,
    description: `Explore the best of ${genreName} movies and live premiere events available for streaming on Chakradhar Stream.`,
    path: `/genre/${genre}`,
  });

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Movies", path: "/movies" },
    { name: genreName, path: `/genre/${genre}` },
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
      <GenreClient />
    </>
  );
}
