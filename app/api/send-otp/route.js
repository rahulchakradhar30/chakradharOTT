export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { hashOtp } from "@/lib/adminAuth";
import { enforceRateLimit, getClientIp } from "@/lib/rateLimit";
import { isValidEmail, normalizeEmail } from "@/lib/validation";
import { logServerEvent } from "@/lib/auditLog";
import { sendMail } from "@/lib/mail";

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
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return NextResponse.json(
        { success: false, error: "Email service not configured. Missing EMAIL_USER or EMAIL_PASS in environment." },
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
      let isAllowed = allowedEmails.includes(normalizedEmail);
      
      if (!isAllowed) {
        const adminDoc = await adminDb.collection("admins").doc(normalizedEmail).get();
        if (adminDoc.exists) {
          isAllowed = true;
        }
      }

      if (!isAllowed) {
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

    await sendMail({
      to: normalizedEmail,
      subject: "Admin OTP Verification",
      text: `Your OTP is: ${otp}\nValid for 5 minutes.`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your OTP Code</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #04070f; color: #ffffff;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #04070f; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" max-width="500" border="0" cellspacing="0" cellpadding="0" style="max-width: 500px; background-color: #0a1122; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);">
                  <tr>
                    <td align="center" style="padding: 40px 30px; background: linear-gradient(135deg, rgba(0, 212, 255, 0.1) 0%, rgba(255, 77, 141, 0.05) 100%); border-bottom: 1px solid rgba(255,255,255,0.05);">
                      <h1 style="margin: 0; font-size: 24px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">Chakradhar Stream</h1>
                      <p style="margin: 10px 0 0 0; font-size: 14px; color: #9ca3af; text-transform: uppercase; letter-spacing: 2px; font-weight: 700;">Admin Verification</p>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding: 40px 30px;">
                      <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #d1d5db;">You requested a one-time password to access the Admin Dashboard. Please use the verification code below to securely log in.</p>
                      
                      <div style="background-color: rgba(0, 212, 255, 0.05); border: 1px solid rgba(0, 212, 255, 0.2); border-radius: 12px; padding: 25px 20px; margin: 30px 0;">
                        <h2 style="margin: 0; font-size: 42px; font-weight: 900; color: #00d4ff; letter-spacing: 8px; font-family: monospace; text-shadow: 0 0 15px rgba(0,212,255,0.4);">${otp}</h2>
                      </div>
                      
                      <p style="margin: 0 0 20px 0; font-size: 13px; color: #9ca3af;">
                        <strong style="color: #ffffff;">Note:</strong> This code will expire in <strong>5 minutes</strong>. If you did not request this, please ignore this email.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding: 20px; background-color: rgba(0,0,0,0.4); border-top: 1px solid rgba(255,255,255,0.05);">
                      <p style="margin: 0; font-size: 11px; color: #6b7280; font-weight: 500;">
                        Securely generated by Chakradhar Stream Security.<br>
                        © ${new Date().getFullYear()} Chakradhar Stream. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
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