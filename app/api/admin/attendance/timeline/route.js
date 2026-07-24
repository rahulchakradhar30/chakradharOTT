import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAdminSession, isSuperAdminEmail } from "@/lib/adminAuth";
import { logServerEvent } from "@/lib/auditLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_TIMELINE = {
  punchInStart: "08:00",
  punchInEnd: "11:00",
  punchOutStart: "17:00",
  punchOutEnd: "22:00",
  gracePeriodMins: 15,
};

/* ── GET: Fetch Attendance Shift Timeline Settings ── */
export async function GET(req) {
  try {
    const token = req.cookies.get("admin-session")?.value || "";
    const callerEmail = verifyAdminSession(token);

    if (!callerEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const docRef = adminDb.collection("settings").doc("attendance_timeline");
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({
        success: true,
        timeline: DEFAULT_TIMELINE,
      });
    }

    return NextResponse.json({
      success: true,
      timeline: {
        ...DEFAULT_TIMELINE,
        ...docSnap.data(),
      },
    });
  } catch (error) {
    console.error("Fetch attendance timeline error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch timeline" }, { status: 500 });
  }
}

/* ── POST: Super Admin Update Shift Timeline Settings ── */
export async function POST(req) {
  try {
    const token = req.cookies.get("admin-session")?.value || "";
    const callerEmail = verifyAdminSession(token);

    if (!callerEmail || !isSuperAdminEmail(callerEmail)) {
      return NextResponse.json({ error: "Unauthorized — Super Admin access required." }, { status: 403 });
    }

    const { punchInStart, punchInEnd, punchOutStart, punchOutEnd, gracePeriodMins } = await req.json();

    const timelinePayload = {
      punchInStart: punchInStart || DEFAULT_TIMELINE.punchInStart,
      punchInEnd: punchInEnd || DEFAULT_TIMELINE.punchInEnd,
      punchOutStart: punchOutStart || DEFAULT_TIMELINE.punchOutStart,
      punchOutEnd: punchOutEnd || DEFAULT_TIMELINE.punchOutEnd,
      gracePeriodMins: Number(gracePeriodMins) || DEFAULT_TIMELINE.gracePeriodMins,
      updatedBy: callerEmail,
      updatedAt: new Date(),
    };

    await adminDb.collection("settings").doc("attendance_timeline").set(timelinePayload, { merge: true });

    await logServerEvent("attendance_timeline_updated", {
      updatedBy: callerEmail,
      timeline: timelinePayload,
    });

    return NextResponse.json({
      success: true,
      message: "Attendance shift timeline settings updated successfully!",
      timeline: timelinePayload,
    });
  } catch (error) {
    console.error("Update attendance timeline error:", error);
    return NextResponse.json({ error: error.message || "Failed to update timeline" }, { status: 500 });
  }
}
