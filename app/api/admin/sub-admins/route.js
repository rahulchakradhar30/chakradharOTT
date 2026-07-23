import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAdminSession, isSuperAdminEmail, isRootSuperAdmin } from "@/lib/adminAuth";
import { sendMail } from "@/lib/mail";
import { getAuth } from "firebase-admin/auth";
import { logServerEvent } from "@/lib/auditLog";

export const runtime = "nodejs";

const DEFAULT_MODULE_PERMISSIONS = {
  dashboard: true,
  movies: true,
  contacts: true,
  drafts: true,
  mail: true,
  notifications: true,
  premieres: false,
  posters: false,
  discovery: false,
  genres: false,
  analytics: false,
  users: false,
  subAdmins: false,
  settings: false,
};

/* ── POST: Create a new sub-admin ── */
export async function POST(req) {
  try {
    const token = req.cookies.get("admin-session")?.value || "";
    const callerEmail = verifyAdminSession(token);

    if (!callerEmail || !isSuperAdminEmail(callerEmail)) {
      return NextResponse.json({ error: "Unauthorized — only super-admins can manage administrators." }, { status: 403 });
    }

    const { email, role, name, permissions } = await req.json();
    const cleanEmail = (email || "").trim().toLowerCase();

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json({ error: "Valid email address is required." }, { status: 400 });
    }

    const validRole = role === "super_admin" ? "super_admin" : "sub_admin";

    // Set clean permissions map
    const customPerms = validRole === "sub_admin"
      ? { ...DEFAULT_MODULE_PERMISSIONS, ...(permissions || {}) }
      : Object.keys(DEFAULT_MODULE_PERMISSIONS).reduce((acc, k) => ({ ...acc, [k]: true }), {});

    // Check if already exists in admins collection
    const existingDoc = await adminDb.collection("admins").doc(cleanEmail).get();
    if (existingDoc.exists) {
      const existingData = existingDoc.data();
      if (existingData.status === "active") {
        return NextResponse.json({ error: "This email is already registered as an administrator." }, { status: 409 });
      }
    }

    // Try to get or create Firebase Auth user
    let firebaseUser = null;
    const adminAuth = getAuth();

    try {
      firebaseUser = await adminAuth.getUserByEmail(cleanEmail);
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        const tempPassword = `TempPwd_${Math.random().toString(36).slice(2, 10)}!${Math.floor(Math.random() * 99)}`;
        firebaseUser = await adminAuth.createUser({
          email: cleanEmail,
          password: tempPassword,
          displayName: name || cleanEmail.split("@")[0],
        });
      } else {
        throw err;
      }
    }

    // Direct login & password setup link (eliminates Firebase Auth domain allowlist dependency)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://chakradharstream.vercel.app";
    const passwordResetLink = `${appUrl}/admin/login?email=${encodeURIComponent(cleanEmail)}`;

    // Store/update admin document in Firestore
    await adminDb.collection("admins").doc(cleanEmail).set({
      email: cleanEmail,
      role: validRole,
      name: name || "",
      status: "active",
      createdAt: new Date(),
      createdBy: callerEmail,
      uid: firebaseUser.uid,
      permissions: customPerms,
    });

    // Send invitation email with password setup link
    let mailSuccess = false;
    let mailErrorMsg = "";

    try {
      await sendMail({
        to: cleanEmail,
        subject: "You're Invited — Chakradhar Stream Admin Access",
        text: `Hello,\n\nYou have been granted ${validRole === "super_admin" ? "Super Admin" : "Sub-Admin"} access to Chakradhar Stream.\n\nPlease set your password using this link:\n${passwordResetLink}\n\nThen login at: ${process.env.NEXT_PUBLIC_APP_URL || "https://chakradharstream.vercel.app"}/admin/login\n\n— Chakradhar Stream Team`,
        html: `
          <div style="background-color: #0c1328; padding: 40px 10px; font-family: sans-serif; color: #f3f4f6;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #060b19; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.5);">
              <div style="background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); padding: 30px 20px; text-align: center;">
                <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 900;">Chakradhar Stream</h1>
                <p style="margin: 5px 0 0 0; color: rgba(255,255,255,0.85); font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Admin Invitation</p>
              </div>
              <div style="padding: 30px;">
                <p style="font-size: 16px; font-weight: bold; margin-bottom: 15px; color: #ffffff;">Hello ${name || cleanEmail.split("@")[0]},</p>
                <p style="font-size: 14px; color: #d1d5db; line-height: 1.6; margin-bottom: 10px;">
                  You have been granted <strong style="color: #06b6d4;">${validRole === "super_admin" ? "Super Administrator" : "Sub-Administrator"}</strong> access to the Chakradhar Stream Admin Portal.
                </p>
                <p style="font-size: 14px; color: #d1d5db; line-height: 1.6; margin-bottom: 25px;">
                  Please click the button below to set your password and activate your account.
                </p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${passwordResetLink}" target="_blank" style="background: linear-gradient(135deg, #06b6d4, #3b82f6); color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 30px; font-weight: bold; font-size: 14px; display: inline-block;">
                    Set Your Password
                  </a>
                </div>
                <p style="font-size: 13px; color: #9ca3af; margin-top: 20px;">
                  After setting your password, login at the admin portal using OTP verification.
                </p>
              </div>
              <div style="background-color: #030712; padding: 20px; text-align: center; font-size: 11px; color: #6b7280;">
                <p style="margin: 0 0 4px 0;">Invited by ${callerEmail}</p>
                <p style="margin: 0;">© ${new Date().getFullYear()} Chakradhar Stream. All rights reserved.</p>
              </div>
            </div>
          </div>
        `,
      });
      mailSuccess = true;
    } catch (mailErr) {
      console.error("Failed to send invitation email:", mailErr);
      mailErrorMsg = mailErr.message || "Failed to send email";
    }

    await logServerEvent("sub_admin_created", {
      email: cleanEmail,
      role: validRole,
      createdBy: callerEmail,
    });

    return NextResponse.json({
      success: true,
      message: mailSuccess
        ? `Admin ${cleanEmail} added. Invitation email sent.`
        : `Admin ${cleanEmail} added, but email delivery failed: ${mailErrorMsg}`,
    });
  } catch (error) {
    console.error("Create sub-admin error:", error);
    return NextResponse.json({ error: error.message || "Failed to create admin" }, { status: 500 });
  }
}

/* ── PATCH: Update sub-admin permissions or role ── */
export async function PATCH(req) {
  try {
    const token = req.cookies.get("admin-session")?.value || "";
    const callerEmail = verifyAdminSession(token);

    if (!callerEmail || !isSuperAdminEmail(callerEmail)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { email, permissions, role, name } = await req.json();
    const cleanEmail = (email || "").trim().toLowerCase();

    if (!cleanEmail) {
      return NextResponse.json({ error: "Target email required." }, { status: 400 });
    }

    if (isRootSuperAdmin(cleanEmail)) {
      return NextResponse.json({ error: "The Root Super Admin (thefifthagefilms@gmail.com) permissions cannot be altered." }, { status: 400 });
    }

    const adminDocRef = adminDb.collection("admins").doc(cleanEmail);
    const adminDoc = await adminDocRef.get();

    if (!adminDoc.exists) {
      return NextResponse.json({ error: "Admin not found." }, { status: 404 });
    }

    const updates = { updatedAt: new Date(), updatedBy: callerEmail };
    if (permissions && typeof permissions === "object") {
      updates.permissions = { ...DEFAULT_MODULE_PERMISSIONS, ...permissions };
    }
    if (role === "super_admin" || role === "sub_admin") {
      updates.role = role;
    }
    if (name) {
      updates.name = name;
    }

    await adminDocRef.update(updates);

    await logServerEvent("sub_admin_permissions_updated", {
      email: cleanEmail,
      updatedBy: callerEmail,
    });

    return NextResponse.json({
      success: true,
      message: `Permissions updated successfully for ${cleanEmail}.`,
    });
  } catch (error) {
    console.error("Update sub-admin error:", error);
    return NextResponse.json({ error: error.message || "Failed to update admin" }, { status: 500 });
  }
}

/* ── DELETE: Remove/disable a sub-admin and send notification email ── */
export async function DELETE(req) {
  try {
    const token = req.cookies.get("admin-session")?.value || "";
    const callerEmail = verifyAdminSession(token);

    if (!callerEmail || !isSuperAdminEmail(callerEmail)) {
      return NextResponse.json({ error: "Unauthorized — only super-admins can remove administrators." }, { status: 403 });
    }

    const { email } = await req.json();
    const cleanEmail = (email || "").trim().toLowerCase();

    if (!cleanEmail) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    if (isRootSuperAdmin(cleanEmail)) {
      return NextResponse.json({ error: "The Root Super Admin (thefifthagefilms@gmail.com) cannot be deleted or removed under any circumstances." }, { status: 400 });
    }

    const adminDocRef = adminDb.collection("admins").doc(cleanEmail);
    const adminDoc = await adminDocRef.get();

    if (!adminDoc.exists) {
      return NextResponse.json({ error: "Admin account not found." }, { status: 404 });
    }

    const targetData = adminDoc.data() || {};
    const adminName = targetData.name || cleanEmail.split("@")[0];

    // Step 1: Set status to "disabled" → triggers real-time force-logout on client
    await adminDocRef.update({ status: "disabled", disabledAt: new Date(), disabledBy: callerEmail });

    // Step 2: Send removal notification email to the sub-admin
    try {
      await sendMail({
        to: cleanEmail,
        subject: "Administrator Access Revoked — Chakradhar Stream",
        text: `Hello ${adminName},\n\nYour administrator access to the Chakradhar Stream Admin Portal has been revoked by Super Admin (${callerEmail}).\n\nIf you believe this is an error, please contact the Super Admin.\n\n— Chakradhar Stream Team`,
        html: `
          <div style="background-color: #0c1328; padding: 40px 10px; font-family: sans-serif; color: #f3f4f6;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #060b19; border: 1px solid rgba(239,68,68,0.3); border-radius: 20px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.5);">
              <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px 20px; text-align: center;">
                <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 900;">Chakradhar Stream</h1>
                <p style="margin: 5px 0 0 0; color: rgba(255,255,255,0.85); font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Access Revoked</p>
              </div>
              <div style="padding: 30px;">
                <p style="font-size: 16px; font-weight: bold; margin-bottom: 15px; color: #ffffff;">Hello ${adminName},</p>
                <p style="font-size: 14px; color: #d1d5db; line-height: 1.6; margin-bottom: 15px;">
                  This email is to notify you that your administrator access to the <strong>Chakradhar Stream Admin Portal</strong> has been revoked by Super Admin (<span style="color: #06b6d4;">${callerEmail}</span>).
                </p>
                <p style="font-size: 14px; color: #9ca3af; line-height: 1.6;">
                  Your current session has been terminated immediately. If you have any questions regarding this action, please contact the Super Admin directly.
                </p>
              </div>
              <div style="background-color: #030712; padding: 20px; text-align: center; font-size: 11px; color: #6b7280;">
                <p style="margin: 0 0 4px 0;">Action taken by Super Admin: ${callerEmail}</p>
                <p style="margin: 0;">© ${new Date().getFullYear()} Chakradhar Stream. All rights reserved.</p>
              </div>
            </div>
          </div>
        `,
      });
    } catch (mailErr) {
      console.error("Failed to send sub-admin removal email:", mailErr);
    }

    // Step 3: Delete the document from Firestore after 3s grace period for client logout event
    setTimeout(async () => {
      try {
        await adminDocRef.delete();
      } catch (delErr) {
        console.error("Failed to delete admin doc after disable:", delErr);
      }
    }, 3000);

    await logServerEvent("sub_admin_removed", {
      email: cleanEmail,
      removedBy: callerEmail,
    });

    return NextResponse.json({
      success: true,
      message: `Admin ${cleanEmail} has been removed. Access revocation email sent and active session terminated.`,
    });
  } catch (error) {
    console.error("Delete sub-admin error:", error);
    return NextResponse.json({ error: error.message || "Failed to remove admin" }, { status: 500 });
  }
}

/* ── GET: Fetch all Sub-Admins & Admins ── */
export async function GET(req) {
  try {
    const token = req.cookies.get("admin-session")?.value || "";
    const callerEmail = verifyAdminSession(token);

    if (!callerEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminsMap = new Map();

    // 1. Fetch from 'admins' collection
    const adminsSnap = await adminDb.collection("admins").get();
    adminsSnap.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const email = (data.email || docSnap.id).toLowerCase().trim();
      adminsMap.set(email, {
        id: docSnap.id,
        email,
        name: data.name || email.split("@")[0],
        role: data.role || (isSuperAdminEmail(email) ? "super_admin" : "sub_admin"),
        permissions: data.permissions || DEFAULT_MODULE_PERMISSIONS,
        status: data.status || "active",
        createdAt: data.createdAt ? data.createdAt.toDate?.() || data.createdAt : null,
        onLeave: Boolean(data.onLeave),
        activeDelegate: data.activeDelegate || null,
      });
    });

    // 2. Fetch from 'users' collection where role is sub_admin
    const usersSubAdminSnap = await adminDb.collection("users").where("role", "in", ["sub_admin", "subadmin"]).get();
    usersSubAdminSnap.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const email = (data.email || "").toLowerCase().trim();
      if (email && !adminsMap.has(email)) {
        adminsMap.set(email, {
          id: docSnap.id,
          email,
          name: data.displayName || data.name || email.split("@")[0],
          role: "sub_admin",
          permissions: DEFAULT_MODULE_PERMISSIONS,
          status: "active",
          createdAt: data.createdAt ? data.createdAt.toDate?.() || data.createdAt : null,
          onLeave: false,
          activeDelegate: null,
        });
      }
    });

    // Convert map to array
    const admins = Array.from(adminsMap.values());

    return NextResponse.json({
      success: true,
      admins,
    });
  } catch (error) {
    console.error("Fetch admins error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch admins" }, { status: 500 });
  }
}


