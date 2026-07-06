import { buildBaseMetadata } from "@/lib/seo";
import AIAssistantClient from "./AIAssistantClient";

export const metadata = buildBaseMetadata({
  title: "CineGuide AI Assistant – Chakradhar Stream",
  description: "Chat with CineGuide AI to get personalized movie recommendations, genre search assistance, and catalog navigation.",
  path: "/ai-assistant",
});

export default function AIAssistantPage() {
  return <AIAssistantClient />;
}
