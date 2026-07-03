import { Resend } from "resend";
import { NextResponse } from "next/server";
import { enforceRateLimit, getClientIp } from "@/lib/rateLimit";
import { isValidEmail, sanitizeText } from "@/lib/validation";
import { logServerEvent } from "@/lib/auditLog";
import { verifyAdminSession } from "@/lib/adminAuth";

export const runtime = "nodejs";

// Lazy initialize Resend only when API is called
function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error(
      "RESEND_API_KEY is not configured. Add it to .env.local to enable email replies."
    );
  }
  return new Resend(process.env.RESEND_API_KEY);
}

export async function POST(req) {
  const ip = getClientIp(req);

  try {
    const sessionToken = req.cookies.get("admin-session")?.value || "";
    const sessionEmail = verifyAdminSession(sessionToken);

    if (!sessionEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: "Email service not configured" },
        { status: 503 }
      );
    }

    const limiter = await enforceRateLimit({
      scope: "send_reply",
      subject: ip,
      limit: 12,
      windowMs: 10 * 60 * 1000,
    });

    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait." },
        { status: 429 }
      );
    }

    const resend = getResendClient();
    const { to, message } = await req.json();

    const recipient = String(to || "").trim().toLowerCase();
    const text = sanitizeText(message, 2500);

    if (!isValidEmail(recipient) || text.length < 3) {
      return NextResponse.json(
        { error: "Invalid email or message." },
        { status: 400 }
      );
    }

    const data = await resend.emails.send({
      from: "Chakradhar OTT <onboarding@resend.dev>",
      to: [recipient],
      subject: "Reply from Chakradhar OTT",
      html: `
        <div style="font-family:sans-serif;">
          <p>${text}</p>
          <br/>
          <p>— Chakradhar OTT Team</p>
        </div>
      `,
    });

    await logServerEvent("contact_reply_sent", {
      ip,
      to: recipient,
      admin: sessionEmail,
    });

    return NextResponse.json({ success: true, data });

  } catch (err) {
    console.error(err);
    await logServerEvent("contact_reply_failed", {
      ip,
      message: err?.message || "Unknown",
    });
    return NextResponse.json(
      { error: err.message || "Email failed" },
      { status: 500 }
    );
  }
}