import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/adminAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { generateRegistrationOptions, verifyRegistrationCredential } from "@/lib/webauthn";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const token = req.cookies.get("admin-session")?.value || "";
    const email = verifyAdminSession(token);

    if (!email) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const host = req.headers.get("host") || "localhost";
    const rpId = host.split(":")[0];

    const options = generateRegistrationOptions(email, email.split("@")[0], rpId);

    // Save challenge cookie
    const response = NextResponse.json({ success: true, options });
    response.cookies.set("passkey-reg-challenge", options.challenge, {
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
    const token = req.cookies.get("admin-session")?.value || "";
    const email = verifyAdminSession(token);

    if (!email) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const expectedChallenge = req.cookies.get("passkey-reg-challenge")?.value || "";
    const credentialPayload = await req.json();

    const passkeyData = verifyRegistrationCredential(credentialPayload, expectedChallenge);
    const cleanEmail = email.toLowerCase();

    let docRef = adminDb.collection("admins").doc(cleanEmail);
    let docSnap = await docRef.get();

    if (!docSnap.exists) {
      docRef = adminDb.collection("users").doc(cleanEmail);
      docSnap = await docRef.get();
    }

    const existingPasskeys = docSnap.exists ? docSnap.data().passkeys || [] : [];
    const updatedPasskeys = [
      ...existingPasskeys.filter((p) => p.credentialId !== passkeyData.credentialId),
      passkeyData,
    ];

    await docRef.set({ passkeys: updatedPasskeys, updatedAt: new Date().toISOString() }, { merge: true });

    const response = NextResponse.json({
      success: true,
      message: "Mobile / Laptop Passkey registered successfully!",
      passkeysCount: updatedPasskeys.length,
    });

    response.cookies.delete("passkey-reg-challenge");
    return response;
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
