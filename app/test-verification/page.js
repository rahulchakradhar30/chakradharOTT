import { buildBaseMetadata } from "@/lib/seo";
import TestVerificationClient from "./TestVerificationClient";

export const metadata = buildBaseMetadata({
  title: "Test & Verification Center – Chakradhar Stream",
  description: "Check the functional health and verification status of individual platform feature modules.",
  path: "/test-verification",
  noIndex: true, // Verification page should NEVER be indexed by search bots!
});

export default function TestVerificationPage() {
  return <TestVerificationClient />;
}
