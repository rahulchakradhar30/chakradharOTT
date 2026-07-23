"use client";

import AdminMailDesk from "@/app/admin/mail/page";
import SubAdminAccessGuard from "@/components/admin/SubAdminAccessGuard";

export default function SubAdminMailPage() {
  return (
    <SubAdminAccessGuard moduleKey="mail">
      <AdminMailDesk />
    </SubAdminAccessGuard>
  );
}
