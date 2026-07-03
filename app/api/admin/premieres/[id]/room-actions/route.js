import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { verifyAdminSession } from "@/lib/adminAuth";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function badRequest(message) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(req, { params }) {
  try {
    const token = req.cookies.get("admin-session")?.value || "";
    const adminEmail = verifyAdminSession(token);

    if (!adminEmail) {
      return unauthorized();
    }

    const resolvedParams = await params;
    const id = resolvedParams?.id;

    if (!id) {
      return badRequest("Invalid premiere id");
    }

    const premiereRef = adminDb.collection("premieres").doc(id);
    const [premiereSnap, messagesSnap, viewersSnap] = await Promise.all([
      premiereRef.get(),
      premiereRef.collection("messages").orderBy("createdAt", "asc").limit(300).get(),
      premiereRef.collection("viewers").limit(300).get(),
    ]);

    if (!premiereSnap.exists) {
      return NextResponse.json({ error: "Premiere not found" }, { status: 404 });
    }

    const premiere = { id: premiereSnap.id, ...premiereSnap.data() };
    const messages = messagesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const viewers = viewersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    return NextResponse.json({
      success: true,
      premiere,
      messages,
      viewers,
    });
  } catch (error) {
    console.error("Admin room state fetch error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch admin room state" },
      { status: 500 }
    );
  }
}

export async function POST(req, { params }) {
  try {
    const token = req.cookies.get("admin-session")?.value || "";
    const adminEmail = verifyAdminSession(token);

    if (!adminEmail) {
      return unauthorized();
    }

    const resolvedParams = await params;
    const id = resolvedParams?.id;

    if (!id) {
      return badRequest("Invalid premiere id");
    }

    const body = await req.json();
    const action = String(body?.action || "").trim();

    if (!action) {
      return badRequest("Missing action");
    }

    if (action === "status") {
      const nextStatus = String(body?.status || "").trim();
      if (!["scheduled", "live", "ended"].includes(nextStatus)) {
        return badRequest("Invalid status value");
      }

      const update = {
        status: nextStatus,
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (nextStatus === "live") {
        update.startedAt = FieldValue.serverTimestamp();
      }

      if (nextStatus === "ended") {
        update.endTime = FieldValue.serverTimestamp();
      }

      await adminDb.collection("premieres").doc(id).update(update);
      return NextResponse.json({ success: true });
    }

    if (action === "message") {
      const text = String(body?.text || "").trim();
      if (!text) {
        return badRequest("Message text is required");
      }

      await adminDb.collection("premieres").doc(id).collection("messages").add({
        text: text.slice(0, 2000),
        name: "Official Admin",
        userId: `admin:${adminEmail}`,
        isOfficial: true,
        createdAt: FieldValue.serverTimestamp(),
        pinned: false,
      });

      return NextResponse.json({ success: true });
    }

    if (action === "pin") {
      const messageId = String(body?.messageId || "").trim();
      if (!messageId) {
        return badRequest("Message id is required");
      }

      const messagesRef = adminDb.collection("premieres").doc(id).collection("messages");
      const pinnedSnap = await messagesRef.where("pinned", "==", true).get();
      const batch = adminDb.batch();

      pinnedSnap.docs.forEach((docSnap) => {
        batch.update(docSnap.ref, { pinned: false });
      });

      batch.update(messagesRef.doc(messageId), { pinned: true });
      await batch.commit();

      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      const messageId = String(body?.messageId || "").trim();
      if (!messageId) {
        return badRequest("Message id is required");
      }

      await adminDb
        .collection("premieres")
        .doc(id)
        .collection("messages")
        .doc(messageId)
        .delete();

      return NextResponse.json({ success: true });
    }

    return badRequest("Unsupported action");
  } catch (error) {
    console.error("Admin room action error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process admin room action" },
      { status: 500 }
    );
  }
}
