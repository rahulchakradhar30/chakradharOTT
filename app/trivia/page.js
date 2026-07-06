import { buildBaseMetadata } from "@/lib/seo";
import TriviaClient from "./TriviaClient";

export const metadata = buildBaseMetadata({
  title: "Trivia Arena & Leaderboards – Chakradhar Stream",
  description: "Test your movie knowledge with film quizzes, earn XP, unlock achievements, and climb global standings.",
  path: "/trivia",
});

export default function TriviaPage() {
  return <TriviaClient />;
}
