import { buildBaseMetadata } from "@/lib/seo";
import PrivacyClient from "./PrivacyClient";

export const metadata = buildBaseMetadata({
  title: "Privacy Policy – Chakradhar Stream",
  description: "Read the official privacy policy and data protection guidelines of the Chakradhar Stream OTT platform.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return <PrivacyClient />;
}
