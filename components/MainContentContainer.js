"use client";

import { usePathname } from "next/navigation";

export default function MainContentContainer({ children }) {
  const pathname = usePathname();
  const isAdminOrSubAdmin = pathname?.startsWith("/admin") || pathname?.startsWith("/sub-admin");

  return (
    <main className={`flex-grow ${isAdminOrSubAdmin ? "" : "pt-20 md:pt-24"}`}>
      {children}
    </main>
  );
}
