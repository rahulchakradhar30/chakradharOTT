import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/adminAuth";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getAllowedAdminEmails() {
  const fromEnv = String(process.env.ADMIN_ALLOWED_EMAILS || "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);

  if (fromEnv.length > 0) return fromEnv;

  return [
    "thefifthagefilms@gmail.com",
    "rahulchakradharperepogu@gmail.com",
  ];
}

/* Granular permissions per role */
const ROLE_PERMISSIONS = {
  super_admin: {
    navItems: ["*"],
    canCreate: true,
    canDelete: true,
    canManageAdmins: true,
    canManageSettings: true,
    canBroadcast: true,
  },
  sub_admin: {
    navItems: ["/admin", "/admin/movies", "/admin/contacts", "/admin/drafts"],
    canCreate: false,
    canDelete: false,
    canManageAdmins: false,
    canManageSettings: false,
    canBroadcast: false,
  },
};

export async function GET(req) {
  try {
    const token = req.cookies.get("admin-session")?.value || "";
    const email = verifyAdminSession(token);
    const headers = {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Vary: "Cookie",
    };

    if (!email) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401, headers }
      );
    }

    const normalizedEmail = email.toLowerCase();
    const allowedEmails = getAllowedAdminEmails();

    let role = "sub_admin";
    let adminName = "";

    if (allowedEmails.includes(normalizedEmail)) {
      role = "super_admin";
      adminName = "Super Administrator";
    } else {
      // Check admins collection — also verify status
      const adminDoc = await adminDb.collection("admins").doc(normalizedEmail).get();

      if (!adminDoc.exists) {
        // Not a super-admin and not in admins collection → unauthorized
        return NextResponse.json(
          { authenticated: false, reason: "not_authorized" },
          { status: 401, headers }
        );
      }

      const adminData = adminDoc.data();

      // If sub-admin has been disabled/removed → force logout
      if (adminData.status === "disabled" || adminData.status === "removed") {
        return NextResponse.json(
          { authenticated: false, reason: "account_disabled" },
          { status: 401, headers }
        );
      }

      role = adminData.role || "sub_admin";
      adminName = adminData.name || "";
    }

    const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.sub_admin;

    return NextResponse.json(
      {
        authenticated: true,
        email: normalizedEmail,
        role,
        name: adminName,
        permissions,
      },
      { headers }
    );
  } catch (error) {
    console.error("Session verification error:", error);
    const headers = {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Vary: "Cookie",
    };

    return NextResponse.json(
      { authenticated: false },
      { status: 401, headers }
    );
  }
}
