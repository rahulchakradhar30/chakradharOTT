import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { logServerEvent } from "@/lib/auditLog";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    // Basic verification token via search params to prevent unauthorized abuse
    const token = req.nextUrl.searchParams.get("token");
    if (!token || token !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await req.json();
    const eventType = payload?.type; // e.g. "email.bounced" or "email.delivered"
    const emailId = payload?.data?.email_id;

    if (!eventType || !emailId) {
      return NextResponse.json({ error: "Invalid webhook payload structure" }, { status: 400 });
    }

    console.log(`Webhook received: ${eventType} for Email ID: ${emailId}`);

    // Query for the ticket that has this emailId as its lastEmailId
    const snap = await adminDb
      .collection("contacts")
      .where("lastEmailId", "==", emailId)
      .limit(1)
      .get();

    if (snap.empty) {
      console.log(`No ticket matching lastEmailId: ${emailId}`);
      await logServerEvent("email_webhook_unmatched", { emailId, eventType });
      return NextResponse.json({ success: true, message: "No matching ticket found." });
    }

    const ticketDoc = snap.docs[0];
    const ticketRef = ticketDoc.ref;

    // Determine the status value based on the event
    // Resend events: "email.bounced", "email.complained" => failed, "email.delivered" => success
    const newEmailStatus = eventType.includes("bounced") || eventType.includes("complained") ? "failed" : "success";

    // Run transaction to atomically update both main status and nested reply history item
    await adminDb.runTransaction(async (transaction) => {
      const freshSnap = await transaction.get(ticketRef);
      if (!freshSnap.exists) return;

      const ticketData = freshSnap.data();
      const replies = ticketData.replies || [];

      // Update the specific reply that corresponds to the webhook email ID
      const updatedReplies = replies.map((reply) => {
        if (reply.emailId === emailId) {
          return { ...reply, emailStatus: newEmailStatus };
        }
        return reply;
      });

      transaction.update(ticketRef, {
        emailStatus: newEmailStatus,
        replies: updatedReplies,
        // If email bounced, append audit log details directly or change status
      });
    });

    await logServerEvent("email_webhook_processed", {
      ticketId: ticketDoc.id,
      emailId,
      eventType,
      status: newEmailStatus,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Webhook processing error:", err);
    return NextResponse.json({ error: err.message || "Webhook processing failed" }, { status: 500 });
  }
}
