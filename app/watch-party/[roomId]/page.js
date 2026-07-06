import { buildBaseMetadata } from "@/lib/seo";
import WatchPartyRoomClient from "./WatchPartyRoomClient";
import { Suspense } from "react";

export const metadata = buildBaseMetadata({
  title: "Live Synced Screening Room – Chakradhar Stream",
  description: "Watch and sync playback with friends in real time, featuring low-latency browser voice and video call integration.",
  path: "/watch-party",
  noIndex: true, // Mark private party screening rooms as noIndex!
});

export default function WatchPartyRoomPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen text-white flex items-center justify-center flex-col bg-[#04070f]">
        <div className="w-12 h-12 rounded-full border-4 border-cyan-400/30 border-t-cyan-400 animate-spin mb-4" />
        <p className="text-sm text-gray-400 font-bold">Entering watch room...</p>
      </div>
    }>
      <WatchPartyRoomClient />
    </Suspense>
  );
}
