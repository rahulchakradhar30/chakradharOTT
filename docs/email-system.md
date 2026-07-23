# Email & OTP Verification System Guide

This guide documents the implementation of the email services, OTP verification flows, and admin-to-user email reply systems. You can use this document as a blueprint to set up this system in another Next.js + Firestore project.

---

## 1. Directory Structure

To port this system, organize your backend files as follows:

```text
├── lib/
│   ├── mail.js              # Nodemailer/SMTP setup and sending
│   ├── adminAuth.js         # HMAC security helpers (OTP hashing & session signing)
│   ├── rateLimit.js         # Firestore transaction-based rate limiter
│   └── validation.js        # Input sanitization and validators
├── app/
│   └── api/
│       ├── send-otp/        # Admin OTP login dispatch
│       │   └── route.js
│       ├── verify-otp/      # Admin OTP verification & session cookie issuance
│       │   └── route.js
│       ├── send-reply/      # Admin support ticket reply dispatch & db logging
│       │   └── route.js
│       └── auth/
│           ├── send-signup-otp/   # User sign-up OTP dispatch
│           │   └── route.js
│           └── verify-signup-otp/ # User sign-up OTP validation
│               └── route.js
```

---

## 2. Environment Configurations

Make sure to define the following environment variables in your `.env.local` or environment config:

```env
# Mailer configuration (Gmail App Password is recommended)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password

# Security secrets
ADMIN_SECRET=your-long-secure-random-secret-key

# Admin emails whitelist (comma-separated, fallback values can be defined in code)
ADMIN_ALLOWED_EMAILS=admin1@example.com,admin2@example.com
```

> [!NOTE]
> If using Gmail, you must generate a 16-character **App Password** from your Google Account settings (with 2-Factor Authentication enabled). Do not use your primary password.

---

## 3. Database Schema Reference (Firestore)

### `admin_otps` & `signup_otps` Collections
Used to store active OTP tokens securely before validation.
- **Document Fields:**
  - `email` (string): Normalized recipient email address.
  - `otpHash` (string): HMAC-SHA256 signature of the OTP text.
  - `attempts` (number): Counter tracking unsuccessful matches (max 3).
  - `createdAt` (timestamp/epoch-ms): Generation timestamp.
  - `expiresAt` (timestamp/epoch-ms): Expiration timestamp (current standard is 5 minutes).

### `contacts` Collection (Support Tickets)
Represents contact tickets submitted by users.
- **Document Fields:**
  - `userId` (string | null): UID of the submitting user.
  - `name` (string): Senders name.
  - `email` (string): Sender's email.
  - `message` (string): Query description.
  - `messageStatus` (string): `"New"`, `"Replied"`, etc.
  - `replied` (boolean): `true` if a reply was sent.
  - `replies` (array of objects): Detailed history logs. Each reply object format:
    ```json
    {
      "id": "uuid",
      "emailId": "smtp-message-id",
      "content": "message text",
      "repliedBy": "admin-email",
      "repliedAt": "ISO timestamp",
      "emailStatus": "success|failed",
      "attachments": [
        { "name": "screenshot.png", "url": "https://..." }
      ]
    }
    ```

---

## 4. Core Utility Implementations

### A. SMTP Transport: [mail.js](file:///c:/Users/P%20RAHUL%20CHAKRADHAR/ott-platform/lib/mail.js)
Sets up a reusable Nodemailer instance for sending text and HTML emails.

```javascript
import nodemailer from "nodemailer";

let transporter = null;

export function getMailTransporter() {
  if (transporter) return transporter;

  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

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
    from: `"Support Team" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  };

  const info = await mailTransporter.sendMail(mailOptions);
  
  // Return messageId without surrounding brackets
  const cleanId = String(info.messageId || "").replace(/[<>]/g, "");
  return { id: cleanId || `msg_${Date.now()}` };
}
```

### B. Security & Sessions: [adminAuth.js](file:///c:/Users/P%20RAHUL%20CHAKRADHAR/ott-platform/lib/adminAuth.js)
Provides light-weight HMAC-SHA256 signature helpers for passwordless OTP security and stateless admin cookies, eliminating heavy JWT dependencies.

```javascript
import crypto from "crypto";

function requireAdminSecret() {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    throw new Error("ADMIN_SECRET is missing from environment variables");
  }
  return secret;
}

// Hashes the OTP using the server secret and email context
export function hashOtp(email, otp) {
  const secret = requireAdminSecret();
  return crypto
    .createHmac("sha256", secret)
    .update(`${email}:${otp}`)
    .digest("hex");
}

// Signs a light-weight token session: email.signature
export function signAdminSession(email) {
  const secret = requireAdminSecret();
  const signature = crypto
    .createHmac("sha256", secret)
    .update(email)
    .digest("hex");

  return `${email}.${signature}`;
}

// Verifies session token and returns email if valid, or null
export function verifyAdminSession(token) {
  if (!token || !token.includes(".")) return null;

  const lastDot = token.lastIndexOf(".");
  if (lastDot <= 0) return null;

  const email = token.slice(0, lastDot);
  const signature = token.slice(lastDot + 1);
  if (!email || !signature) return null;

  const expectedToken = signAdminSession(email);
  const expectedDot = expectedToken.lastIndexOf(".");
  if (expectedDot <= 0) return null;

  const expected = expectedToken.slice(expectedDot + 1);
  if (signature !== expected) return null;

  return email;
}
```

### C. Rate Limiting: [rateLimit.js](file:///c:/Users/P%20RAHUL%20CHAKRADHAR/ott-platform/lib/rateLimit.js)
Enforces a distributed rate limit using Firestore Transactions. Perfect for serverless environments where local variables are frequently wiped out.

```javascript
import crypto from "crypto";
import { adminDb } from "./firebaseAdmin"; // Import your initialized firebase-admin SDK instance

function hashKey(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function getClientIp(req) {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  const realIp = req.headers.get("x-real-ip") || "";
  const fromForwarded = forwarded.split(",")[0]?.trim();
  return fromForwarded || realIp || "unknown";
}

export async function enforceRateLimit({ scope, subject, limit, windowMs }) {
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
```

---

## 5. Implementation Flows & Routes

### Route 1: Sending Verification OTP (Admin Login Example)
**Endpoint:** `POST /api/send-otp`  
**Description:** Generates, stores, and sends a 6-digit verification code.

#### Key Mechanics:
1. **Input Validation:** Normalizes input email and checks regex validity.
2. **Access Control Whitelist:** Checks if the email matches `ADMIN_ALLOWED_EMAILS` or exists in the database `admins` collection.
3. **Rate Limits & Cooldowns:**
   - IP Rate limit: Max 20 requests per 10 mins.
   - Email Rate limit: Max 8 requests per 15 mins.
   - Resend Cooldown: Wait at least 60 seconds between attempts.
   - Velocity Cooldown: Max 3 OTPs in a rolling 5-minute window.
4. **Token Storage:** Generates 6-digit random code, hashes it using `hashOtp()`, and records to collection `admin_otps` with a `5-minute` expiration.
5. **SMTP Dispatch:** Dispatches a beautiful HTML template to the recipient using the transporter.

---

### Route 2: Verifying OTP & Starting Session
**Endpoint:** `POST /api/verify-otp`  
**Description:** Confirms OTP hash matches the database value and sets secure admin cookie session.

#### Key Mechanics:
1. **Fetch & Sort:** Retrieves OTP documents for the email, sorting manually descending by `createdAt` to fetch the latest.
2. **Validation Safeguards:**
   - **Expiration Check:** Validates that `Date.now() < doc.expiresAt`. If expired, deletes document and returns failure.
   - **Attempts Shield:** Validates `attempts < 3`. If exceeded, deletes document (forces token reset) and returns failure.
   - **Hash Match:** Hashes the input OTP `hashOtp(email, inputOtp)`. If it matches `doc.otpHash`, it's successful. Otherwise, increments `attempts` and returns failure.
3. **Session Cookies:** Upon successful matching, deletes the OTP document, creates an HMAC signature token using `signAdminSession()`, and stores it inside cookie `admin-session` with `httpOnly`, `secure`, and `sameSite` flags configured.

---

### Route 3: Replying from Admin Support Desk
**Endpoint:** `POST /api/send-reply`  
**Description:** Allows authenticated admin users to dispatch email responses to contact tickets directly from the dashboard.

#### Key Mechanics:
1. **Session Authorization:** Grabs cookie `admin-session` and executes `verifyAdminSession()`. If unauthorized, rejects query.
2. **Retrieve Ticket Context:** Queries `contacts` collection for `ticketId`, extracting name, user email, and the original message.
3. **Mailing:** Builds custom email payload detailing support response, attachments list, and copy of original ticket. Dispatches using `sendMail()`.
4. **Database Logging:** Updates support ticket document fields:
   - Appends a reply snapshot (reply content, timestamp, files, admin email, status) to `replies` array.
   - Updates status flag (e.g. `messageStatus: "Replied"`).
5. **In-App Alerts:** If the ticket is associated with a registered user (`userId`), writes a new document to the user sub-collection `users/{userId}/notifications` triggering client-side listener alerts.
6. **Error Resiliency:** If SMTP mail server is temporarily down, the route logs `emailStatus: "failed"`, but still saves the admin reply to the Firestore ticket so they do not lose response records.

---

## 6. Porting Checklist for Your New Project

- [ ] Copy utility files: `mail.js`, `adminAuth.js`, `rateLimit.js`, and `validation.js` to your helper path.
- [ ] Configure Firestore rule settings to guard `admin_otps`, `signup_otps`, and `rate_limits` against general public reads/writes.
- [ ] Establish correct `.env.local` credentials with Gmail App Passwords and secret key variables.
- [ ] Ensure `nodemailer` is installed in the target workspace dependencies (`npm i nodemailer`).
- [ ] Connect ticket submit forms (`POST /api/contact`) to store questions under Firestore collections corresponding to the path structure.
