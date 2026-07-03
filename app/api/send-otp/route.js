export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { Resend } from "resend";
import { hashOtp } from "@/lib/adminAuth";
import { enforceRateLimit, getClientIp } from "@/lib/rateLimit";
import { isValidEmail, normalizeEmail } from "@/lib/validation";
import { logServerEvent } from "@/lib/auditLog";

// Lazy initialize Resend only when API is called
function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error(
      "RESEND_API_KEY is not configured. Add it to .env.local to enable OTP emails."
    );
  }
  return new Resend(process.env.RESEND_API_KEY);
}

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
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { success: false, error: "Email service not configured" },
        { status: 503 }
      );
    }

    const { email } = await req.json();
    const normalizedEmail = normalizeEmail(email);

    const ipLimiter = await enforceRateLimit({
      scope: "otp_send_ip",
      subject: ip,
      limit: 20,
      windowMs: 10 * 60 * 1000,
    });

    if (!ipLimiter.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests." },
        { status: 429 }
      );
    }

    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json(
        { success: false, error: "Valid email required" },
        { status: 400 }
      );
    }

      const allowedEmails = getAllowedAdminEmails();
      if (!allowedEmails.includes(normalizedEmail)) {
        await logServerEvent("admin_otp_send_failed", {
          ip,
          email: normalizedEmail,
          message: "unauthorized_email",
        });
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 403 }
        );
      }

    const emailLimiter = await enforceRateLimit({
      scope: "otp_send_email",
      subject: normalizedEmail,
      limit: 8,
      windowMs: 15 * 60 * 1000,
    });

    if (!emailLimiter.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many OTP requests. Try later." },
        { status: 429 }
      );
    }

    const now = Date.now();

    // 🔎 Get all OTPs for this email (no orderBy to avoid index requirement)
    const snapshot = await adminDb
      .collection("admin_otps")
      .where("email", "==", normalizedEmail)
      .get();

    const docs = snapshot.docs.map((doc) => doc.data());

    if (docs.length > 0) {
      // Sort manually (latest first)
      docs.sort((a, b) => b.createdAt - a.createdAt);

      const lastOtp = docs[0];

      // ⛔ Cooldown: 60 seconds
      if (now - lastOtp.createdAt < 60 * 1000) {
        return NextResponse.json(
          { success: false, error: "Wait before requesting new OTP." },
          { status: 429 }
        );
      }

      // ⛔ Max 3 OTPs in 5 minutes
      const lastFiveMinutes = docs.filter(
        (doc) => now - doc.createdAt < 5 * 60 * 1000
      );

      if (lastFiveMinutes.length >= 3) {
        return NextResponse.json(
          { success: false, error: "Too many OTP requests. Try later." },
          { status: 429 }
        );
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = hashOtp(normalizedEmail, otp);

    await adminDb.collection("admin_otps").add({
      email: normalizedEmail,
      otpHash,
      attempts: 0,
      createdAt: now,
      expiresAt: now + 5 * 60 * 1000,
    });

    const resend = getResendClient();

    await resend.emails.send({
      from: "Chakradhar OTT <onboarding@resend.dev>",
      to: normalizedEmail,
      subject: "Admin OTP Verification",
      html: `
        <div style="font-family: sans-serif;">
          <h2>Your OTP is: ${otp}</h2>
          <p>Valid for 5 minutes.</p>
        </div>
      `,
    });

    await logServerEvent("admin_otp_sent", {
      ip,
      email: normalizedEmail,
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("SEND OTP ERROR:", error);
    await logServerEvent("admin_otp_send_failed", {
      ip,
      message: error?.message || "Unknown",
    });
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}