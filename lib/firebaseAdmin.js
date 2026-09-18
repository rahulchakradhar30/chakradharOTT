import { initializeApp, cert, getApps, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

let cachedAdminDb = null;

function getAdminDbInstance() {
  if (cachedAdminDb) return cachedAdminDb;

  try {
    if (!getApps().length) {
      if (
        !process.env.FIREBASE_PROJECT_ID ||
        !process.env.FIREBASE_CLIENT_EMAIL ||
        !process.env.FIREBASE_PRIVATE_KEY
      ) {
        console.warn("[firebaseAdmin] Firebase Admin credentials missing from environment.");
        return null;
      }

      app = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
      });
    } else {
      app = getApp();
    }

    cachedAdminDb = getFirestore(app);
    return cachedAdminDb;
  } catch (err) {
    console.error("[firebaseAdmin] Initialization failed:", err);
    return null;
  }
}

// Proxy wrapper for safe invocation without top-level import crashes
export const adminDb = new Proxy(
  {},
  {
    get(target, prop) {
      const dbInstance = getAdminDbInstance();
      if (!dbInstance) {
        // Return safe dummy implementations for common query methods
        if (prop === "collection") {
          return (collName) => ({
            doc: (docId) => ({
              get: async () => ({ exists: false, data: () => null }),
              set: async () => {},
              update: async () => {},
              delete: async () => {},
            }),
            get: async () => ({ docs: [], empty: true }),
            where: () => ({
              get: async () => ({ docs: [], empty: true }),
              where: () => ({ get: async () => ({ docs: [], empty: true }) }),
              limit: () => ({ get: async () => ({ docs: [], empty: true }) }),
              orderBy: () => ({ get: async () => ({ docs: [], empty: true }) }),
            }),
            limit: () => ({
              get: async () => ({ docs: [], empty: true }),
              where: () => ({ get: async () => ({ docs: [], empty: true }) }),
            }),
            orderBy: () => ({
              get: async () => ({ docs: [], empty: true }),
              limit: () => ({ get: async () => ({ docs: [], empty: true }) }),
            }),
          });
        }
        return () => {};
      }
      const value = dbInstance[prop];
      return typeof value === "function" ? value.bind(dbInstance) : value;
    },
  }
);