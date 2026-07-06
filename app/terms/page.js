import { buildBaseMetadata } from "@/lib/seo";
import TermsClient from "./TermsClient";

export const metadata = buildBaseMetadata({
  title: "Terms and Conditions – Chakradhar Stream",
  description: "Read the official terms and conditions for using the Chakradhar Stream OTT platform.",
  path: "/terms",
});

export default function TermsPage() {
  return <TermsClient />;
}
