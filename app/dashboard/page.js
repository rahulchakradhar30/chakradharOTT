import { buildBaseMetadata } from "@/lib/seo";
import DashboardClient from "./DashboardClient";
import { Suspense } from "react";

export const metadata = buildBaseMetadata({
  title: "Critic Dashboard – Chakradhar Stream",
  description: "View your personalized statistics, watch streak milestones, continue watching history, and recommendations.",
  path: "/dashboard",
  noIndex: true, // Mark private dashboard page as noIndex!
});

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen text-white flex items-center justify-center flex-col bg-[#04070f]">
        <div className="w-12 h-12 rounded-full border-4 border-cyan-400/30 border-t-cyan-400 animate-spin mb-4" />
        <p className="text-sm text-gray-400 font-bold">Loading dashboard...</p>
      </div>
    }>
      <DashboardClient />
    </Suspense>
  );
}
