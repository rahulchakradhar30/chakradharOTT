import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";

// Check if user liked
export async function GET(req, { params }) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams?.id;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!id || !userId) {
      return NextResponse.json({ error: "Missing poster id or user id" }, { status: 400 });
    }

    const snap = await adminDb
      .collection("poster_likes")
      .where("posterId", "==", id)
      .where("userId", "==", userId)
      .get();

    return NextResponse.json({ liked: !snap.empty });
  } catch (error) {
    console.error("Failed to check like status:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Toggle like
export async function POST(req, { params }) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams?.id;
    const body = await req.json();
    const { userId } = body;

    if (!id || !userId) {
      return NextResponse.json({ error: "Missing poster id or user id" }, { status: 400 });
    }

    const snap = await adminDb
      .collection("poster_likes")
      .where("posterId", "==", id)
      .where("userId", "==", userId)
      .get();

    const liked = !snap.empty;

    if (liked) {
      // Unlike: Delete all documents matching this query
      const batch = adminDb.batch();
      snap.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();

      // Decrement like count
      await adminDb.collection("posters").doc(id).update({
        likesCount: FieldValue.increment(-1),
      });

      return NextResponse.json({ liked: false });
    } else {
      // Like: Create new like document
      await adminDb.collection("poster_likes").add({
        posterId: id,
        userId: userId,
        createdAt: FieldValue.serverTimestamp(),
      });

      // Increment like count
      await adminDb.collection("posters").doc(id).update({
        likesCount: FieldValue.increment(1),
      });

      return NextResponse.json({ liked: true });
    }
  } catch (error) {
    console.error("Failed to toggle like:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
