import { buildBaseMetadata } from "@/lib/seo";
import LoginClient from "./LoginClient";
import { Suspense } from "react";

export const metadata = buildBaseMetadata({
  title: "Sign In / Join – Chakradhar Stream",
  description: "Access your personalized OTT dashboard, continue watching movies, and join watch parties.",
  path: "/login",
  noIndex: true, // Login page should not be indexed!
});

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Loading Account System...</div>}>
      <LoginClient />
    </Suspense>
  );
}
