import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAdminSession, isSuperAdminEmail } from "@/lib/adminAuth";
import { logServerEvent } from "@/lib/auditLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ── GET: Fetch attendance records ── */
export async function GET(req) {
  try {
    const token = req.cookies.get("admin-session")?.value || "";
    const callerEmail = verifyAdminSession(token);

    if (!callerEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const targetEmail = (searchParams.get("email") || callerEmail).toLowerCase().trim();
    const monthStr = searchParams.get("month"); // e.g. "2026-07"

    const isSuper = isSuperAdminEmail(callerEmail);

    // If sub-admin tries to view someone else's attendance, restrict to self
    const finalEmail = (!isSuper && targetEmail !== callerEmail.toLowerCase()) ? callerEmail.toLowerCase() : targetEmail;

    const attendanceRef = adminDb.collection("attendance");
    let query = attendanceRef.where("email", "==", finalEmail);

    const snap = await query.get();
    const records = [];

    snap.forEach((docSnap) => {
      const d = docSnap.data();
      records.push({
        id: docSnap.id,
        ...d,
        loginTime: d.loginTime?.toDate ? d.loginTime.toDate().toISOString() : d.loginTime,
        lastActiveTime: d.lastActiveTime?.toDate ? d.lastActiveTime.toDate().toISOString() : d.lastActiveTime,
      });
    });

    // If monthStr specified, filter
    const filtered = monthStr
      ? records.filter((r) => r.date && r.date.startsWith(monthStr))
      : records;

    // Calculate summary statistics
    const presentCount = filtered.filter((r) => r.status === "present").length;
    const leaveCount = filtered.filter((r) => r.status === "absent" || r.status === "leave").length;
    const offDayCount = filtered.filter((r) => r.status === "off_day").length;

    return NextResponse.json({
      success: true,
      records: filtered,
      stats: {
        totalDays: filtered.length,
        presentCount,
        leaveCount,
        offDayCount,
      },
    });
  } catch (error) {
    console.error("Fetch attendance error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch attendance" }, { status: 500 });
  }
}

/* ── POST: Auto-log daily login presence ── */
export async function POST(req) {
  try {
    const token = req.cookies.get("admin-session")?.value || "";
    const callerEmail = verifyAdminSession(token);

    if (!callerEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cleanEmail = callerEmail.toLowerCase().trim();
    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const docId = `${cleanEmail}_${todayStr}`;

    const attRef = adminDb.collection("attendance").doc(docId);
    const docSnap = await attRef.get();

    const now = new Date();

    if (!docSnap.exists) {
      // First login of the day → mark present
      await attRef.set({
        email: cleanEmail,
        date: todayStr,
        status: "present",
        loginTime: now,
        lastActiveTime: now,
        autoRecorded: true,
        overrideBy: null,
      });

      await logServerEvent("attendance_logged", { email: cleanEmail, date: todayStr });
    } else {
      // Update last active timestamp if not manually overridden to absent/off_day
      const currentData = docSnap.data();
      if (currentData.status === "present") {
        await attRef.update({
          lastActiveTime: now,
        });
      }
    }

    return NextResponse.json({ success: true, date: todayStr, status: "present" });
  } catch (error) {
    console.error("Log attendance error:", error);
    return NextResponse.json({ error: error.message || "Failed to log attendance" }, { status: 500 });
  }
}

/* ── PATCH: Super Admin manual attendance status override ── */
export async function PATCH(req) {
  try {
    const token = req.cookies.get("admin-session")?.value || "";
    const callerEmail = verifyAdminSession(token);

    if (!callerEmail || !isSuperAdminEmail(callerEmail)) {
      return NextResponse.json({ error: "Unauthorized — Super Admin access required." }, { status: 403 });
    }

    const { email, date, status, notes } = await req.json();
    const cleanEmail = (email || "").toLowerCase().trim();
    const cleanDate = (date || "").trim(); // YYYY-MM-DD
    const validStatus = ["present", "absent", "off_day", "leave"].includes(status) ? status : "present";

    if (!cleanEmail || !cleanDate) {
      return NextResponse.json({ error: "Email and Date required." }, { status: 400 });
    }

    const docId = `${cleanEmail}_${cleanDate}`;
    const attRef = adminDb.collection("attendance").doc(docId);

    await attRef.set(
      {
        email: cleanEmail,
        date: cleanDate,
        status: validStatus,
        notes: notes || "",
        overrideBy: callerEmail,
        overrideAt: new Date(),
      },
      { merge: true }
    );

    await logServerEvent("attendance_override", {
      targetEmail: cleanEmail,
      date: cleanDate,
      status: validStatus,
      overrideBy: callerEmail,
    });

    return NextResponse.json({
      success: true,
      message: `Attendance updated to ${validStatus} for ${cleanEmail} on ${cleanDate}.`,
    });
  } catch (error) {
    console.error("Override attendance error:", error);
    return NextResponse.json({ error: error.message || "Failed to override attendance" }, { status: 500 });
  }
}

/* ── DELETE: Super Admin Bulk Past 3 Months Attendance Cleanup ── */
export async function DELETE(req) {
  try {
    const token = req.cookies.get("admin-session")?.value || "";
    const callerEmail = verifyAdminSession(token);

    if (!callerEmail || !isSuperAdminEmail(callerEmail)) {
      return NextResponse.json({ error: "Unauthorized — Super Admin access required." }, { status: 403 });
    }

    const { email, startDate, endDate } = await req.json();
    const cleanEmail = (email || "").toLowerCase().trim();

    if (!cleanEmail || !startDate || !endDate) {
      return NextResponse.json({ error: "Email, Start Date, and End Date are required." }, { status: 400 });
    }

    const attSnap = await adminDb
      .collection("attendance")
      .where("email", "==", cleanEmail)
      .get();

    const batch = adminDb.batch();
    let deletedCount = 0;

    attSnap.forEach((docSnap) => {
      const d = docSnap.data();
      if (d.date && d.date >= startDate && d.date <= endDate) {
        batch.delete(docSnap.ref);
        deletedCount++;
      }
    });

    if (deletedCount > 0) {
      await batch.commit();
    }

    await logServerEvent("attendance_bulk_deleted", {
      targetEmail: cleanEmail,
      startDate,
      endDate,
      deletedCount,
      deletedBy: callerEmail,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully removed ${deletedCount} attendance records for ${cleanEmail} between ${startDate} and ${endDate}.`,
      deletedCount,
    });
  } catch (error) {
    console.error("Bulk delete attendance error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete attendance records" }, { status: 500 });
  }
}

