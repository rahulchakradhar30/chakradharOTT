import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAdminSession } from "@/lib/adminAuth";
import { sendMail } from "@/lib/mail";
import { logServerEvent } from "@/lib/auditLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ── GET: List incoming/sent internal mails & list active admins ── */
export async function GET(req) {
  try {
    const token = req.cookies.get("admin-session")?.value || "";
    const callerEmail = verifyAdminSession(token);

    if (!callerEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cleanCaller = callerEmail.trim().toLowerCase();

    // 1. Fetch active admin accounts for recipient selector
    const adminsSnap = await adminDb.collection("admins").get();
    const adminList = [
      { email: "thefifthagefilms@gmail.com", name: "Permanent Super Admin" },
      { email: "rahulchakradharperepogu@gmail.com", name: "Super Admin" },
    ];

    adminsSnap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.status !== "disabled" && data.status !== "removed") {
        if (!adminList.some((a) => a.email.toLowerCase() === docSnap.id.toLowerCase())) {
          adminList.push({
            email: docSnap.id.toLowerCase(),
            name: data.name || docSnap.id.split("@")[0],
            role: data.role || "sub_admin",
          });
        }
      }
    });

    // 2. Fetch mails where caller is sender, recipient, or broadcast recipient
    const mailsRef = adminDb.collection("adminMails");
    const [incomingSnap, sentSnap, broadcastSnap] = await Promise.all([
      mailsRef.where("recipientEmail", "==", cleanCaller).get(),
      mailsRef.where("senderEmail", "==", cleanCaller).get(),
      mailsRef.where("recipientEmail", "==", "all").get(),
    ]);

    const mailMap = new Map();

    const addDocs = (snap) => {
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        mailMap.set(docSnap.id, {
          id: docSnap.id,
          ...d,
          createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : d.createdAt,
        });
      });
    };

    addDocs(incomingSnap);
    addDocs(sentSnap);
    addDocs(broadcastSnap);

    const allMails = Array.from(mailMap.values()).sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );

    const unreadCount = allMails.filter(
      (m) => (m.recipientEmail === cleanCaller || m.recipientEmail === "all") && !m.readBy?.includes(cleanCaller) && !m.read
    ).length;

    return NextResponse.json({
      success: true,
      mails: allMails,
      admins: adminList,
      unreadCount,
    });
  } catch (error) {
    console.error("Fetch admin mails error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch mails" }, { status: 500 });
  }
}

/* ── POST: Send internal mail / reply / broadcast ── */
export async function POST(req) {
  try {
    const token = req.cookies.get("admin-session")?.value || "";
    const callerEmail = verifyAdminSession(token);

    if (!callerEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cleanSender = callerEmail.trim().toLowerCase();
    const { toEmail, subject, body, parentMailId, threadId } = await req.json();

    const cleanRecipient = (toEmail || "").trim().toLowerCase();
    const cleanSubject = (subject || "").trim();
    const cleanBody = (body || "").trim();

    if (!cleanRecipient || !cleanSubject || !cleanBody) {
      return NextResponse.json({ error: "Recipient, Subject, and Body are required." }, { status: 400 });
    }

    const newMailRef = adminDb.collection("adminMails").doc();
    const mailId = newMailRef.id;

    const mailDoc = {
      id: mailId,
      senderEmail: cleanSender,
      recipientEmail: cleanRecipient,
      subject: cleanSubject,
      body: cleanBody,
      createdAt: new Date(),
      read: false,
      readBy: [],
      threadId: threadId || parentMailId || mailId,
      parentMailId: parentMailId || null,
    };

    await newMailRef.set(mailDoc);

    // Send external email notification if sending to a specific admin
    if (cleanRecipient !== "all" && cleanRecipient !== cleanSender) {
      try {
        await sendMail({
          to: cleanRecipient,
          subject: `[Admin Mail] ${cleanSubject}`,
          text: `You have received an internal admin mail from ${cleanSender}:\n\nSubject: ${cleanSubject}\n\n${cleanBody}\n\nReply directly at: ${process.env.NEXT_PUBLIC_APP_URL || "https://chakradharstream.vercel.app"}/admin/mail`,
          html: `
            <div style="background-color: #0c1328; padding: 40px 10px; font-family: sans-serif; color: #f3f4f6;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #060b19; border: 1px solid rgba(6,182,212,0.3); border-radius: 20px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.5);">
                <div style="background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); padding: 25px 20px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 900;">Internal Admin Desk Mail</h1>
                  <p style="margin: 4px 0 0 0; color: rgba(255,255,255,0.85); font-size: 12px; text-transform: uppercase;">From ${cleanSender}</p>
                </div>
                <div style="padding: 30px;">
                  <h2 style="font-size: 18px; font-weight: bold; margin-top: 0; color: #ffffff;">${cleanSubject}</h2>
                  <div style="background-color: rgba(255,255,255,0.04); border-left: 3px solid #06b6d4; padding: 15px; border-radius: 8px; font-size: 14px; color: #d1d5db; line-height: 1.6; whitespace: pre-wrap; margin-bottom: 25px;">
                    ${cleanBody.replace(/\n/g, "<br/>")}
                  </div>
                  <div style="text-align: center;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://chakradharstream.vercel.app"}/admin/mail" target="_blank" style="background: linear-gradient(135deg, #06b6d4, #3b82f6); color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 30px; font-weight: bold; font-size: 13px; display: inline-block;">
                      Open Admin Mail & Reply
                    </a>
                  </div>
                </div>
              </div>
            </div>
          `,
        });
      } catch (mailErr) {
        console.warn("External email dispatch failed:", mailErr);
      }
    }

    await logServerEvent("admin_mail_sent", {
      sender: cleanSender,
      recipient: cleanRecipient,
      subject: cleanSubject,
    });

    return NextResponse.json({
      success: true,
      message: "Internal mail sent successfully.",
      mail: {
        ...mailDoc,
        createdAt: mailDoc.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Send admin mail error:", error);
    return NextResponse.json({ error: error.message || "Failed to send mail" }, { status: 500 });
  }
}

/* ── PATCH: Mark mail as read / unread or delete ── */
export async function PATCH(req) {
  try {
    const token = req.cookies.get("admin-session")?.value || "";
    const callerEmail = verifyAdminSession(token);

    if (!callerEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cleanCaller = callerEmail.trim().toLowerCase();
    const { mailId, action } = await req.json();

    if (!mailId) {
      return NextResponse.json({ error: "Mail ID required." }, { status: 400 });
    }

    const mailRef = adminDb.collection("adminMails").doc(mailId);
    const mailDoc = await mailRef.get();

    if (!mailDoc.exists) {
      return NextResponse.json({ error: "Mail not found." }, { status: 404 });
    }

    if (action === "mark_read") {
      const currentReadBy = mailDoc.data().readBy || [];
      if (!currentReadBy.includes(cleanCaller)) {
        await mailRef.update({
          read: true,
          readBy: [...currentReadBy, cleanCaller],
        });
      }
    } else if (action === "delete") {
      await mailRef.delete();
    }

    return NextResponse.json({ success: true, message: `Mail updated (${action}).` });
  } catch (error) {
    console.error("Update admin mail error:", error);
    return NextResponse.json({ error: error.message || "Failed to update mail" }, { status: 500 });
  }
}
