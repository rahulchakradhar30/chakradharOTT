import {
  buildBaseMetadata,
  buildBreadcrumbJsonLd,
  jsonLdScript,
  SITE_NAME,
} from "@/lib/seo";
import ContactClient from "./ContactClient";
import { Suspense } from "react";

export const metadata = buildBaseMetadata({
  title: `Contact & Support Center | ${SITE_NAME}`,
  description: "File support tickets, report streaming issues, upload screenshots, and track ticket responses on Chakradhar Stream.",
  path: "/contact",
});

const breadcrumbJsonLd = buildBreadcrumbJsonLd([
  { name: "Home", path: "/" },
  { name: "Contact", path: "/contact" },
]);

export default function ContactPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(breadcrumbJsonLd),
        }}
      />
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Loading Support Desk...</div>}>
        <ContactClient />
      </Suspense>
    </>
  );
}