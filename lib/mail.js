import nodemailer from "nodemailer";

let transporter = null;

export function getMailTransporter() {
  if (transporter) return transporter;

  const emailUser = process.env.EMAIL_USER;
  const emailPass = (process.env.EMAIL_PASS || "").replace(/\s+/g, "");

  if (!emailUser || !emailPass) {
    console.warn("Nodemailer configuration missing EMAIL_USER or EMAIL_PASS in environment.");
    return null;
  }

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });

  return transporter;
}

export async function sendMail({ to, subject, text, html }) {
  const mailTransporter = getMailTransporter();
  if (!mailTransporter) {
    throw new Error("SMTP Mail Transporter is not configured. Define EMAIL_USER and EMAIL_PASS in .env.local.");
  }

  const mailOptions = {
    from: `"Chakradhar Stream Support" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  };

  const info = await mailTransporter.sendMail(mailOptions);
  
  // Return messageId as the tracking ID (removing surrounding brackets commonly added by SMTP)
  const cleanId = String(info.messageId || "").replace(/[<>]/g, "");
  return { id: cleanId || `msg_${Date.now()}` };
}
