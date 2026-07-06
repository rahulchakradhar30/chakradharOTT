import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/adminAuth";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export async function GET(req) {
  try {
    const token = req.cookies.get("admin-session")?.value || "";
    const email = verifyAdminSession(token);
    const headers = {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Vary: "Cookie",
    };

    if (!email) {
      return NextResponse.json(
        { authenticated: false },
        {
          status: 401,
          headers,
        }
      );
    }

    // Determine the role
    const normalizedEmail = email.toLowerCase();
    const allowedEmails = getAllowedAdminEmails();
    
    let role = "sub_admin";
    if (allowedEmails.includes(normalizedEmail)) {
      role = "super_admin";
    } else {
      const adminDoc = await adminDb.collection("admins").doc(normalizedEmail).get();
      if (adminDoc.exists) {
        role = adminDoc.data().role || "sub_admin";
      }
    }

    return NextResponse.json(
      { authenticated: true, email, role },
      {
        headers,
      }
    );
  } catch (error) {
    console.error("Session verification error:", error);
    const headers = {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Vary: "Cookie",
    };

    return NextResponse.json(
      { authenticated: false },
      {
        status: 401,
        headers,
      }
    );
  }
}
