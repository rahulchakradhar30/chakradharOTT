import {
  buildBaseMetadata,
  buildBreadcrumbJsonLd,
  jsonLdScript,
  SITE_NAME,
} from "@/lib/seo";
import PrivacyClient from "./PrivacyClient";

export const metadata = buildBaseMetadata({
  title: `Privacy Policy | ${SITE_NAME}`,
  description: "Read the official privacy policy and data protection guidelines of the Chakradhar Stream OTT platform.",
  path: "/privacy",
});

const breadcrumbJsonLd = buildBreadcrumbJsonLd([
  { name: "Home", path: "/" },
  { name: "Privacy Policy", path: "/privacy" },
]);

export default function PrivacyPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(breadcrumbJsonLd),
        }}
      />
      <PrivacyClient />
    </>
  );
}
