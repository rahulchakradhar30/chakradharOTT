import { adminDb } from "./firebaseAdmin";
import { sendMail } from "./mail";

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
