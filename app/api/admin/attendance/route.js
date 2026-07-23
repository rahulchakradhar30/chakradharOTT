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

/* ── POST: Auto-log daily login presence OR Super Admin post attendance ── */
export async function POST(req) {
  try {
    const token = req.cookies.get("admin-session")?.value || "";
    const callerEmail = verifyAdminSession(token);

    if (!callerEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuper = isSuperAdminEmail(callerEmail);
    const body = await req.json().catch(() => ({}));

    // If Super Admin provides targetEmail & date -> Retroactive post
    if (isSuper && body.targetEmail && body.date) {
      const targetEmail = body.targetEmail.toLowerCase().trim();
      const targetDate = body.date.trim();
      const status = ["present", "absent", "off_day", "leave"].includes(body.status) ? body.status : "present";
      const docId = `${targetEmail}_${targetDate}`;
      const attRef = adminDb.collection("attendance").doc(docId);

      const loginDate = body.loginTime ? new Date(body.loginTime) : new Date();

      await attRef.set({
        email: targetEmail,
        date: targetDate,
        status,
        loginTime: loginDate,
        lastActiveTime: new Date(),
        notes: body.notes || "Posted by Super Admin",
        postedBy: callerEmail,
        createdAt: new Date(),
      }, { merge: true });

      return NextResponse.json({
        success: true,
        message: `Attendance posted for ${targetEmail} on ${targetDate}.`,
      });
    }

    // Default: Self daily login record
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
      // Update last active timestamp if not manually overridden
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

/* ── PATCH: Super Admin manual attendance status override / edit ── */
export async function PATCH(req) {
  try {
    const token = req.cookies.get("admin-session")?.value || "";
    const callerEmail = verifyAdminSession(token);

    if (!callerEmail || !isSuperAdminEmail(callerEmail)) {
      return NextResponse.json({ error: "Unauthorized — Super Admin access required." }, { status: 403 });
    }

    const { email, date, status, notes, loginTime } = await req.json();
    const cleanEmail = (email || "").toLowerCase().trim();
    const cleanDate = (date || "").trim(); // YYYY-MM-DD
    const validStatus = ["present", "absent", "off_day", "leave"].includes(status) ? status : "present";

    if (!cleanEmail || !cleanDate) {
      return NextResponse.json({ error: "Email and Date required." }, { status: 400 });
    }

    const docId = `${cleanEmail}_${cleanDate}`;
    const attRef = adminDb.collection("attendance").doc(docId);

    const updatePayload = {
      email: cleanEmail,
      date: cleanDate,
      status: validStatus,
      notes: notes || "",
      overrideBy: callerEmail,
      overrideAt: new Date(),
    };

    if (loginTime) {
      updatePayload.loginTime = new Date(loginTime);
    }

    await attRef.set(updatePayload, { merge: true });

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

/* ── DELETE: Super Admin Delete Attendance Record (Single Day or Range Purge) ── */
export async function DELETE(req) {
  try {
    const token = req.cookies.get("admin-session")?.value || "";
    const callerEmail = verifyAdminSession(token);

    if (!callerEmail || !isSuperAdminEmail(callerEmail)) {
      return NextResponse.json({ error: "Unauthorized — Super Admin access required." }, { status: 403 });
    }

    const { email, date, startDate, endDate } = await req.json();
    const cleanEmail = (email || "").toLowerCase().trim();

    if (!cleanEmail) {
      return NextResponse.json({ error: "Sub-Admin Email required." }, { status: 400 });
    }

    // Single day deletion
    if (date) {
      const docId = `${cleanEmail}_${date.trim()}`;
      await adminDb.collection("attendance").doc(docId).delete();

      return NextResponse.json({
        success: true,
        message: `Attendance record for ${cleanEmail} on ${date} deleted.`,
        deletedCount: 1,
      });
    }

    // Range deletion
    if (!startDate || !endDate) {
      return NextResponse.json({ error: "Date or Date Range required." }, { status: 400 });
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
    console.error("Delete attendance error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete attendance record" }, { status: 500 });
  }
}


