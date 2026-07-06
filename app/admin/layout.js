import { buildBaseMetadata } from "@/lib/seo";
import AdminLayoutClient from "./AdminLayoutClient";

export const metadata = buildBaseMetadata({
  title: "Admin Portal – Control Center",
  description: "Secure OTT platform admin dashboard console.",
  path: "/admin",
  noIndex: true, // Crucial security/SEO choice: noIndex for all admin subroutes!
});

export default function AdminLayout({ children }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
