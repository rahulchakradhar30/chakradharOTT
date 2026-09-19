import { NextResponse } from "next/server";
import { verifyMailConnection, sendMail } from "@/lib/mail";
import { verifyAdminSession } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const token = req.cookies.get("admin-session")?.value || "";
    const callerEmail = verifyAdminSession(token);
    const isDev = process.env.NODE_ENV !== "production";

    if (!callerEmail && !isDev) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const emailUser = (process.env.EMAIL_USER || process.env.SMTP_USER || "").trim();
    const rawPass = process.env.EMAIL_PASS || process.env.SMTP_PASS || "";
    const cleanPass = rawPass.replace(/\s+/g, "");
    const host = process.env.EMAIL_HOST || process.env.SMTP_HOST || "smtp.gmail.com";
    const port = process.env.EMAIL_PORT || process.env.SMTP_PORT || "465";

    const isPlaceholder = cleanPass.toLowerCase().includes("xxxx") || cleanPass === "your-gmail-app-password";

    const connectionTest = await verifyMailConnection();

    return NextResponse.json({
      configured: Boolean(emailUser && cleanPass && !isPlaceholder),
      service: host.includes("gmail.com") ? "Gmail SMTP" : "Custom SMTP",
      host,
      port,
      user: emailUser ? `${emailUser.slice(0, 3)}***@${emailUser.split("@")[1] || "domain"}` : "NOT SET",
      passwordConfigured: Boolean(cleanPass),
      passwordLength: cleanPass.length,
      passwordIsPlaceholder: isPlaceholder,
      connectionStatus: connectionTest.success ? "READY" : "FAILED",
      connectionError: connectionTest.error || null,
      recommendation: !emailUser || !cleanPass || isPlaceholder
        ? "Please define EMAIL_USER and EMAIL_PASS in .env.local with a 16-character Google App Password."
        : cleanPass.length !== 16 && host.includes("gmail.com")
        ? "Warning: Google App Passwords are strictly 16 characters. Standard Google passwords fail with error 535."
        : connectionTest.success
        ? "SMTP is properly configured and verified!"
        : "SMTP connection failed. Check your App Password or firewall/network settings.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to inspect SMTP configuration" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const token = req.cookies.get("admin-session")?.value || "";
    const callerEmail = verifyAdminSession(token);
    const isDev = process.env.NODE_ENV !== "production";

    if (!callerEmail && !isDev) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { targetEmail } = await req.json().catch(() => ({}));
    const recipient = targetEmail || callerEmail || process.env.EMAIL_USER;

    if (!recipient) {
      return NextResponse.json(
        { error: "Recipient email is required for test email." },
        { status: 400 }
      );
    }

    const nowStr = new Date().toISOString();
    const result = await sendMail({
      to: recipient,
      subject: "Test Email from Chakradhar Stream SMTP Service",
      text: `Hello,\n\nThis is a test email sent from Chakradhar Stream to verify that email delivery is working properly.\n\nTimestamp: ${nowStr}\nStatus: Operational\n\nBest regards,\nChakradhar Stream System`,
      html: `
        <div style="background-color: #0c1328; padding: 40px 10px; font-family: sans-serif; color: #f3f4f6;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #060b19; border: 1px solid rgba(6,182,212,0.3); border-radius: 20px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); padding: 25px 20px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 900;">SMTP Delivery Test</h1>
              <p style="margin: 4px 0 0 0; color: rgba(255,255,255,0.85); font-size: 12px; text-transform: uppercase;">Chakradhar Stream Verification</p>
            </div>
            <div style="padding: 30px;">
              <p style="font-size: 15px; color: #10b981; font-weight: bold; margin-top: 0;">✔ Email delivery succeeded!</p>
              <p style="font-size: 14px; color: #d1d5db; line-height: 1.6;">Your SMTP service is correctly configured and successfully delivered this message to <strong>${recipient}</strong>.</p>
              <p style="font-size: 12px; color: #9ca3af; margin-top: 20px;">Sent at: ${nowStr}</p>
            </div>
          </div>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      message: `Test email dispatched to ${recipient}`,
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to send test email",
      },
      { status: 500 }
    );
  }
}
