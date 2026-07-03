import crypto from "crypto";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { enforceRateLimit, getClientIp } from "@/lib/rateLimit";
import { logServerEvent } from "@/lib/auditLog";

function generateTicketCode() {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

export async function POST(req) {
  const ip = getClientIp(req);

  try {
    const limiter = await enforceRateLimit({
      scope: "razorpay_verify",
      subject: ip,
      limit: 30,
      windowMs: 10 * 60 * 1000,
    });

    if (!limiter.allowed) {
      return NextResponse.json(
        { success: false, message: "Too many requests" },
        { status: 429 }
      );
    }

    const body = await req.json();

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      userId,
      premiereId,
      title,
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !userId || !premiereId) {
      await logServerEvent("razorpay_verify_failed", {
        ip,
        reason: "invalid_payload",
      });
      return NextResponse.json({ success: false, message: "Invalid payload" }, { status: 400 });
    }

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      await logServerEvent("razorpay_verify_failed", {
        ip,
        reason: "invalid_signature",
        paymentId: razorpay_payment_id,
      });
      return NextResponse.json({ success: false, message: "Invalid signature" }, { status: 400 });
    }

    const paymentRef = adminDb.collection("payments").doc(razorpay_payment_id);
    const premiereRef = adminDb.collection("premieres").doc(premiereId);

    const result = await adminDb.runTransaction(async (tx) => {
      const existingPayment = await tx.get(paymentRef);
      if (existingPayment.exists) {
        return { alreadyProcessed: true };
      }

      const premiereSnap = await tx.get(premiereRef);
      if (!premiereSnap.exists) {
        throw new Error("Premiere not found");
      }

      const premiere = premiereSnap.data();
      const maxTickets = Number(premiere.ticketLimit || 0);
      const sold = Number(premiere.ticketsSold || 0);

      if (maxTickets > 0 && sold >= maxTickets) {
        throw new Error("Sold out");
      }

      const ticketCode = generateTicketCode();
      const now = FieldValue.serverTimestamp();

      const premiereTicketRef = premiereRef.collection("tickets").doc(ticketCode);
      const userTicketRef = adminDb.collection("users").doc(userId).collection("tickets").doc(ticketCode);

      tx.set(premiereTicketRef, {
        code: ticketCode,
        used: false,
        createdAt: now,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        approved: true,
        approvedAt: now,
      });

      tx.set(userTicketRef, {
        ticketCode,
        premiereId,
        title: title || premiere.title || "Premiere",
        purchasedAt: now,
      });

      tx.set(paymentRef, {
        userId,
        premiereId,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        createdAt: now,
      });

      tx.update(premiereRef, {
        ticketsSold: sold + 1,
      });

      return { success: true };
    });

    if (result.alreadyProcessed) {
      await logServerEvent("razorpay_verify_duplicate", {
        ip,
        paymentId: razorpay_payment_id,
      });
      return NextResponse.json({ success: true, alreadyProcessed: true });
    }

    await logServerEvent("razorpay_verify_success", {
      ip,
      paymentId: razorpay_payment_id,
      premiereId,
      userId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Razorpay verify error:", error);
    await logServerEvent("razorpay_verify_failed", {
      ip,
      reason: error?.message || "Unknown",
    });

    const message = String(error?.message || "Verification failed");
    if (message === "Sold out") {
      return NextResponse.json({ success: false, message }, { status: 409 });
    }

    if (message === "Premiere not found") {
      return NextResponse.json({ success: false, message }, { status: 404 });
    }

    return NextResponse.json({ success: false, message: "Verification failed" }, { status: 500 });
  }
}
