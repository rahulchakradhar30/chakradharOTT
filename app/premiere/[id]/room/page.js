import { buildBaseMetadata } from "@/lib/seo";
import PremiereRoomClient from "./PremiereRoomClient";
import { Suspense } from "react";

export const metadata = buildBaseMetadata({
  title: "Live Premiere Screening Room – Chakradhar Stream",
  description: "Join the live cinema screening room with synced playback, live host, user audience list, and real-time interaction.",
  path: "/premiere",
  noIndex: true, // Crucial: Hide dynamic live premiere broadcast rooms from indexing!
});

export default function PremiereRoomPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen text-white flex items-center justify-center flex-col bg-[#04070f]">
        <div className="w-12 h-12 rounded-full border-4 border-cyan-400/30 border-t-cyan-400 animate-spin mb-4" />
        <p className="text-sm text-gray-400 font-bold">Entering broadcast screening room...</p>
      </div>
    }>
      <PremiereRoomClient />
    </Suspense>
  );
}
