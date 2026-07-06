import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function GET(req, { params }) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams?.id;

    if (!id) {
      return NextResponse.json({ error: "Missing poster id" }, { status: 400 });
    }

    const docSnap = await adminDb.collection("posters").doc(id).get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: "Poster not found" }, { status: 404 });
    }

    const poster = {
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: docSnap.data().createdAt?.toDate?.() || null,
    };

    return NextResponse.json({ success: true, poster });
  } catch (error) {
    console.error("Failed to fetch poster by ID via API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams?.id;

    if (!id) {
      return NextResponse.json({ error: "Missing poster id" }, { status: 400 });
    }

    const { caption, imageUrl, tags, movieId } = await req.json();

    const updateData = {};
    if (caption !== undefined) updateData.caption = caption || "";
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl || "";
    if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags : [];
    if (movieId !== undefined) updateData.movieId = movieId || null;

    updateData.updatedAt = new Date();

    await adminDb.collection("posters").doc(id).update(updateData);

    return NextResponse.json({ success: true, message: "Poster updated successfully" });
  } catch (error) {
    console.error("Failed to update poster via API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
