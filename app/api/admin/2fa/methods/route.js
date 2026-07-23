import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { isSuperAdminEmail } from "@/lib/adminAuth";
import { normalizeEmail } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { email } = await req.json();
    const cleanEmail = normalizeEmail(email);

    if (!cleanEmail) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (isSuperAdminEmail(cleanEmail)) {
      // Root / Super Admin defaults
      const adminDoc = await adminDb.collection("admins").doc(cleanEmail).get();
      const data = adminDoc.exists ? adminDoc.data() : {};

      return NextResponse.json({
        allowed: true,
        role: "super_admin",
        emailOtp: true,
        totpEnabled: Boolean(data.totpEnabled),
        passkeysCount: (data.passkeys || []).length,
        passkeys: (data.passkeys || []).map((p) => ({ id: p.credentialId, createdAt: p.createdAt })),
      });
    }

    // Sub-admin check
    let adminDoc = await adminDb.collection("admins").doc(cleanEmail).get();
    if (!adminDoc.exists) {
      const qSnap = await adminDb.collection("admins").where("email", "==", cleanEmail).get();
      if (!qSnap.empty) adminDoc = qSnap.docs[0];
    }

    if (adminDoc && adminDoc.exists) {
      const data = adminDoc.data();
      return NextResponse.json({
        allowed: true,
        role: data.role || "sub_admin",
        emailOtp: true,
        totpEnabled: Boolean(data.totpEnabled),
        passkeysCount: (data.passkeys || []).length,
        passkeys: (data.passkeys || []).map((p) => ({ id: p.credentialId, createdAt: p.createdAt })),
      });
    }

    // Check users collection for sub-admins
    let userDoc = await adminDb.collection("users").doc(cleanEmail).get();
    if (!userDoc.exists) {
      const uSnap = await adminDb.collection("users").where("email", "==", cleanEmail).get();
      if (!uSnap.empty) userDoc = uSnap.docs[0];
    }

    if (userDoc && userDoc.exists && ["sub_admin", "subadmin", "admin"].includes(userDoc.data()?.role)) {
      const data = userDoc.data() || {};
      return NextResponse.json({
        allowed: true,
        role: "sub_admin",
        emailOtp: true,
        totpEnabled: Boolean(data.totpEnabled),
        passkeysCount: (data.passkeys || []).length,
        passkeys: (data.passkeys || []).map((p) => ({ id: p.credentialId, createdAt: p.createdAt })),
      });
    }

    return NextResponse.json({ allowed: false, error: "Account not authorized for 2FA login" }, { status: 403 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
