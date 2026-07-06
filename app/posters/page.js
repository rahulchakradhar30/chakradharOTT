import { buildBaseMetadata } from "@/lib/seo";
import PostersClient from "./PostersClient";

export const metadata = buildBaseMetadata({
  title: "Movie Posters Gallery – Chakradhar Stream",
  description: "Browse curated collections of movie posters, like your favorites, and join community discussions on Chakradhar Stream.",
  path: "/posters",
});

export default function PostersPage() {
  return <PostersClient />;
}
