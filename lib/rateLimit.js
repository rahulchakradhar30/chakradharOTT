import crypto from "crypto";
import { adminDb } from "@/lib/firebaseAdmin";

function hashKey(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function getClientIp(req) {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  const realIp = req.headers.get("x-real-ip") || "";

  const fromForwarded = forwarded.split(",")[0]?.trim();
  return fromForwarded || realIp || "unknown";
}

export async function enforceRateLimit({
  scope,
  subject,
  limit,
  windowMs,
}) {
  const now = Date.now();
  const windowStart = now - windowMs;
  const id = hashKey(`${scope}:${subject}`);

  const ref = adminDb.collection("rate_limits").doc(id);

  const result = await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);

    if (!snap.exists) {
      tx.set(ref, {
        scope,
        subject,
        count: 1,
        windowStartedAt: now,
        updatedAt: now,
      });
      return { allowed: true, retryAfterMs: 0 };
    }

    const data = snap.data();
    const started = Number(data.windowStartedAt || now);
    const elapsed = now - started;

    if (elapsed >= windowMs) {
      tx.update(ref, {
        count: 1,
        windowStartedAt: now,
        updatedAt: now,
      });
      return { allowed: true, retryAfterMs: 0 };
    }

    const nextCount = Number(data.count || 0) + 1;
    if (nextCount > limit) {
      const retryAfterMs = Math.max(0, windowMs - elapsed);
      return { allowed: false, retryAfterMs };
    }

    tx.update(ref, {
      count: nextCount,
      updatedAt: now,
    });

    return { allowed: true, retryAfterMs: 0 };
  });

  return result;
}
