import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/adminAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { generateTotpSecret, verifyTotpCode } from "@/lib/totp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const token = req.cookies.get("admin-session")?.value || "";
    const email = verifyAdminSession(token);

    if (!email) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const { secret, otpauthUrl } = generateTotpSecret(email);

    return NextResponse.json({
      success: true,
      email,
      secret,
      otpauthUrl,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const token = req.cookies.get("admin-session")?.value || "";
    const email = verifyAdminSession(token);

    if (!email) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const { secret, code } = await req.json();

    const isValid = verifyTotpCode(secret, code);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid 6-digit Authenticator code. Please try again." }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase();

    // Update in admins collection or users collection
    const adminRef = adminDb.collection("admins").doc(cleanEmail);
    const adminDoc = await adminRef.get();

    if (adminDoc.exists) {
      await adminRef.set(
        { totpSecret: secret, totpEnabled: true, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    } else {
      const userRef = adminDb.collection("users").doc(cleanEmail);
      await userRef.set(
        { totpSecret: secret, totpEnabled: true, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Google Authenticator 2FA enabled successfully!",
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
