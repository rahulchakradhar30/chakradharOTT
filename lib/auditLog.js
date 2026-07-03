import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function logServerEvent(event, payload = {}) {
  try {
    await adminDb.collection("activity_logs").add({
      event,
      payload,
      source: "api",
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error("Audit log failed:", error);
  }
}
