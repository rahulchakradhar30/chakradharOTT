import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAdminSession, isSuperAdminEmail } from "@/lib/adminAuth";
import { logServerEvent } from "@/lib/auditLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ── GET: Check face registration status & template ── */
export async function GET(req) {
  try {
    const token = req.cookies.get("admin-session")?.value || "";
    const callerEmail = verifyAdminSession(token);

    if (!callerEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const targetEmail = (searchParams.get("email") || callerEmail).toLowerCase().trim();
    const isSuper = isSuperAdminEmail(callerEmail);

    const cleanEmail = (!isSuper && targetEmail !== callerEmail.toLowerCase())
      ? callerEmail.toLowerCase().trim()
      : targetEmail;

    const faceRef = adminDb.collection("admin_faces").doc(cleanEmail);
    const docSnap = await faceRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({
        registered: false,
        email: cleanEmail,
      });
    }

    const data = docSnap.data();
    return NextResponse.json({
      registered: true,
      email: cleanEmail,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
      sampleImage: data.sampleImage || null,
    });
  } catch (error) {
    console.error("Fetch face profile error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch face profile" }, { status: 500 });
  }
}

/* ── POST: Register / Enroll sub-admin face profile ── */
export async function POST(req) {
  try {
    const token = req.cookies.get("admin-session")?.value || "";
    const callerEmail = verifyAdminSession(token);

    if (!callerEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { faceHash, sampleImage } = await req.json();
    const cleanEmail = callerEmail.toLowerCase().trim();

    if (!faceHash) {
      return NextResponse.json({ error: "Face feature descriptor is required." }, { status: 400 });
    }

    const faceRef = adminDb.collection("admin_faces").doc(cleanEmail);

    await faceRef.set({
      email: cleanEmail,
      faceHash,
      sampleImage: sampleImage || null,
      updatedAt: new Date(),
      enrolledBy: cleanEmail,
    }, { merge: true });

    await logServerEvent("face_profile_enrolled", { email: cleanEmail });

    return NextResponse.json({
      success: true,
      message: `Face biometric profile registered successfully for ${cleanEmail}.`,
    });
  } catch (error) {
    console.error("Enroll face profile error:", error);
    return NextResponse.json({ error: error.message || "Failed to enroll face profile" }, { status: 500 });
  }
}

/* ── DELETE: Reset face profile ── */
export async function DELETE(req) {
  try {
    const token = req.cookies.get("admin-session")?.value || "";
    const callerEmail = verifyAdminSession(token);

    if (!callerEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { targetEmail } = await req.json().catch(() => ({}));
    const isSuper = isSuperAdminEmail(callerEmail);

    const cleanEmail = (isSuper && targetEmail)
      ? targetEmail.toLowerCase().trim()
      : callerEmail.toLowerCase().trim();

    await adminDb.collection("admin_faces").doc(cleanEmail).delete();

    await logServerEvent("face_profile_deleted", { email: cleanEmail, deletedBy: callerEmail });

    return NextResponse.json({
      success: true,
      message: `Face registration reset for ${cleanEmail}.`,
    });
  } catch (error) {
    console.error("Delete face profile error:", error);
    return NextResponse.json({ error: error.message || "Failed to reset face profile" }, { status: 500 });
  }
}
