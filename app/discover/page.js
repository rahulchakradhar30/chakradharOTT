import { buildBaseMetadata } from "@/lib/seo";
import DiscoverClient from "./DiscoverClient";

export const metadata = buildBaseMetadata({
  title: "Discover Movies & Series – Chakradhar Stream",
  description: "Explore all movie genres and discover new titles to stream on Chakradhar Stream.",
  path: "/discover",
});

export default function DiscoverPage() {
  return <DiscoverClient />;
}
