import { NextResponse } from "next/server";
import { verifyAdminSession, isSuperAdminEmail, isRootSuperAdmin } from "@/lib/adminAuth";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODULE_TO_ROUTE = {
  dashboard: "/admin",
  movies: "/admin/movies",
  premieres: "/admin/premieres",
  posters: "/admin/posters",
  discovery: "/admin/discovery",
  genres: "/admin/genres",
  analytics: "/admin/search-analytics",
  contacts: "/admin/contacts",
  users: "/admin/users",
  subAdmins: "/admin/sub-admins",
  drafts: "/admin/drafts",
  notifications: "/admin/notifications",
  settings: "/admin/settings",
  mail: "/admin/mail",
};

const DEFAULT_SUB_ADMIN_PERMISSIONS = {
  dashboard: true,
  movies: true,
  contacts: true,
  drafts: true,
  mail: true,
  notifications: true,
  premieres: false,
  posters: false,
  discovery: false,
  genres: false,
  analytics: false,
  users: false,
  subAdmins: false,
  settings: false,
};

const SUB_ADMIN_MODULE_TO_ROUTE = {
  dashboard: "/sub-admin",
  movies: "/sub-admin/movies",
  premieres: "/sub-admin/premieres",
  posters: "/sub-admin/posters",
  discovery: "/sub-admin/discovery",
  genres: "/sub-admin/genres",
  analytics: "/sub-admin/analytics",
  contacts: "/sub-admin/contacts",
  users: "/sub-admin/users",
  drafts: "/sub-admin/drafts",
  mail: "/sub-admin/mail",
  notifications: "/sub-admin/notifications",
  settings: "/sub-admin/settings",
};

function resolvePermissions(role, customPermissions) {
  if (role === "super_admin") {
    return {
      navItems: ["*"],
      subAdminNavItems: Object.values(SUB_ADMIN_MODULE_TO_ROUTE),
      canCreate: true,
      canDelete: true,
      canManageAdmins: true,
      canManageSettings: true,
      canBroadcast: true,
      homeRedirect: "/admin",
      modules: Object.keys(MODULE_TO_ROUTE).reduce((acc, key) => {
        acc[key] = true;
        return acc;
      }, {}),
    };
  }

  const permsMap = customPermissions && typeof customPermissions === "object"
    ? { ...DEFAULT_SUB_ADMIN_PERMISSIONS, ...customPermissions }
    : DEFAULT_SUB_ADMIN_PERMISSIONS;

  // Always keep dashboard allowed
  permsMap.dashboard = true;

  const navItems = Object.keys(permsMap)
    .filter((mod) => permsMap[mod] && MODULE_TO_ROUTE[mod])
    .map((mod) => MODULE_TO_ROUTE[mod]);

  const subAdminNavItems = Object.keys(permsMap)
    .filter((mod) => permsMap[mod] && SUB_ADMIN_MODULE_TO_ROUTE[mod])
    .map((mod) => SUB_ADMIN_MODULE_TO_ROUTE[mod]);

  return {
    navItems,
    subAdminNavItems,
    canCreate: Boolean(permsMap.movies || permsMap.premieres || permsMap.posters),
    canDelete: false,
    canManageAdmins: false,
    canManageSettings: Boolean(permsMap.settings),
    canBroadcast: Boolean(permsMap.mail),
    homeRedirect: "/sub-admin",
    modules: permsMap,
  };
}

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
    let role = "sub_admin";
    let adminName = "";
    let customPermissions = null;

    if (isSuperAdminEmail(normalizedEmail)) {
      role = "super_admin";
      adminName = isRootSuperAdmin(normalizedEmail) ? "Permanent Super Admin" : "Super Administrator";
    } else {
      const adminDoc = await adminDb.collection("admins").doc(normalizedEmail).get();

      if (!adminDoc.exists) {
        return NextResponse.json(
          { authenticated: false, reason: "not_authorized" },
          { status: 401, headers }
        );
      }

      const adminData = adminDoc.data();

      if (adminData.status === "disabled" || adminData.status === "removed") {
        return NextResponse.json(
          { authenticated: false, reason: "account_disabled" },
          { status: 401, headers }
        );
      }

      role = adminData.role || "sub_admin";
      adminName = adminData.name || "";
      customPermissions = adminData.permissions || null;
    }

    const permissions = resolvePermissions(role, customPermissions);

    return NextResponse.json(
      {
        authenticated: true,
        email: normalizedEmail,
        role,
        name: adminName,
        permissions,
        isRootSuperAdmin: isRootSuperAdmin(normalizedEmail),
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
