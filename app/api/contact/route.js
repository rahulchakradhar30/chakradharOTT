import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { enforceRateLimit, getClientIp } from "@/lib/rateLimit";
import { isValidEmail, sanitizeText } from "@/lib/validation";
import { notifyAdmins } from "@/lib/notifications";
import { logServerEvent } from "@/lib/auditLog";

export const runtime = "nodejs";

/**
 * Generate a clean 6-digit unique Ticket ID formatted like CS184920
 */
async function generateUniqueTicketId() {
  for (let attempt = 0; attempt < 5; attempt++) {
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    const candidateId = `CS${randomDigits}`;
    const snap = await adminDb.collection("contacts").doc(candidateId).get();
    if (!snap.exists) {
      return candidateId;
    }
  }
  // Fallback timestamp suffix if max attempts reached
  return `CS${Date.now().toString().slice(-6)}`;
}

export async function POST(req) {
  const ip = getClientIp(req);

  try {
    const limiter = await enforceRateLimit({
      scope: "contact_submit",
      subject: ip,
      limit: 10,
      windowMs: 10 * 60 * 1000,
    });

    if (!limiter.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many messages. Please wait and retry." },
        { status: 429 }
      );
    }

    const body = await req.json();

    const honeypot = String(body?.website || "").trim();
    if (honeypot) {
      return NextResponse.json({ success: true });
    }

    const name = sanitizeText(body?.name, 120);
    const email = String(body?.email || "").trim().toLowerCase();
    const subject = sanitizeText(body?.subject, 200) || "General Support Inquiry";
    const message = sanitizeText(body?.message, 4000);
    const userId = body?.userId ? String(body.userId).trim() : null;
    const imageUrl = body?.imageUrl ? String(body.imageUrl).trim() : null;

    if (!name || !isValidEmail(email) || message.length < 5) {
      return NextResponse.json(
        { success: false, error: "Invalid request data. Please provide name, email, and detailed message." },
        { status: 400 }
      );
    }

    const ticketId = await generateUniqueTicketId();

    const ticketData = {
      ticketId,
      userId,
      name,
      email,
      subject,
      message,
      imageUrl,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      source: "web",
      ip,
      messageStatus: "New",
      isRead: false,
      archived: false,
      replies: [],
    };

    await adminDb.collection("contacts").doc(ticketId).set(ticketData);

    // Send site notification & email alert to all administrators
    notifyAdmins({
      title: `📩 New Support Ticket #${ticketId}: ${subject}`,
      message: `User ${name} (${email}) opened ticket #${ticketId}: "${message.slice(0, 150)}..."`,
      type: "contact_submission",
      link: "/admin/contacts",
      sendEmail: true,
    }).catch((err) => console.warn("Failed to notify admins of contact message:", err));

    await logServerEvent("contact_created", { email, ip, ticketId });

    return NextResponse.json({ success: true, ticketId });
  } catch (error) {
    console.error("CONTACT API ERROR:", error);
    await logServerEvent("contact_create_failed", {
      ip,
      message: error?.message || "Unknown",
    });

    return NextResponse.json(
      { success: false, error: "Failed to submit support ticket. Please try again." },
      { status: 500 }
    );
  }
}
