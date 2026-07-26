import {
  buildBaseMetadata,
  buildBreadcrumbJsonLd,
  jsonLdScript,
  SITE_NAME,
} from "@/lib/seo";
import TriviaClient from "./TriviaClient";

export const metadata = buildBaseMetadata({
  title: `Trivia Arena & Leaderboards | ${SITE_NAME}`,
  description: "Test your movie knowledge with film quizzes, earn XP, unlock achievements, and climb global standings on Chakradhar Stream.",
  path: "/trivia",
});

const breadcrumbJsonLd = buildBreadcrumbJsonLd([
  { name: "Home", path: "/" },
  { name: "Trivia Arena", path: "/trivia" },
]);

export default function TriviaPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(breadcrumbJsonLd),
        }}
      />
      <TriviaClient />
    </>
  );
}
