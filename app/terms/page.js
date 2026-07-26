import {
  buildBaseMetadata,
  buildBreadcrumbJsonLd,
  jsonLdScript,
  SITE_NAME,
} from "@/lib/seo";
import TermsClient from "./TermsClient";

export const metadata = buildBaseMetadata({
  title: `Terms and Conditions | ${SITE_NAME}`,
  description: "Read the official terms and conditions for using the Chakradhar Stream OTT platform.",
  path: "/terms",
});

const breadcrumbJsonLd = buildBreadcrumbJsonLd([
  { name: "Home", path: "/" },
  { name: "Terms and Conditions", path: "/terms" },
]);

export default function TermsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(breadcrumbJsonLd),
        }}
      />
      <TermsClient />
    </>
  );
}
