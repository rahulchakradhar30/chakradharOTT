import {
  buildBaseMetadata,
  buildBreadcrumbJsonLd,
  jsonLdScript,
  SITE_NAME,
} from "@/lib/seo";
import AccessibilityClient from "./AccessibilityClient";

export const metadata = buildBaseMetadata({
  title: `Accessibility Preferences | ${SITE_NAME}`,
  description: "Customize your viewing experience with options for text size, high contrast theme, and reduced animation support on Chakradhar Stream.",
  path: "/accessibility",
});

const breadcrumbJsonLd = buildBreadcrumbJsonLd([
  { name: "Home", path: "/" },
  { name: "Accessibility", path: "/accessibility" },
]);

export default function AccessibilityPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(breadcrumbJsonLd),
        }}
      />
      <AccessibilityClient />
    </>
  );
}
