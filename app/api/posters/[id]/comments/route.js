import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";

// Fetch comments
export async function GET(req, { params }) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams?.id;

    if (!id) {
      return NextResponse.json({ error: "Missing poster id" }, { status: 400 });
    }

    const snap = await adminDb
      .collection("poster_comments")
      .where("posterId", "==", id)
      .get();

    const comments = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || null,
    }));

    // Sort by date desc
    comments.sort((a, b) => {
      const ta = a.createdAt?.getTime?.() || 0;
      const tb = b.createdAt?.getTime?.() || 0;
      return tb - ta;
    });

    return NextResponse.json({ success: true, comments });
  } catch (error) {
    console.error("Failed to fetch comments via API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Add comment
export async function POST(req, { params }) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams?.id;
    const body = await req.json();
    const { userId, name, photoURL, comment } = body;

    if (!id || !userId || !comment) {
      return NextResponse.json({ error: "Missing required comment parameters" }, { status: 400 });
    }

    const docRef = await adminDb.collection("poster_comments").add({
      posterId: id,
      userId,
      name: name || "User",
      photoURL: photoURL || "",
      comment: comment.trim(),
      createdAt: FieldValue.serverTimestamp(),
    });

    // Increment commentsCount on the poster
    await adminDb.collection("posters").doc(id).update({
      commentsCount: FieldValue.increment(1),
    });

    return NextResponse.json({
      success: true,
      comment: {
        id: docRef.id,
        posterId: id,
        userId,
        name: name || "User",
        photoURL: photoURL || "",
        comment: comment.trim(),
        createdAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Failed to add comment:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
