import nodemailer from "nodemailer";

let cachedTransporter = null;

export function getMailTransporter() {
  const emailUser = (process.env.EMAIL_USER || process.env.SMTP_USER || "").trim();
  const rawPass = process.env.EMAIL_PASS || process.env.SMTP_PASS || "";
  const emailPass = rawPass.replace(/\s+/g, "");

  if (!emailUser || !emailPass) {
    console.warn("[mail] Missing EMAIL_USER or EMAIL_PASS in environment.");
    return null;
  }

  // Check if placeholder was left unchanged
  if (emailPass.toLowerCase().includes("xxxx") || emailPass === "your-gmail-app-password") {
    console.warn("[mail] EMAIL_PASS is set to a placeholder. Set a real 16-character Google App Password or SMTP password.");
    return null;
  }

  if (cachedTransporter) return cachedTransporter;

  const host = (process.env.EMAIL_HOST || process.env.SMTP_HOST || "").trim();
  const rawPort = process.env.EMAIL_PORT || process.env.SMTP_PORT;
  const isGmail = !host || host.includes("gmail.com");

  let port = rawPort ? Number(rawPort) : (isGmail ? 465 : 587);
  let isSecure = process.env.EMAIL_SECURE !== undefined
    ? process.env.EMAIL_SECURE === "true"
    : port === 465;

  let transportConfig;

  if (host && !isGmail) {
    // Custom SMTP relay (e.g. Brevo, SendGrid, Amazon SES, Mailgun, Hostinger, Zoho)
    transportConfig = {
      host,
      port,
      secure: isSecure,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === "production",
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    };
  } else {
    // Direct Gmail SMTP connection (direct host/port is vastly more reliable than service: "gmail" in modern Node)
    transportConfig = {
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === "production",
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    };
  }

  cachedTransporter = nodemailer.createTransport(transportConfig);
  return cachedTransporter;
}

export async function verifyMailConnection() {
  const mailTransporter = getMailTransporter();
  if (!mailTransporter) {
    return {
      success: false,
      error: "Nodemailer is not configured. Please set EMAIL_USER and a valid 16-character Google App Password (EMAIL_PASS) in .env.local.",
    };
  }

  try {
    await mailTransporter.verify();
    return { success: true };
  } catch (err) {
    // Invalidate cached transporter on auth/connection error
    cachedTransporter = null;
    return {
      success: false,
      error: err.message || "Failed to connect to SMTP server",
      code: err.code,
    };
  }
}

export async function sendMail({ to, subject, text, html }) {
  const mailTransporter = getMailTransporter();
  const emailUser = (process.env.EMAIL_USER || process.env.SMTP_USER || "").trim();

  if (!mailTransporter) {
    const errorMsg = "SMTP Mail Transporter is not configured. Define EMAIL_USER and a valid 16-character Google App Password (EMAIL_PASS) in .env.local.";
    if (process.env.NODE_ENV !== "production") {
      console.warn("\n=======================================================");
      console.warn(`[DEV MAIL SIMULATION] ${errorMsg}`);
      console.warn(`[RECIPIENT]: ${to}`);
      console.warn(`[SUBJECT]: ${subject}`);
      console.warn(`[BODY]:\n${text}`);
      console.warn("=======================================================\n");
      return { id: `dev_simulated_${Date.now()}`, simulated: true };
    }
    throw new Error(errorMsg);
  }

  const fromAddress = process.env.EMAIL_FROM || `"Chakradhar Stream Support" <${emailUser}>`;

  const mailOptions = {
    from: fromAddress,
    to,
    subject,
    text,
    html,
  };

  try {
    const info = await mailTransporter.sendMail(mailOptions);
    const cleanId = String(info.messageId || "").replace(/[<>]/g, "");
    return { id: cleanId || `msg_${Date.now()}` };
  } catch (error) {
    console.error("[mail] sendMail failed:", error?.message || error);
    // Invalidate cached transporter on failure so subsequent attempts re-verify config
    cachedTransporter = null;

    if (process.env.NODE_ENV !== "production") {
      console.warn("\n=======================================================");
      console.warn(`[DEV MAIL FALLBACK] SMTP Error: ${error?.message || "Unknown error"}`);
      console.warn(`[RECIPIENT]: ${to}`);
      console.warn(`[SUBJECT]: ${subject}`);
      console.warn(`[BODY]:\n${text}`);
      console.warn("=======================================================\n");
      return { id: `dev_fallback_${Date.now()}`, simulated: true, error: error?.message };
    }

    throw error;
  }
}
