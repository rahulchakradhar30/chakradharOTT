import { buildBaseMetadata } from "@/lib/seo";
import AccessibilityClient from "./AccessibilityClient";

export const metadata = buildBaseMetadata({
  title: "Accessibility Preferences – Chakradhar Stream",
  description: "Customize your viewing experience with options for text size, high contrast theme, and reduced animation support.",
  path: "/accessibility",
});

export default function AccessibilityPage() {
  return <AccessibilityClient />;
}
