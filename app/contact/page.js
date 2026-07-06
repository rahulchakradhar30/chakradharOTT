import { buildBaseMetadata } from "@/lib/seo";
import ContactClient from "./ContactClient";
import { Suspense } from "react";

export const metadata = buildBaseMetadata({
  title: "Contact & Support Center – Chakradhar Stream",
  description: "File support tickets, report streaming issues, upload screenshots, and track ticket responses anonymously or in your profile.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Loading Support Desk...</div>}>
      <ContactClient />
    </Suspense>
  );
}