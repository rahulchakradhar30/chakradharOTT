export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { hashOtp, signAdminSession } from "@/lib/adminAuth";
import { enforceRateLimit, getClientIp } from "@/lib/rateLimit";
import { normalizeEmail } from "@/lib/validation";
import { logServerEvent } from "@/lib/auditLog";

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

export async function POST(req) {
  const ip = getClientIp(req);

  try {
    const { email, otp } = await req.json();
    const normalizedEmail = normalizeEmail(email);
    const normalizedOtp = String(otp || "").trim();

    const limiter = await enforceRateLimit({
      scope: "otp_verify",
      subject: `${ip}:${normalizedEmail}`,
      limit: 18,
      windowMs: 10 * 60 * 1000,
    });

    if (!limiter.allowed) {
      return NextResponse.json({ success: false }, { status: 429 });
    }

    if (!normalizedEmail || !normalizedOtp) {
      return NextResponse.json(
        { success: false },
        { status: 400 }
      );
    }

    const allowedEmails = getAllowedAdminEmails();
    let isAllowed = allowedEmails.includes(normalizedEmail);
    
    if (!isAllowed) {
      const adminDoc = await adminDb.collection("admins").doc(normalizedEmail).get();
      if (adminDoc.exists) {
        isAllowed = true;
      }
    }

    if (!isAllowed) {
      await logServerEvent("admin_otp_verify_failed", {
        ip,
        email: normalizedEmail,
        reason: "unauthorized_email",
      });
      return NextResponse.json({ success: false }, { status: 403 });
    }

    // Check if admin account is disabled
    if (!allowedEmails.includes(normalizedEmail)) {
      const adminStatusDoc = await adminDb.collection("admins").doc(normalizedEmail).get();
      if (adminStatusDoc.exists) {
        const adminData = adminStatusDoc.data();
        if (adminData.status === "disabled" || adminData.status === "removed") {
          await logServerEvent("admin_otp_verify_failed", {
            ip,
            email: normalizedEmail,
            reason: "account_disabled",
          });
          return NextResponse.json(
            { success: false, error: "Your admin account has been disabled." },
            { status: 403 }
          );
        }
      }
    }

    const snapshot = await adminDb
      .collection("admin_otps")
      .where("email", "==", normalizedEmail)
      .get();

    if (snapshot.empty) {
      await logServerEvent("admin_otp_verify_failed", {
        ip,
        email: normalizedEmail,
        reason: "empty",
      });
      return NextResponse.json({ success: false });
    }

    const sorted = snapshot.docs.sort(
      (a, b) => (b.data().createdAt || 0) - (a.data().createdAt || 0)
    );

    const doc = sorted[0];
    const data = doc.data();

    // ⛔ Expired
    if (Date.now() > data.expiresAt) {
      await doc.ref.delete();
      await logServerEvent("admin_otp_verify_failed", {
        ip,
        email: normalizedEmail,
        reason: "expired",
      });
      return NextResponse.json({ success: false });
    }

    // ⛔ Too many attempts
    if (data.attempts >= 3) {
      await doc.ref.delete();
      await logServerEvent("admin_otp_verify_failed", {
        ip,
        email: normalizedEmail,
        reason: "attempts_exceeded",
      });
      return NextResponse.json({ success: false });
    }

    const expectedHash = hashOtp(normalizedEmail, normalizedOtp);
    if (data.otpHash !== expectedHash) {
      await doc.ref.update({ attempts: (data.attempts || 0) + 1 });
      await logServerEvent("admin_otp_verify_failed", {
        ip,
        email: normalizedEmail,
        reason: "mismatch",
      });
      return NextResponse.json({ success: false });
    }

    // ✅ Success → Delete OTP
    await doc.ref.delete();

    const token = signAdminSession(normalizedEmail);

    const response = NextResponse.json({ success: true });

    response.cookies.set("admin-session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 30,
      path: "/",
    });

    await logServerEvent("admin_otp_verify_success", {
      ip,
      email: normalizedEmail,
    });

    return response;

  } catch (error) {
    console.error("VERIFY OTP ERROR:", error);
    await logServerEvent("admin_otp_verify_failed", {
      ip,
      message: error?.message || "Unknown",
    });
    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}