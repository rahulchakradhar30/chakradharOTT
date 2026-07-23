import { adminDb } from "./firebaseAdmin";
import { sendMail } from "./mail";

/* ── Broadcast notification to ALL users ── */
export async function notifyAllUsers({ title, message, type, link }) {
  try {
    const usersSnap = await adminDb.collection("users").get();
    
    const promises = usersSnap.docs.map(async (userDoc) => {
      const userData = userDoc.data();
      const userId = userDoc.id;
      const userSettings = userData.settings || {};
      
      // Default preferences to true if not explicitly set
      const emailNotifications = userSettings.emailNotifications !== false;
      
      // 1. Create in-app notification in Firestore subcollection
      const notifRef = adminDb.collection("users").doc(userId).collection("notifications").doc();
      await notifRef.set({
        title,
        message,
        type: type || "general",
        link: link || null,
        read: false,
        createdAt: new Date(),
      });
      
      // 2. Dispatch email notification if enabled
      if (emailNotifications && userData.email) {
        try {
          await sendMail({
            to: userData.email,
            subject: `Chakradhar Stream - ${title}`,
            text: `${message}\n\nCheck it out here: https://chakradharstream.vercel.app${link || ""}\n\n---\nChakradhar Stream Support`,
            html: `
              <div style="background-color: #0c1328; padding: 40px 10px; font-family: sans-serif; color: #f3f4f6; text-align: left;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #060b19; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.5);">
                  <div style="background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); padding: 30px 20px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 900;">Chakradhar Stream</h1>
                    <p style="margin: 5px 0 0 0; color: rgba(255, 255, 255, 0.85); font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">New Updates</p>
                  </div>
                  <div style="padding: 30px;">
                    <p style="font-size: 16px; font-weight: bold; margin-bottom: 15px; color: #ffffff;">Hello ${userData.firstName || userData.name || "Subscriber"},</p>
                    <p style="font-size: 14px; color: #d1d5db; line-height: 1.6; margin-bottom: 25px;">${message}</p>
                    
                    ${link ? `
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="https://chakradharstream.vercel.app${link}" target="_blank" style="background: #06b6d4; color: #000; text-decoration: none; padding: 12px 25px; border-radius: 30px; font-weight: bold; font-size: 14px; display: inline-block;">
                        Check It Out Now
                      </a>
                    </div>
                    ` : ""}
                  </div>
                  <div style="background-color: #030712; padding: 20px; text-align: center; font-size: 11px; color: #6b7280;">
                    <p style="margin: 0 0 4px 0;">You received this email because you are registered on Chakradhar Stream.</p>
                    <p style="margin: 0;">To unsubscribe or change settings, manage notifications on your <a href="https://chakradharstream.vercel.app/profile" style="color: #06b6d4; text-decoration: underline;">Profile Settings page</a>.</p>
                  </div>
                </div>
              </div>
            `
          });
        } catch (emailErr) {
          console.error(`Failed to send update email to ${userData.email}:`, emailErr);
        }
      }
    });

    await Promise.all(promises);
    console.log(`[NOTIFY] Broadcasted notification to all users: "${title}"`);
  } catch (error) {
    console.error("Failed to broadcast notifications to all users:", error);
  }
}

/* ── Notify all active admins (In-App Notification + Email Dispatch) ── */
export async function notifyAdmins({ title, message, type, link, sendEmail = true }) {
  try {
    const adminEmails = new Set([
      "thefifthagefilms@gmail.com",
      "rahulchakradharperepogu@gmail.com",
      ...getAllowedAdminEmailsInternal(),
    ]);

    const adminsSnap = await adminDb.collection("admins").get();
    adminsSnap.forEach((docSnap) => {
      const d = docSnap.data();
      if (d.status !== "disabled" && d.status !== "removed") {
        adminEmails.add(docSnap.id.toLowerCase());
      }
    });

    const targetList = Array.from(adminEmails);

    const promises = targetList.map(async (adminEmail) => {
      // 1. In-app notification doc
      const notifRef = adminDb
        .collection("admins")
        .doc(adminEmail)
        .collection("notifications")
        .doc();

      await notifRef.set({
        title,
        message,
        type: type || "admin_action",
        link: link || "/admin/mail",
        read: false,
        createdAt: new Date(),
      });

      // 2. Email notification to personal email address
      if (sendEmail) {
        try {
          await sendMail({
            to: adminEmail,
            subject: `[Admin Alert] ${title}`,
            text: `Hello Administrator,\n\n${message}\n\nView details in portal: ${process.env.NEXT_PUBLIC_APP_URL || "https://chakradharstream.vercel.app"}${link || "/admin/mail"}`,
            html: `
              <div style="background-color: #0c1328; padding: 40px 10px; font-family: sans-serif; color: #f3f4f6;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #060b19; border: 1px solid rgba(6,182,212,0.3); border-radius: 20px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.5);">
                  <div style="background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); padding: 25px 20px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 900;">Chakradhar Stream Admin Alert</h1>
                    <p style="margin: 4px 0 0 0; color: rgba(255,255,255,0.85); font-size: 12px; text-transform: uppercase;">Administrator Notification</p>
                  </div>
                  <div style="padding: 30px;">
                    <h2 style="font-size: 18px; font-weight: bold; margin-top: 0; color: #ffffff;">${title}</h2>
                    <p style="font-size: 14px; color: #d1d5db; line-height: 1.6; margin-bottom: 25px;">${message}</p>
                    <div style="text-align: center;">
                      <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://chakradharstream.vercel.app"}${link || "/admin/mail"}" target="_blank" style="background: linear-gradient(135deg, #06b6d4, #3b82f6); color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 30px; font-weight: bold; font-size: 13px; display: inline-block;">
                        Open Admin Portal
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            `,
          });
        } catch (emailErr) {
          console.warn(`Failed to send alert email to ${adminEmail}:`, emailErr);
        }
      }
    });

    await Promise.all(promises);
    console.log(`[NOTIFY] Admin notification & email sent to ${targetList.length} admins: "${title}"`);
  } catch (error) {
    console.error("Failed to send admin notifications:", error);
  }
}

/* ── Notify a single admin by email ── */
export async function notifyAdmin(email, { title, message, type, link }) {
  try {
    const normalizedEmail = email.toLowerCase();
    const notifRef = adminDb
      .collection("admins")
      .doc(normalizedEmail)
      .collection("notifications")
      .doc();

    await notifRef.set({
      title,
      message,
      type: type || "admin_action",
      link: link || null,
      read: false,
      createdAt: new Date(),
    });

    console.log(`[NOTIFY] Admin notification sent to ${normalizedEmail}: "${title}"`);
  } catch (error) {
    console.error(`Failed to send notification to admin ${email}:`, error);
  }
}

/* Internal helper */
function getAllowedAdminEmailsInternal() {
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
