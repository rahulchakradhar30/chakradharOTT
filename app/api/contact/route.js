import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { enforceRateLimit, getClientIp } from "@/lib/rateLimit";
import { isValidEmail, sanitizeText } from "@/lib/validation";
import { logServerEvent } from "@/lib/auditLog";

export const runtime = "nodejs";

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
    const message = sanitizeText(body?.message, 4000);
    const userId = body?.userId ? String(body.userId).trim() : null;
    const imageUrl = body?.imageUrl ? String(body.imageUrl).trim() : null;

    if (!name || !isValidEmail(email) || message.length < 5) {
      return NextResponse.json(
        { success: false, error: "Invalid request data" },
        { status: 400 }
      );
    }

    const docRef = await adminDb.collection("contacts").add({
      userId,
      name,
      email,
      message,
      imageUrl,
      createdAt: FieldValue.serverTimestamp(),
      source: "web",
      ip,
      messageStatus: "New",
      isRead: false,
      archived: false,
    });

    await logServerEvent("contact_created", { email, ip, ticketId: docRef.id });

    return NextResponse.json({ success: true, ticketId: docRef.id });
  } catch (error) {
    console.error("CONTACT API ERROR:", error);
    await logServerEvent("contact_create_failed", {
      ip,
      message: error?.message || "Unknown",
    });

    return NextResponse.json(
      { success: false, error: "Failed to send message" },
      { status: 500 }
    );
  }
}
