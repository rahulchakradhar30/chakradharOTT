import {
  buildBaseMetadata,
  buildBreadcrumbJsonLd,
  jsonLdScript,
  SITE_NAME,
} from "@/lib/seo";
import AIAssistantClient from "./AIAssistantClient";

export const metadata = buildBaseMetadata({
  title: `CineGuide AI Assistant | ${SITE_NAME}`,
  description: "Chat with CineGuide AI to get personalized movie recommendations, genre search assistance, and catalog navigation on Chakradhar Stream.",
  path: "/ai-assistant",
});

const breadcrumbJsonLd = buildBreadcrumbJsonLd([
  { name: "Home", path: "/" },
  { name: "AI Guide", path: "/ai-assistant" },
]);

export default function AIAssistantPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(breadcrumbJsonLd),
        }}
      />
      <AIAssistantClient />
    </>
  );
}
