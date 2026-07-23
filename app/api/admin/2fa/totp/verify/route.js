import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { signAdminSession, isSuperAdminEmail } from "@/lib/adminAuth";
import { verifyTotpCode } from "@/lib/totp";
import { normalizeEmail } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { email, code } = await req.json();
    const cleanEmail = normalizeEmail(email);

    if (!cleanEmail || !code) {
      return NextResponse.json({ error: "Email and 6-digit code are required." }, { status: 400 });
    }

    let totpSecret = null;
    let enabled = false;

    if (isSuperAdminEmail(cleanEmail)) {
      const adminDoc = await adminDb.collection("admins").doc(cleanEmail).get();
      if (adminDoc.exists) {
        totpSecret = adminDoc.data().totpSecret;
        enabled = adminDoc.data().totpEnabled;
      }
    } else {
      let adminDoc = await adminDb.collection("admins").doc(cleanEmail).get();
      if (!adminDoc.exists) {
        const qSnap = await adminDb.collection("admins").where("email", "==", cleanEmail).get();
        if (!qSnap.empty) adminDoc = qSnap.docs[0];
      }

      if (adminDoc && adminDoc.exists) {
        totpSecret = adminDoc.data().totpSecret;
        enabled = adminDoc.data().totpEnabled;
      } else {
        let userDoc = await adminDb.collection("users").doc(cleanEmail).get();
        if (!userDoc.exists) {
          const uSnap = await adminDb.collection("users").where("email", "==", cleanEmail).get();
          if (!uSnap.empty) userDoc = uSnap.docs[0];
        }

        if (userDoc && userDoc.exists) {
          totpSecret = userDoc.data().totpSecret;
          enabled = userDoc.data().totpEnabled;
        }
      }
    }

    if (!enabled || !totpSecret) {
      return NextResponse.json({ error: "Google Authenticator is not enabled for this account." }, { status: 400 });
    }

    const isValid = verifyTotpCode(totpSecret, code);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid 6-digit Authenticator code. Please check your app timer." }, { status: 401 });
    }

    const sessionToken = signAdminSession(cleanEmail);
    const response = NextResponse.json({
      success: true,
      email: cleanEmail,
      redirect: isSuperAdminEmail(cleanEmail) ? "/admin" : "/sub-admin",
    });

    response.cookies.set("admin-session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
