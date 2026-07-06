import { buildBaseMetadata } from "@/lib/seo";
import NotificationsClient from "./NotificationsClient";
import { Suspense } from "react";

export const metadata = buildBaseMetadata({
  title: "In-App Notifications – Chakradhar Stream",
  description: "View and manage updates on upcoming premieres, recommendations, and platform system messages.",
  path: "/notifications",
  noIndex: true, // Crucial: User inbox notifications page should not be indexed by Google!
});

export default function NotificationsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Loading Notifications...</div>}>
      <NotificationsClient />
    </Suspense>
  );
}
