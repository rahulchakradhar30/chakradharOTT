import { buildBaseMetadata } from "@/lib/seo";
import PremiereTicketsClient from "./PremiereTicketsClient";
import { Suspense } from "react";

export const metadata = buildBaseMetadata({
  title: "Premiere Ticket Office – Chakradhar Stream",
  description: "Secure ticket checkouts, redemption codes, and passes for live OTT premieres.",
  path: "/premiere",
  noIndex: true, // Crucial: Hide checkout ticket pages from indexing!
});

export default function PremiereTicketsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen text-white flex items-center justify-center flex-col bg-[#04070f]">
        <div className="w-12 h-12 rounded-full border-4 border-cyan-400/30 border-t-cyan-400 animate-spin mb-4" />
        <p className="text-sm text-gray-400 font-bold">Opening Ticket Office...</p>
      </div>
    }>
      <PremiereTicketsClient />
    </Suspense>
  );
}
