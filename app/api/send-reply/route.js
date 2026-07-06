import { NextResponse } from "next/server";
import { enforceRateLimit, getClientIp } from "@/lib/rateLimit";
import { sanitizeText } from "@/lib/validation";
import { logServerEvent } from "@/lib/auditLog";
import { verifyAdminSession } from "@/lib/adminAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";
import { sendMail } from "@/lib/mail";

export const runtime = "nodejs";

export async function POST(req) {
  const ip = getClientIp(req);

  try {
    const sessionToken = req.cookies.get("admin-session")?.value || "";
    const sessionEmail = verifyAdminSession(sessionToken);

    if (!sessionEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return NextResponse.json(
        { error: "Email service not configured. Missing EMAIL_USER or EMAIL_PASS in environment." },
        { status: 503 }
      );
    }

    const { ticketId, message, status, attachments } = await req.json();

    if (!ticketId || typeof ticketId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid support ticket ID." },
        { status: 400 }
      );
    }

    const text = sanitizeText(message, 3000);
    if (text.length < 3) {
      return NextResponse.json(
        { error: "Message must be at least 3 characters long." },
        { status: 400 }
      );
    }

    const validAttachments = Array.isArray(attachments)
      ? attachments.filter(
          (att) =>
            att &&
            typeof att.name === "string" &&
            typeof att.url === "string" &&
            att.url.startsWith("http")
        )
      : [];

    const ticketRef = adminDb.collection("contacts").doc(ticketId);
    const ticketSnap = await ticketRef.get();

    if (!ticketSnap.exists) {
      return NextResponse.json(
        { error: "Ticket not found in the database." },
        { status: 404 }
      );
    }

    const ticketData = ticketSnap.data();
    const recipientEmail = String(ticketData.email || "").trim().toLowerCase();
    const recipientName = String(ticketData.name || "Customer").trim();
    const originalMessage = String(ticketData.message || "").trim();
    const userId = ticketData.userId || null;

    if (!recipientEmail) {
      return NextResponse.json(
        { error: "Ticket does not contain a valid recipient email address." },
        { status: 400 }
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
        { error: "Rate limit exceeded. Please try again shortly." },
        { status: 429 }
      );
    }

    let emailStatus = "success";
    let emailError = null;
    let resendData = null;

    // Build Attachments HTML section
    let attachmentsHtml = "";
    if (validAttachments.length > 0) {
      attachmentsHtml = `
        <div style="margin-top: 30px; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 20px;">
          <h4 style="margin: 0 0 10px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af;">Attachments</h4>
          <ul style="margin: 0; padding: 0; list-style-type: none;">
            ${validAttachments
              .map(
                (att) => `
              <li style="margin-bottom: 8px;">
                <a href="${att.url}" target="_blank" style="color: #06b6d4; text-decoration: none; font-size: 14px; font-weight: 600; display: inline-flex; items-center; gap: 5px;">
                  📎 ${att.name}
                </a>
              </li>
            `
              )
              .join("")}
          </ul>
        </div>
      `;
    }

    // Build Plain-text Fallback
    let plainTextContent = `Hello ${recipientName},\n\nOur support team has posted a reply to your inquiry:\n\n${text}\n\n`;
    if (validAttachments.length > 0) {
      plainTextContent += "Attachments:\n" + validAttachments.map((att) => `- ${att.name}: ${att.url}`).join("\n") + "\n\n";
    }
    plainTextContent += `Original Inquiry:\n"${originalMessage}"\n\n---\nChakradhar Stream Support Team`;

    try {
      resendData = await sendMail({
        to: recipientEmail,
        subject: `Re: Support Ticket - Chakradhar Stream`,
        text: plainTextContent,
        html: `
          <div style="background-color: #0c1328; padding: 45px 15px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f3f4f6;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #060b19; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 20px; overflow: hidden; box-shadow: 0 12px 30px rgba(0, 0, 0, 0.65);">
              
              <!-- Header Section -->
              <div style="background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); padding: 35px 25px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 900; letter-spacing: -0.5px;">Chakradhar Stream</h1>
                <p style="margin: 6px 0 0 0; color: rgba(255, 255, 255, 0.85); font-size: 13px; text-transform: uppercase; letter-spacing: 2.5px; font-weight: 600;">Support Desk Response</p>
              </div>

              <!-- Main Content -->
              <div style="padding: 40px 30px;">
                <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; color: #ffffff;">Hello <strong>${recipientName}</strong>,</p>
                <p style="font-size: 15px; line-height: 1.6; margin: 0 0 30px 0; color: #d1d5db;">Our support team has reviewed your query and posted a reply to your inquiry. Please see our response below:</p>
                
                <!-- Support Reply Box -->
                <div style="background-color: rgba(255, 255, 255, 0.03); border-left: 4px solid #06b6d4; padding: 25px 20px; border-radius: 8px; margin: 0 0 35px 0; box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);">
                  <h3 style="margin: 0 0 10px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #06b6d4;">Official Reply</h3>
                  <p style="margin: 0; font-size: 15px; line-height: 1.65; color: #ffffff; white-space: pre-wrap;">${text}</p>
                </div>

                <!-- Attachments Section -->
                ${attachmentsHtml}

                <!-- Original Query Box -->
                <div style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 25px; margin-top: 30px;">
                  <h4 style="margin: 0 0 12px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af;">Original Inquiry</h4>
                  <div style="font-size: 14px; line-height: 1.6; color: #9ca3af; font-style: italic; background-color: rgba(0, 0, 0, 0.15); padding: 15px 20px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.04);">
                    "${originalMessage}"
                  </div>
                </div>
              </div>

              <!-- Footer Section -->
              <div style="background-color: #030712; padding: 25px 30px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid rgba(255, 255, 255, 0.05);">
                <p style="margin: 0 0 6px 0;">Have more questions? Feel free to visit our web portal or contact us directly.</p>
                <p style="margin: 0 0 12px 0; color: #4b5563;">Please do not reply directly to this automated onboarding address.</p>
                <p style="margin: 0; font-weight: 600; color: #4b5563;">&copy; 2026 Chakradhar Stream Support. All rights reserved.</p>
              </div>
            </div>
          </div>
        `,
      });
    } catch (err) {
      console.error("Nodemailer SMTP error:", err);
      emailStatus = "failed";
      emailError = err?.message || "Unknown SMTP error";
    }

    const replyId = crypto.randomUUID();
    const replyObject = {
      id: replyId,
      emailId: resendData?.id || null,
      content: text,
      repliedBy: sessionEmail,
      repliedAt: new Date().toISOString(),
      emailStatus,
      attachments: validAttachments,
    };

    // Update document using adminDb
    const updatePayload = {
      replied: true,
      repliedAt: new Date(),
      repliedBy: sessionEmail,
      replyContent: text,
      emailStatus,
      messageStatus: status || "Replied",
      lastEmailId: resendData?.id || null,
      replies: FieldValue.arrayUnion(replyObject),
    };

    await ticketRef.update(updatePayload);

    // Create in-app support reply notification for the user
    if (userId) {
      try {
        await adminDb.collection("users").doc(userId).collection("notifications").add({
          title: "New Support Reply!",
          message: `Our support team has posted a reply to your ticket: "${text.slice(0, 60)}${text.length > 60 ? "..." : ""}"`,
          type: "support_reply",
          read: false,
          createdAt: new Date(),
        });
      } catch (notifErr) {
        console.error("Failed to create in-app notification for ticket reply:", notifErr);
      }
    }

    await logServerEvent(emailStatus === "success" ? "contact_reply_sent" : "contact_reply_failed", {
      ip,
      ticketId,
      to: recipientEmail,
      admin: sessionEmail,
      emailError,
    });

    if (emailStatus === "failed") {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to dispatch email, but reply saved locally in history.",
          emailError,
          data: { replyId },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: { replyId, resendData } });

  } catch (err) {
    console.error(err);
    await logServerEvent("contact_reply_server_error", {
      ip,
      message: err?.message || "Unknown",
    });
    return NextResponse.json(
      { error: err.message || "Failed to process reply request." },
      { status: 500 }
    );
  }
}