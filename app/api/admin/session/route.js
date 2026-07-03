import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    return NextResponse.json(
      { authenticated: true, email },
      {
        headers,
      }
    );
  } catch {
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
