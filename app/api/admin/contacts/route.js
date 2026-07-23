import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAdminSession, isSuperAdminEmail } from "@/lib/adminAuth";
import { sendMail } from "@/lib/mail";
import { notifyAdmins } from "@/lib/notifications";
import { logServerEvent } from "@/lib/auditLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ── GET: List contact tickets ── */
export async function GET(req) {
  try {
    const token = req.cookies.get("admin-session")?.value || "";
    const callerEmail = verifyAdminSession(token);

    if (!callerEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cleanCaller = callerEmail.toLowerCase().trim();
    const isSuper = isSuperAdminEmail(cleanCaller);

    const contactsRef = adminDb.collection("contacts");
    const snap = await contactsRef.get();

    const tickets = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      tickets.push({
        id: docSnap.id,
        ...d,
        createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : d.createdAt,
      });
    });

    // Sort by createdAt descending
    tickets.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    if (isSuper) {
      return NextResponse.json({ success: true, tickets });
    }

    // Sub-Admin: filter tickets assigned to caller or unassigned
    const filtered = tickets.filter(
      (t) => !t.assignedTo || t.assignedTo.toLowerCase() === cleanCaller
    );

    return NextResponse.json({ success: true, tickets: filtered });
  } catch (error) {
    console.error("Fetch contacts error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch contact tickets" }, { status: 500 });
  }
}

/* ── PATCH: Assign ticket or Reply to ticket ── */
export async function PATCH(req) {
  try {
    const token = req.cookies.get("admin-session")?.value || "";
    const callerEmail = verifyAdminSession(token);

    if (!callerEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cleanCaller = callerEmail.toLowerCase().trim();
    const isSuper = isSuperAdminEmail(cleanCaller);

    const { action, ticketId, assignedTo, assignedToName, replyText } = await req.json();

    if (!ticketId || !action) {
      return NextResponse.json({ error: "Ticket ID and Action required." }, { status: 400 });
    }

    const ticketRef = adminDb.collection("contacts").doc(ticketId);
    const ticketSnap = await ticketRef.get();

    if (!ticketSnap.exists) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }

    const ticketData = ticketSnap.data();

    /* ── Action 1: Assign ticket to Sub-Admin (Super Admin only) ── */
    if (action === "assign") {
      if (!isSuper) {
        return NextResponse.json({ error: "Only Super Admin can assign tickets." }, { status: 403 });
      }

      const cleanAssignee = (assignedTo || "").toLowerCase().trim();

      await ticketRef.update({
        assignedTo: cleanAssignee || null,
        assignedToName: assignedToName || cleanAssignee.split("@")[0] || null,
        assignedBy: cleanCaller,
        assignedAt: new Date(),
      });

      // Dispatch notification & email to assigned sub-admin
      if (cleanAssignee) {
        try {
          await sendMail({
            to: cleanAssignee,
            subject: `[Ticket Assigned] Support Ticket #${ticketId.slice(0, 6)} — Chakradhar Stream`,
            text: `Hello,\n\nSuper Admin (${cleanCaller}) has assigned a support ticket to you:\n\nCustomer: ${ticketData.name} (${ticketData.email})\nMessage: "${ticketData.message}"\n\nPlease view and reply at: ${process.env.NEXT_PUBLIC_APP_URL || "https://chakradharstream.vercel.app"}/sub-admin/contacts`,
          });
        } catch (mErr) {
          console.warn("Ticket assignment email failed:", mErr);
        }
      }

      await logServerEvent("ticket_assigned", {
        ticketId,
        assignedTo: cleanAssignee,
        assignedBy: cleanCaller,
      });

      return NextResponse.json({
        success: true,
        message: `Ticket assigned to ${cleanAssignee || "Unassigned"}.`,
      });
    }

    /* ── Action 2: Reply to Customer Ticket ── */
    if (action === "reply") {
      const cleanReply = (replyText || "").trim();

      if (!cleanReply) {
        return NextResponse.json({ error: "Reply text is required." }, { status: 400 });
      }

      // Update ticket document
      await ticketRef.update({
        replyText: cleanReply,
        repliedBy: cleanCaller,
        repliedAt: new Date(),
        messageStatus: "Replied",
        isRead: true,
      });

      // Send email response to Customer
      try {
        await sendMail({
          to: ticketData.email,
          subject: `Re: Your Support Ticket — Chakradhar Stream`,
          text: `Hello ${ticketData.name},\n\n${cleanReply}\n\n---\nOriginal Message:\n"${ticketData.message}"\n\nChakradhar Stream Support Team`,
          html: `
            <div style="background-color: #0c1328; padding: 40px 10px; font-family: sans-serif; color: #f3f4f6;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #060b19; border: 1px solid rgba(6,182,212,0.3); border-radius: 20px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.5);">
                <div style="background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); padding: 25px 20px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 900;">Chakradhar Stream Support</h1>
                  <p style="margin: 4px 0 0 0; color: rgba(255,255,255,0.85); font-size: 12px; text-transform: uppercase;">Ticket Reply</p>
                </div>
                <div style="padding: 30px;">
                  <p style="font-size: 16px; font-weight: bold; margin-bottom: 15px; color: #ffffff;">Hello ${ticketData.name},</p>
                  <div style="background-color: rgba(255,255,255,0.04); border-left: 3px solid #06b6d4; padding: 15px; border-radius: 8px; font-size: 14px; color: #d1d5db; line-height: 1.6; whitespace: pre-wrap; margin-bottom: 25px;">
                    ${cleanReply.replace(/\n/g, "<br/>")}
                  </div>
                  <div style="border-top: 1px solid rgba(255,255,255,0.1); pt-4; margin-top: 20px; font-size: 12px; color: #9ca3af;">
                    <p style="font-weight: bold; margin-bottom: 4px;">Original Inquiry:</p>
                    <p style="margin: 0; font-style: italic;">"${ticketData.message}"</p>
                  </div>
                </div>
              </div>
            </div>
          `,
        });
      } catch (mailErr) {
        console.warn("Customer ticket reply email failed:", mailErr);
      }

      await logServerEvent("ticket_replied", {
        ticketId,
        repliedBy: cleanCaller,
      });

      return NextResponse.json({
        success: true,
        message: `Reply sent successfully to ${ticketData.email}.`,
      });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error) {
    console.error("Manage ticket error:", error);
    return NextResponse.json({ error: error.message || "Failed to manage ticket" }, { status: 500 });
  }
}
