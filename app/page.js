import {
  buildBaseMetadata,
  jsonLdScript,
  buildWebSiteJsonLd,
  buildOrganizationJsonLd,
  SITE_NAME,
  SITE_DESCRIPTION,
} from "@/lib/seo";
import HomeClient from "./HomeClient";

export const metadata = buildBaseMetadata({
  title: `${SITE_NAME} – Watch Movies & Series Online`,
  description: SITE_DESCRIPTION,
  path: "/",
});

export default function HomePage() {
  const websiteJsonLd = buildWebSiteJsonLd();
  const organizationJsonLd = buildOrganizationJsonLd();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(websiteJsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(organizationJsonLd),
        }}
      />
      <HomeClient />
    </>
  );
}
