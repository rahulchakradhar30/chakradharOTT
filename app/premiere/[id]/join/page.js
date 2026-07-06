import { adminDb } from "@/lib/firebaseAdmin";
import { buildBaseMetadata } from "@/lib/seo";
import PremiereJoinClient from "./PremiereJoinClient";
import { Suspense } from "react";

export async function generateMetadata({ params }) {
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  let title = "Join Live Premiere – Chakradhar Stream";
  let description = "Get your ticket and join the exclusive live interactive premiere screening room on Chakradhar Stream.";

  try {
    if (
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
    ) {
      const premiereSnap = await adminDb.collection("premieres").doc(id).get();
      if (premiereSnap.exists) {
        const data = premiereSnap.data();
        if (data.title) {
          title = `Join Live Premiere: ${data.title} – Chakradhar Stream`;
          description = `Purchase tickets and join the exclusive live broadcast premiere of "${data.title}" on Chakradhar Stream.`;
        }
      }
    }
  } catch (error) {
    console.error("Error generating premiere join metadata:", error);
  }

  return buildBaseMetadata({
    title,
    description,
    path: `/premiere/${id}/join`,
  });
}

export default function PremiereJoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen text-white flex items-center justify-center flex-col bg-[#04070f]">
        <div className="w-12 h-12 rounded-full border-4 border-cyan-400/30 border-t-cyan-400 animate-spin mb-4" />
        <p className="text-sm text-gray-400 font-bold">Loading premiere details...</p>
      </div>
    }>
      <PremiereJoinClient />
    </Suspense>
  );
}
