import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

function getAllowedAdminEmails() {
  const fromEnv = String(process.env.ADMIN_ALLOWED_EMAILS || "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);

  if (fromEnv.length > 0) return fromEnv;

  return [
    "thefifthagefilms@gmail.com",
    "rahulchakradharperepogu@gmail.com",
  ];
}

export async function POST(req) {
  try {
    const { email } = await req.json();
    const normalizedEmail = (email || "").trim().toLowerCase();

    if (!normalizedEmail) {
      return NextResponse.json({ allowed: false, error: "Email is required" }, { status: 400 });
    }

    const allowedEmails = getAllowedAdminEmails();

    // Check if super-admin
    if (allowedEmails.includes(normalizedEmail)) {
      return NextResponse.json({ allowed: true, role: "super_admin" });
    }

    // Check admins collection
    const adminDoc = await adminDb.collection("admins").doc(normalizedEmail).get();

    if (!adminDoc.exists) {
      return NextResponse.json({
        allowed: false,
        error: "Unauthorized: Only approved administrators can access this portal.",
      });
    }

    const adminData = adminDoc.data();

    if (adminData.status === "disabled" || adminData.status === "removed") {
      return NextResponse.json({
        allowed: false,
        error: "Your admin account has been disabled. Contact the super administrator.",
      });
    }

    return NextResponse.json({
      allowed: true,
      role: adminData.role || "sub_admin",
    });
  } catch (error) {
    console.error("Validate email error:", error);
    return NextResponse.json({ allowed: false, error: "Validation failed" }, { status: 500 });
  }
}
