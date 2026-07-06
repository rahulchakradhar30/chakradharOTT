import { adminDb } from "@/lib/firebaseAdmin";
import { buildBaseMetadata } from "@/lib/seo";
import PosterDetailClient from "./PosterDetailClient";
import { Suspense } from "react";

export async function generateMetadata({ params }) {
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  let title = "Movie Poster – Chakradhar Stream";
  let description = "View this stunning community-submitted movie poster on Chakradhar Stream.";
  
  try {
    if (
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
    ) {
      const posterSnap = await adminDb.collection("posters").doc(id).get();
      if (posterSnap.exists) {
        const data = posterSnap.data();
        if (data.caption) {
          title = `${data.caption} – Movie Poster`;
          description = `Check out this poster: "${data.caption}". Join the discussion, like, and share comments.`;
        }
      }
    }
  } catch (error) {
    console.error("Error generating poster metadata:", error);
  }

  return buildBaseMetadata({
    title,
    description,
    path: `/posters/${id}`,
  });
}

export default function PosterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen text-center py-20 bg-[#04070f]">
        <div className="mx-auto h-12 w-12 rounded-full border-4 border-cyan-400/30 border-t-cyan-400 animate-spin" />
        <p className="mt-4 text-gray-400">Loading poster details...</p>
      </div>
    }>
      <PosterDetailClient />
    </Suspense>
  );
}
