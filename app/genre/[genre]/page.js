import { buildBaseMetadata, getReadableGenreName } from "@/lib/seo";
import GenreClient from "./GenreClient";

export async function generateMetadata({ params }) {
  const rawGenre = params?.genre;
  const genre = Array.isArray(rawGenre) ? rawGenre[0] : rawGenre;
  const genreName = getReadableGenreName(genre);

  return buildBaseMetadata({
    title: `${genreName} Movies – Chakradhar Stream`,
    description: `Explore the best of ${genreName} movies and live premiere events available for streaming on Chakradhar Stream.`,
    path: `/genre/${genre}`,
  });
}

export default function GenrePage() {
  return <GenreClient />;
}
