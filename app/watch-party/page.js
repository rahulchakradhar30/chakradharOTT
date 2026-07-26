import {
  buildBaseMetadata,
  buildBreadcrumbJsonLd,
  jsonLdScript,
  SITE_NAME,
} from "@/lib/seo";
import WatchPartyClient from "./WatchPartyClient";
import { Suspense } from "react";

export const metadata = buildBaseMetadata({
  title: `Watch Party Lobby | ${SITE_NAME}`,
  description: "Create or join a synchronized watch party to enjoy movies, real-time chat, and live interaction with friends on Chakradhar Stream.",
  path: "/watch-party",
});

const breadcrumbJsonLd = buildBreadcrumbJsonLd([
  { name: "Home", path: "/" },
  { name: "Watch Party", path: "/watch-party" },
]);

export default function WatchPartyPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(breadcrumbJsonLd),
        }}
      />
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Loading Watch Party...</div>}>
        <WatchPartyClient />
      </Suspense>
    </>
  );
}
