import { adminDb } from "@/lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { verifyAdminSession } from "@/lib/adminAuth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const token = req.cookies.get("admin-session")?.value || "";
    const email = verifyAdminSession(token);
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all users from Firestore
    const usersSnap = await adminDb.collection("users").get();
    const users = [];
    usersSnap.forEach((docSnap) => {
      const data = docSnap.data();
      users.push({
        uid: docSnap.id,
        email: data.email || "",
        name: data.name || data.displayName || "",
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        bio: data.bio || "",
        photoURL: data.photoURL || "",
        totalXP: data.totalXP || 0,
        createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt) : null,
      });
    });

    // Sort by name or email
    users.sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Admin list users API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const token = req.cookies.get("admin-session")?.value || "";
    const email = verifyAdminSession(token);
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, targetUid, data } = await req.json();

    if (!targetUid) {
      return NextResponse.json({ error: "Missing user UID" }, { status: 400 });
    }

    const userRef = adminDb.doc(`users/${targetUid}`);

    if (action === "edit-profile") {
      const { name, bio } = data || {};
      const nameParts = (name || "").trim().split(" ");
      await userRef.set(
        {
          name: name || "",
          firstName: nameParts[0] || "",
          lastName: nameParts.slice(1).join(" ") || "",
          bio: bio || "",
        },
        { merge: true }
      );

      // Attempt to sync to Firebase Auth if exists
      try {
        const auth = getAuth();
        await auth.updateUser(targetUid, {
          displayName: name,
        });
      } catch (authErr) {
        console.warn("Failed to sync displayName update to Auth:", authErr.message);
      }

      return NextResponse.json({ success: true, message: "User profile updated successfully" });
    }

    if (action === "remove-photo") {
      await userRef.set({ photoURL: "" }, { merge: true });

      // Sync to Firebase Auth
      try {
        const auth = getAuth();
        await auth.updateUser(targetUid, {
          photoURL: "",
        });
      } catch (authErr) {
        console.warn("Failed to clear photoURL in Auth:", authErr.message);
      }

      return NextResponse.json({ success: true, message: "User photo removed successfully" });
    }

    if (action === "delete-user") {
      // 1. Delete from Firestore
      await userRef.delete();

      // 2. Delete from Firebase Authentication
      try {
        const auth = getAuth();
        await auth.deleteUser(targetUid);
      } catch (authErr) {
        console.warn("Failed to delete user in Auth (might be local storage user):", authErr.message);
      }

      return NextResponse.json({ success: true, message: "User deleted successfully" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Admin user action API error:", error);
    return NextResponse.json(
      { error: error.message || "Action failed" },
      { status: 500 }
    );
  }
}
