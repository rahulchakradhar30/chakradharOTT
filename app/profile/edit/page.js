import { buildBaseMetadata } from "@/lib/seo";
import ProfileEditClient from "./ProfileEditClient";
import { Suspense } from "react";

export const metadata = buildBaseMetadata({
  title: "Edit Profile Details – Chakradhar Stream",
  description: "Update your profile avatar, bio, date of birth, and contact information.",
  path: "/profile/edit",
  noIndex: true, // Mark private edit profile page as noIndex!
});

export default function ProfileEditPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen text-white flex items-center justify-center flex-col bg-[#04070f]">
        <div className="w-12 h-12 rounded-full border-4 border-cyan-400/30 border-t-cyan-400 animate-spin mb-4" />
        <p className="text-sm text-gray-400 font-bold">Loading editor...</p>
      </div>
    }>
      <ProfileEditClient />
    </Suspense>
  );
}
