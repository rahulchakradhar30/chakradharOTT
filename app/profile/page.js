import { buildBaseMetadata } from "@/lib/seo";
import ProfileClient from "./ProfileClient";
import { Suspense } from "react";

export const metadata = buildBaseMetadata({
  title: "My Account Profile – Chakradhar Stream",
  description: "Manage your account settings, credentials, subscriptions, support tickets, and watch lists on Chakradhar Stream.",
  path: "/profile",
  noIndex: true, // Mark private profile page as noIndex!
});

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen text-white flex items-center justify-center flex-col bg-[#04070f]">
        <div className="w-12 h-12 rounded-full border-4 border-cyan-400/30 border-t-cyan-400 animate-spin mb-4" />
        <p className="text-sm text-gray-400 font-bold">Loading account profile...</p>
      </div>
    }>
      <ProfileClient />
    </Suspense>
  );
}
