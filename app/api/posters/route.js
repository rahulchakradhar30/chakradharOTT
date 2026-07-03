import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/adminAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";

// Fetch all posters
export async function GET(req) {
  try {
    const snap = await adminDb.collection("posters").orderBy("createdAt", "desc").get();
    const posters = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || null,
    }));
    return NextResponse.json({ success: true, posters });
  } catch (error) {
    console.error("Failed to fetch posters via API:", error);
    // Fallback: fetch without order if index is not initialized yet
    try {
      const snap = await adminDb.collection("posters").get();
      const posters = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || null,
      }));
      posters.sort((a, b) => {
        const ta = a.createdAt?.getTime?.() || 0;
        const tb = b.createdAt?.getTime?.() || 0;
        return tb - ta;
      });
      return NextResponse.json({ success: true, posters });
    } catch (fallbackError) {
      return NextResponse.json({ error: fallbackError.message }, { status: 500 });
    }
  }
}

// Create a new poster (Admin only)
export async function POST(req) {
  try {
    const token = req.cookies.get("admin-session")?.value || "";
    const adminEmail = verifyAdminSession(token);

    if (!adminEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { imageUrl, caption, movieId, tags } = body;

    if (!imageUrl || !caption) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const docRef = await adminDb.collection("posters").add({
      imageUrl,
      caption: caption.trim(),
      movieId: movieId ? String(movieId).trim() : null,
      tags: Array.isArray(tags) ? tags : [],
      likesCount: 0,
      commentsCount: 0,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, id: docRef.id });
  } catch (error) {
    console.error("Failed to create poster via API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Delete a poster (Admin only)
export async function DELETE(req) {
  try {
    const token = req.cookies.get("admin-session")?.value || "";
    const adminEmail = verifyAdminSession(token);

    if (!adminEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing poster id" }, { status: 400 });
    }

    // Delete the poster document
    await adminDb.collection("posters").doc(id).delete();

    // Delete associated likes and comments in a batch
    const likesSnap = await adminDb.collection("poster_likes").where("posterId", "==", id).get();
    const commentsSnap = await adminDb.collection("poster_comments").where("posterId", "==", id).get();

    const batch = adminDb.batch();
    likesSnap.docs.forEach((d) => batch.delete(d.ref));
    commentsSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete poster via API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
