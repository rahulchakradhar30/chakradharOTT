import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { signAdminSession, isSuperAdminEmail } from "@/lib/adminAuth";
import { generateAuthenticationOptions, verifyAuthenticationCredential } from "@/lib/webauthn";
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

    let passkeys = [];

    if (isSuperAdminEmail(cleanEmail)) {
      const adminDoc = await adminDb.collection("admins").doc(cleanEmail).get();
      if (adminDoc.exists) passkeys = adminDoc.data().passkeys || [];
    } else {
      let adminDoc = await adminDb.collection("admins").doc(cleanEmail).get();
      if (!adminDoc.exists) {
        const qSnap = await adminDb.collection("admins").where("email", "==", cleanEmail).get();
        if (!qSnap.empty) adminDoc = qSnap.docs[0];
      }

      if (adminDoc && adminDoc.exists) {
        passkeys = adminDoc.data().passkeys || [];
      } else {
        let userDoc = await adminDb.collection("users").doc(cleanEmail).get();
        if (!userDoc.exists) {
          const uSnap = await adminDb.collection("users").where("email", "==", cleanEmail).get();
          if (!uSnap.empty) userDoc = uSnap.docs[0];
        }

        if (userDoc && userDoc.exists) {
          passkeys = userDoc.data().passkeys || [];
        }
      }
    }

    if (passkeys.length === 0) {
      return NextResponse.json({ error: "No Passkeys registered for this account. Please log in via OTP or Authenticator first." }, { status: 400 });
    }

    const host = req.headers.get("host") || "localhost";
    const rpId = host.split(":")[0];

    const options = generateAuthenticationOptions(passkeys, rpId);

    const response = NextResponse.json({ success: true, options });
    response.cookies.set("passkey-auth-challenge", options.challenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 300,
      path: "/",
    });

    return response;
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const { email, credentialPayload } = await req.json();
    const cleanEmail = normalizeEmail(email);
    const expectedChallenge = req.cookies.get("passkey-auth-challenge")?.value || "";

    if (!cleanEmail || !credentialPayload) {
      return NextResponse.json({ error: "Email and credential payload are required." }, { status: 400 });
    }

    const verification = verifyAuthenticationCredential(credentialPayload, expectedChallenge);
    if (!verification.success) {
      return NextResponse.json({ error: "Biometric Passkey verification failed." }, { status: 401 });
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

    response.cookies.delete("passkey-auth-challenge");
    return response;
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
