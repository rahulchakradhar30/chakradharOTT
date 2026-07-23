import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAdminSession, isSuperAdminEmail } from "@/lib/adminAuth";
import { sendMail } from "@/lib/mail";
import { notifyAdmins } from "@/lib/notifications";
import { logServerEvent } from "@/lib/auditLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ── GET: Fetch regularization requests ── */
export async function GET(req) {
  try {
    const token = req.cookies.get("admin-session")?.value || "";
    const callerEmail = verifyAdminSession(token);

    if (!callerEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cleanCaller = callerEmail.toLowerCase().trim();
    const isSuper = isSuperAdminEmail(cleanCaller);

    const regRef = adminDb.collection("attendanceRegularizations");
    let snap;

    if (isSuper) {
      snap = await regRef.get();
    } else {
      snap = await regRef.where("applicantEmail", "==", cleanCaller).get();
    }

    const requests = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      requests.push({
        id: docSnap.id,
        ...d,
        createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : d.createdAt,
      });
    });

    return NextResponse.json({
      success: true,
      requests: requests.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    });
  } catch (error) {
    console.error("Fetch regularizations error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch regularizations" }, { status: 500 });
  }
}

/* ── POST: Sub-Admin submit attendance regularization request ── */
export async function POST(req) {
  try {
    const token = req.cookies.get("admin-session")?.value || "";
    const callerEmail = verifyAdminSession(token);

    if (!callerEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cleanCaller = callerEmail.toLowerCase().trim();
    const { startDate, endDate, reason, proofImage } = await req.json();

    const cleanReason = (reason || "").trim();
    const cleanProof = (proofImage || "").trim();

    if (!startDate || !endDate || !cleanReason) {
      return NextResponse.json({ error: "Start Date, End Date, and Reason are required." }, { status: 400 });
    }

    // ── 15-DAY PAST WINDOW VALIDATION ──
    const now = new Date();
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(now.getDate() - 15);
    fifteenDaysAgo.setHours(0, 0, 0, 0);

    const reqStart = new Date(startDate);
    const reqEnd = new Date(endDate);

    if (reqStart < fifteenDaysAgo) {
      return NextResponse.json(
        { error: `Regularization requests are strictly limited to the past 15 days (Earliest allowed date: ${fifteenDaysAgo.toISOString().split("T")[0]}).` },
        { status: 400 }
      );
    }

    if (reqEnd < reqStart) {
      return NextResponse.json({ error: "End date cannot be earlier than start date." }, { status: 400 });
    }

    const newRegRef = adminDb.collection("attendanceRegularizations").doc();
    const regId = newRegRef.id;

    const regDoc = {
      id: regId,
      applicantEmail: cleanCaller,
      startDate,
      endDate,
      reason: cleanReason,
      proofImage: cleanProof || null,
      status: "pending",
      createdAt: new Date(),
      approvedBy: null,
      rejectionReason: null,
    };

    await newRegRef.set(regDoc);

    // Notify Super Admin
    await notifyAdmins({
      title: `📝 Attendance Regularization Request from ${cleanCaller}`,
      message: `Sub-Admin ${cleanCaller} requested attendance regularization for ${startDate} to ${endDate}. Reason: "${cleanReason}".`,
      type: "regularization_request",
      link: "/admin/attendance",
      sendEmail: true,
    });

    await logServerEvent("regularization_requested", {
      applicant: cleanCaller,
      startDate,
      endDate,
    });

    return NextResponse.json({
      success: true,
      message: "Attendance regularization request submitted successfully. Awaiting Super Admin review.",
      request: regDoc,
    });
  } catch (error) {
    console.error("Submit regularization error:", error);
    return NextResponse.json({ error: error.message || "Failed to submit regularization" }, { status: 500 });
  }
}

/* ── PATCH: Super Admin Approve or Reject Regularization ── */
export async function PATCH(req) {
  try {
    const token = req.cookies.get("admin-session")?.value || "";
    const callerEmail = verifyAdminSession(token);

    if (!callerEmail || !isSuperAdminEmail(callerEmail)) {
      return NextResponse.json({ error: "Unauthorized — Super Admin access required." }, { status: 403 });
    }

    const { regId, action, rejectionReason } = await req.json();

    if (!regId || !action) {
      return NextResponse.json({ error: "Request ID and Action required." }, { status: 400 });
    }

    const regRef = adminDb.collection("attendanceRegularizations").doc(regId);
    const regSnap = await regRef.get();

    if (!regSnap.exists) {
      return NextResponse.json({ error: "Regularization request not found." }, { status: 404 });
    }

    const regData = regSnap.data();
    const newStatus = action === "approve" ? "approved" : "rejected";

    await regRef.update({
      status: newStatus,
      approvedBy: callerEmail,
      approvedAt: new Date(),
      rejectionReason: action === "reject" ? (rejectionReason || "Declined by Super Admin") : null,
    });

    // If approved, mark all dates in date range as PRESENT 🟢
    if (action === "approve") {
      const start = new Date(regData.startDate);
      const end = new Date(regData.endDate);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split("T")[0];
        const attId = `${regData.applicantEmail}_${dateStr}`;
        await adminDb.collection("attendance").doc(attId).set(
          {
            email: regData.applicantEmail,
            date: dateStr,
            status: "present",
            regularizationId: regId,
            notes: `Regularized by Super Admin (${callerEmail})`,
            loginTime: new Date(),
          },
          { merge: true }
        );
      }
    }

    // Targeted in-app notification doc ONLY to applicant
    try {
      await adminDb.collection("notifications").add({
        title: `Regularization Request ${newStatus.toUpperCase()}`,
        message: `Your attendance regularization request for ${regData.startDate} to ${regData.endDate} was ${newStatus} by Super Admin.`,
        targetEmail: regData.applicantEmail.toLowerCase(),
        type: "regularization_decision",
        link: "/sub-admin/attendance",
        createdAt: new Date(),
        read: false,
      });

      await sendMail({
        to: regData.applicantEmail,
        subject: `Attendance Regularization Request ${newStatus.toUpperCase()} — Chakradhar Stream`,
        text: `Hello,\n\nYour attendance regularization request for ${regData.startDate} to ${regData.endDate} has been ${newStatus.toUpperCase()} by Super Admin (${callerEmail}).\n\n${action === "reject" ? `Reason: ${rejectionReason || "N/A"}\n\n` : ""}View attendance calendar at: ${process.env.NEXT_PUBLIC_APP_URL || "https://chakradharstream.vercel.app"}/sub-admin/attendance`,
      });
    } catch (mErr) {
      console.warn("Regularization email failed:", mErr);
    }

    await logServerEvent("regularization_decided", {
      regId,
      status: newStatus,
      approvedBy: callerEmail,
    });

    return NextResponse.json({
      success: true,
      message: `Regularization request ${newStatus}.`,
    });
  } catch (error) {
    console.error("Decide regularization error:", error);
    return NextResponse.json({ error: error.message || "Failed to process regularization decision" }, { status: 500 });
  }
}

/* ── DELETE: Sub-Admin Modify or Cancel Regularization ── */
export async function DELETE(req) {
  try {
    const token = req.cookies.get("admin-session")?.value || "";
    const callerEmail = verifyAdminSession(token);

    if (!callerEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cleanCaller = callerEmail.toLowerCase().trim();
    const isSuper = isSuperAdminEmail(cleanCaller);
    const { regId } = await req.json();

    if (!regId) {
      return NextResponse.json({ error: "Regularization Request ID required." }, { status: 400 });
    }

    const regRef = adminDb.collection("attendanceRegularizations").doc(regId);
    const regSnap = await regRef.get();

    if (!regSnap.exists) {
      return NextResponse.json({ error: "Request not found." }, { status: 404 });
    }

    const regData = regSnap.data();

    if (regData.applicantEmail.toLowerCase() !== cleanCaller && !isSuper) {
      return NextResponse.json({ error: "Unauthorized to cancel this request." }, { status: 403 });
    }

    await regRef.delete();

    return NextResponse.json({
      success: true,
      message: "Regularization request cancelled successfully.",
    });
  } catch (error) {
    console.error("Delete regularization error:", error);
    return NextResponse.json({ error: error.message || "Failed to cancel regularization" }, { status: 500 });
  }
}

