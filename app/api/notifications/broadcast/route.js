import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/adminAuth";
import { notifyAllUsers } from "@/lib/notifications";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const token = req.cookies.get("admin-session")?.value || "";
    const adminEmail = verifyAdminSession(token);

    if (!adminEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, message, type, link } = await req.json();

    if (!title || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Trigger notification broadcast in background/concurrently
    notifyAllUsers({ title, message, type, link });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to trigger broadcast via API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
