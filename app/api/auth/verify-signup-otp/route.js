export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { hashOtp } from "@/lib/adminAuth";
import { enforceRateLimit, getClientIp } from "@/lib/rateLimit";
import { normalizeEmail } from "@/lib/validation";
import { logServerEvent } from "@/lib/auditLog";

export async function POST(req) {
  const ip = getClientIp(req);

  try {
    const { email, otp } = await req.json();
    const normalizedEmail = normalizeEmail(email);
    const normalizedOtp = String(otp || "").trim();

    const limiter = await enforceRateLimit({
      scope: "signup_otp_verify",
      subject: `${ip}:${normalizedEmail}`,
      limit: 18,
      windowMs: 10 * 60 * 1000,
    });

    if (!limiter.allowed) {
      return NextResponse.json({ success: false, error: "Too many attempts." }, { status: 429 });
    }

    if (!normalizedEmail || !normalizedOtp) {
      return NextResponse.json(
        { success: false, error: "Missing email or OTP" },
        { status: 400 }
      );
    }

    const snapshot = await adminDb
      .collection("signup_otps")
      .where("email", "==", normalizedEmail)
      .get();

    if (snapshot.empty) {
      await logServerEvent("signup_otp_verify_failed", {
        ip,
        email: normalizedEmail,
        reason: "empty",
      });
      return NextResponse.json({ success: false, error: "No OTP found for this email." });
    }

    const sorted = snapshot.docs.sort(
      (a, b) => (b.data().createdAt || 0) - (a.data().createdAt || 0)
    );

    const doc = sorted[0];
    const data = doc.data();

    // ⛔ Expired
    if (Date.now() > data.expiresAt) {
      await doc.ref.delete();
      await logServerEvent("signup_otp_verify_failed", {
        ip,
        email: normalizedEmail,
        reason: "expired",
      });
      return NextResponse.json({ success: false, error: "OTP expired." });
    }

    // ⛔ Too many attempts
    if (data.attempts >= 3) {
      await doc.ref.delete();
      await logServerEvent("signup_otp_verify_failed", {
        ip,
        email: normalizedEmail,
        reason: "attempts_exceeded",
      });
      return NextResponse.json({ success: false, error: "Too many failed attempts. Please request a new OTP." });
    }

    const expectedHash = hashOtp(normalizedEmail, normalizedOtp);
    if (data.otpHash !== expectedHash) {
      await doc.ref.update({ attempts: (data.attempts || 0) + 1 });
      await logServerEvent("signup_otp_verify_failed", {
        ip,
        email: normalizedEmail,
        reason: "mismatch",
      });
      return NextResponse.json({ success: false, error: "Incorrect OTP." });
    }

    // ✅ Success → Delete OTP
    await doc.ref.delete();

    await logServerEvent("signup_otp_verify_success", {
      ip,
      email: normalizedEmail,
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("VERIFY SIGNUP OTP ERROR:", error);
    await logServerEvent("signup_otp_verify_failed", {
      ip,
      message: error?.message || "Unknown",
    });
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
