import SubAdminLayoutClient from "./SubAdminLayoutClient";

export const metadata = {
  title: "Sub-Admin Portal | Chakradhar Stream",
  description: "Sub-administrator management control desk for Chakradhar Stream.",
};

export default function SubAdminLayout({ children }) {
  return <SubAdminLayoutClient>{children}</SubAdminLayoutClient>;
}
