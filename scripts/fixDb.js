require('dotenv').config({ path: '.env.local' });
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, '\n'),
    }),
  });
}
const db = admin.firestore();

async function run() {
  const snapshot = await db.collection("contacts").get();
  let count = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (
      data.name === "Rahul Sharma" ||
      (data.message && data.message.includes("Rahul Sharma")) ||
      data.name === "The Fifth Age Films Production" ||
      (data.message && data.message.includes("The Fifth Age Films Production"))
    ) {
      console.log("Found ticket:", doc.id);
      
      const fixedMessage = `Hello Admin,

I hope you're doing well.

I would like to report an issue I'm facing on Chakradhar Stream.

**Name:** Rahul Sharma
**Registered Email:** [rahulsharma@gmail.com](mailto:rahulsharma@gmail.com)
**Ticket ID:** CST-20260706-001 (Example)

**Issue:**

I recently purchased a Premium subscription, but I'm unable to access Premium movies. My account still shows the Free plan even after the payment was completed successfully.

**Device Details:**

* Device: Windows Laptop
* Browser: Google Chrome
* Time of Issue: 06 July 2026, 3:15 PM

I have also attached a screenshot of the issue for reference.

Please look into this and let me know if you need any additional information. I would appreciate a resolution as soon as possible.

Thank you for your support.

Kind regards,

Rahul Sharma
Registered Email: [rahulsharma@gmail.com](mailto:rahulsharma@gmail.com)`;

      await db.collection("contacts").doc(doc.id).update({
        message: fixedMessage,
      });
      console.log("Updated", doc.id);
      count++;
    }
  }
  console.log("Finished updating", count, "tickets");
}
run();
