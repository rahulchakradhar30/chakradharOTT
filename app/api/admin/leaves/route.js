import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAdminSession, isSuperAdminEmail } from "@/lib/adminAuth";
import { sendMail } from "@/lib/mail";
import { notifyAdmins } from "@/lib/notifications";
import { logServerEvent } from "@/lib/auditLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ── GET: List leave requests ── */
export async function GET(req) {
  try {
    const token = req.cookies.get("admin-session")?.value || "";
    const callerEmail = verifyAdminSession(token);

    if (!callerEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cleanCaller = callerEmail.toLowerCase().trim();
    const isSuper = isSuperAdminEmail(cleanCaller);

    const leavesRef = adminDb.collection("leaveRequests");
    let snap;

    if (isSuper) {
      snap = await leavesRef.get();
    } else {
      // Sub-admin: fetch leaves where caller is applicant OR acting delegate
      const [applicantSnap, actingSnap] = await Promise.all([
        leavesRef.where("applicantEmail", "==", cleanCaller).get(),
        leavesRef.where("actingSubAdminEmail", "==", cleanCaller).get(),
      ]);

      const map = new Map();
      applicantSnap.forEach((d) => map.set(d.id, { id: d.id, ...d.data() }));
      actingSnap.forEach((d) => map.set(d.id, { id: d.id, ...d.data() }));
      const list = Array.from(map.values());

      return NextResponse.json({
        success: true,
        leaves: list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
      });
    }

    const leaves = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      leaves.push({
        id: docSnap.id,
        ...d,
        createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : d.createdAt,
      });
    });

    return NextResponse.json({
      success: true,
      leaves: leaves.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    });
  } catch (error) {
    console.error("Fetch leaves error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch leave requests" }, { status: 500 });
  }
}

/* ── POST: Submit new leave request with acting delegate ── */
export async function POST(req) {
  try {
    const token = req.cookies.get("admin-session")?.value || "";
    const callerEmail = verifyAdminSession(token);

    if (!callerEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cleanCaller = callerEmail.toLowerCase().trim();
    const { leaveType, reason, startDate, endDate, actingSubAdminEmail } = await req.json();

    const cleanReason = (reason || "").trim();
    const cleanActing = (actingSubAdminEmail || "").toLowerCase().trim();

    if (!leaveType || !cleanReason || !startDate || !endDate) {
      return NextResponse.json({ error: "Leave type, reason, start date, and end date are required." }, { status: 400 });
    }

    const newLeaveRef = adminDb.collection("leaveRequests").doc();
    const leaveId = newLeaveRef.id;

    const leaveDoc = {
      id: leaveId,
      applicantEmail: cleanCaller,
      leaveType,
      reason: cleanReason,
      startDate,
      endDate,
      actingSubAdminEmail: cleanActing || null,
      status: "pending",
      createdAt: new Date(),
      approvedBy: null,
      rejectionReason: null,
    };

    await newLeaveRef.set(leaveDoc);

    // Notify Super Admin of pending leave request
    await notifyAdmins({
      title: `🌴 New Leave Request from ${cleanCaller}`,
      message: `Sub-Admin ${cleanCaller} applied for ${leaveType} (${startDate.split("T")[0]} to ${endDate.split("T")[0]}). Acting Delegate: ${cleanActing || "None"}.`,
      type: "leave_request",
      link: "/admin/attendance",
      sendEmail: true,
    });

    await logServerEvent("leave_requested", {
      applicant: cleanCaller,
      leaveType,
      actingDelegate: cleanActing,
    });

    return NextResponse.json({
      success: true,
      message: "Leave application submitted successfully. Pending Super Admin approval.",
      leave: leaveDoc,
    });
  } catch (error) {
    console.error("Submit leave error:", error);
    return NextResponse.json({ error: error.message || "Failed to submit leave request" }, { status: 500 });
  }
}

/* ── PATCH: Super Admin Approve/Reject OR Sub-Admin Cancel & Resume Duty ── */
export async function PATCH(req) {
  try {
    const token = req.cookies.get("admin-session")?.value || "";
    const callerEmail = verifyAdminSession(token);

    if (!callerEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cleanCaller = callerEmail.toLowerCase().trim();
    const isSuper = isSuperAdminEmail(cleanCaller);
    const { leaveId, action, rejectionReason } = await req.json();

    if (!leaveId || !action) {
      return NextResponse.json({ error: "Leave ID and action required." }, { status: 400 });
    }

    const leaveRef = adminDb.collection("leaveRequests").doc(leaveId);
    const leaveSnap = await leaveRef.get();

    if (!leaveSnap.exists) {
      return NextResponse.json({ error: "Leave request not found." }, { status: 404 });
    }

    const leaveData = leaveSnap.data();

    /* ── Case 1: Super Admin Approve or Reject ── */
    if (action === "approve" || action === "reject") {
      if (!isSuper) {
        return NextResponse.json({ error: "Unauthorized — only Super Admin can approve/reject leaves." }, { status: 403 });
      }

      const newStatus = action === "approve" ? "approved" : "rejected";

      await leaveRef.update({
        status: newStatus,
        approvedBy: cleanCaller,
        approvedAt: new Date(),
        rejectionReason: action === "reject" ? (rejectionReason || "Declined by Super Admin") : null,
      });

      // If approved, mark attendance records as leave (Red) and set active delegate
      if (action === "approve") {
        const start = new Date(leaveData.startDate);
        const end = new Date(leaveData.endDate);

        // Mark attendance dates
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split("T")[0];
          const attId = `${leaveData.applicantEmail}_${dateStr}`;
          await adminDb.collection("attendance").doc(attId).set(
            {
              email: leaveData.applicantEmail,
              date: dateStr,
              status: "leave",
              leaveId,
              notes: `Approved ${leaveData.leaveType}`,
            },
            { merge: true }
          );
        }

        // Set acting delegate in sub-admin doc
        if (leaveData.actingSubAdminEmail) {
          await adminDb.collection("admins").doc(leaveData.applicantEmail).set(
            {
              activeDelegate: leaveData.actingSubAdminEmail,
              onLeave: true,
              leaveId,
            },
            { merge: true }
          );
        }
      }

      // Send email alert to Applicant
      try {
        await sendMail({
          to: leaveData.applicantEmail,
          subject: `Leave Request ${newStatus.toUpperCase()} — Chakradhar Stream`,
          text: `Hello,\n\nYour leave request (${leaveData.leaveType}: ${leaveData.startDate.split("T")[0]} to ${leaveData.endDate.split("T")[0]}) has been ${newStatus.toUpperCase()} by Super Admin (${cleanCaller}).\n\n${action === "reject" ? `Reason: ${rejectionReason || "N/A"}\n\n` : ""}Check status at: ${process.env.NEXT_PUBLIC_APP_URL || "https://chakradharstream.vercel.app"}/sub-admin/attendance`,
        });
      } catch (mailErr) {
        console.warn("Leave decision email failed:", mailErr);
      }

      return NextResponse.json({
        success: true,
        message: `Leave request ${newStatus}.`,
      });
    }

    /* ── Case 2: Sub-Admin Cancel Leave & Resume Duty mid-way ── */
    if (action === "cancel_resume") {
      if (leaveData.applicantEmail.toLowerCase() !== cleanCaller && !isSuper) {
        return NextResponse.json({ error: "Unauthorized to cancel this leave." }, { status: 403 });
      }

      await leaveRef.update({
        status: "cancelled_resumed",
        cancelledAt: new Date(),
      });

      // Mark today's attendance as present (Green)
      const todayStr = new Date().toISOString().split("T")[0];
      const attId = `${leaveData.applicantEmail}_${todayStr}`;
      await adminDb.collection("attendance").doc(attId).set(
        {
          email: leaveData.applicantEmail,
          date: todayStr,
          status: "present",
          notes: "Resumed duty from leave",
          loginTime: new Date(),
        },
        { merge: true }
      );

      // Clear acting delegate
      await adminDb.collection("admins").doc(leaveData.applicantEmail).set(
        {
          activeDelegate: null,
          onLeave: false,
          leaveId: null,
        },
        { merge: true }
      );

      // Notify Super Admin
      await notifyAdmins({
        title: `🟢 Leave Cancelled & Duty Resumed by ${leaveData.applicantEmail}`,
        message: `Sub-Admin ${leaveData.applicantEmail} has cancelled their leave and resumed active duty.`,
        type: "leave_cancelled",
        link: "/admin/attendance",
        sendEmail: true,
      });

      return NextResponse.json({
        success: true,
        message: "Leave cancelled. Active duty resumed successfully!",
      });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error) {
    console.error("Update leave error:", error);
    return NextResponse.json({ error: error.message || "Failed to update leave request" }, { status: 500 });
  }
}
