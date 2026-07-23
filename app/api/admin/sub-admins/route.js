import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAdminSession } from "@/lib/adminAuth";
import { sendMail } from "@/lib/mail";
import { getAuth } from "firebase-admin/auth";
import { logServerEvent } from "@/lib/auditLog";

export const runtime = "nodejs";

function getAllowedAdminEmails() {
  const fromEnv = String(process.env.ADMIN_ALLOWED_EMAILS || "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);

  if (fromEnv.length > 0) return fromEnv;

  return [
    "thefifthagefilms@gmail.com",
    "rahulchakradharperepogu@gmail.com",
  ];
}

function isSuperAdmin(email) {
  return getAllowedAdminEmails().includes(email.toLowerCase());
}

/* ── POST: Create a new sub-admin ── */
export async function POST(req) {
  try {
    const token = req.cookies.get("admin-session")?.value || "";
    const callerEmail = verifyAdminSession(token);

    if (!callerEmail || !isSuperAdmin(callerEmail)) {
      return NextResponse.json({ error: "Unauthorized — only super-admins can manage administrators." }, { status: 403 });
    }

    const { email, role, name } = await req.json();
    const cleanEmail = (email || "").trim().toLowerCase();

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json({ error: "Valid email address is required." }, { status: 400 });
    }

    const validRole = role === "super_admin" ? "super_admin" : "sub_admin";

    // Check if already exists in admins collection
    const existingDoc = await adminDb.collection("admins").doc(cleanEmail).get();
    if (existingDoc.exists) {
      const existingData = existingDoc.data();
      if (existingData.status === "active") {
        return NextResponse.json({ error: "This email is already registered as an administrator." }, { status: 409 });
      }
      // If disabled, reactivate
    }

    // Try to get or create Firebase Auth user
    let firebaseUser = null;
    const adminAuth = getAuth();

    try {
      firebaseUser = await adminAuth.getUserByEmail(cleanEmail);
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        // Create a new Firebase Auth user with a random temporary password
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

    // Generate password reset link for the sub-admin to set their own password
    const passwordResetLink = await adminAuth.generatePasswordResetLink(cleanEmail, {
      url: `${process.env.NEXT_PUBLIC_APP_URL || "https://chakradharstream.vercel.app"}/admin/login`,
    });

    // Store/update admin document in Firestore
    await adminDb.collection("admins").doc(cleanEmail).set({
      email: cleanEmail,
      role: validRole,
      name: name || "",
      status: "active",
      createdAt: new Date(),
      createdBy: callerEmail,
      uid: firebaseUser.uid,
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
                  After setting your password, login at the admin portal. You will receive an OTP on your email for secure verification.
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

    if (mailSuccess) {
      return NextResponse.json({
        success: true,
        message: `Admin ${cleanEmail} added. Invitation email sent to ${cleanEmail}.`,
      });
    } else {
      return NextResponse.json({
        success: true,
        warning: true,
        message: `Admin ${cleanEmail} was added, but the invitation email could not be delivered: ${mailErrorMsg}`,
      });
    }
  } catch (error) {
    console.error("Create sub-admin error:", error);
    return NextResponse.json({ error: error.message || "Failed to create admin" }, { status: 500 });
  }
}

/* ── DELETE: Remove/disable a sub-admin ── */
export async function DELETE(req) {
  try {
    const token = req.cookies.get("admin-session")?.value || "";
    const callerEmail = verifyAdminSession(token);

    if (!callerEmail || !isSuperAdmin(callerEmail)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { email } = await req.json();
    const cleanEmail = (email || "").trim().toLowerCase();

    if (!cleanEmail) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    // Prevent removing self or other super-admins from env
    if (isSuperAdmin(cleanEmail)) {
      return NextResponse.json({ error: "Cannot remove a super administrator configured in environment." }, { status: 400 });
    }

    const adminDocRef = adminDb.collection("admins").doc(cleanEmail);
    const adminDoc = await adminDocRef.get();

    if (!adminDoc.exists) {
      return NextResponse.json({ error: "Admin not found." }, { status: 404 });
    }

    // Step 1: Set status to "disabled" → triggers real-time logout on the client
    await adminDocRef.update({ status: "disabled", disabledAt: new Date(), disabledBy: callerEmail });

    // Step 2: After 3 seconds (enough for real-time listener), delete the doc
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
      message: `Admin ${cleanEmail} has been removed. If they were logged in, they will be logged out immediately.`,
    });
  } catch (error) {
    console.error("Delete sub-admin error:", error);
    return NextResponse.json({ error: error.message || "Failed to remove admin" }, { status: 500 });
  }
}
