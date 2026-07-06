import { buildBaseMetadata } from "@/lib/seo";
import WatchPartyClient from "./WatchPartyClient";
import { Suspense } from "react";

export const metadata = buildBaseMetadata({
  title: "Watch Party Lobby – Chakradhar Stream",
  description: "Create or join a synchronized watch party to enjoy movies, real-time chat, and live interaction with friends.",
  path: "/watch-party",
});

export default function WatchPartyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Loading Watch Party...</div>}>
      <WatchPartyClient />
    </Suspense>
  );
}
