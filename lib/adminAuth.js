import crypto from "crypto";

function requireAdminSecret() {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    throw new Error("ADMIN_SECRET is missing");
  }
  return secret;
}

export function hashOtp(email, otp) {
  const secret = requireAdminSecret();
  return crypto
    .createHmac("sha256", secret)
    .update(`${email}:${otp}`)
    .digest("hex");
}

export function signAdminSession(email) {
  const secret = requireAdminSecret();
  const signature = crypto
    .createHmac("sha256", secret)
    .update(email)
    .digest("hex");

  return `${email}.${signature}`;
}

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

export const ROOT_SUPER_ADMIN_EMAIL = "thefifthagefilms@gmail.com";

export function isRootSuperAdmin(email) {
  if (!email) return false;
  return email.trim().toLowerCase() === ROOT_SUPER_ADMIN_EMAIL;
}

export function getAllowedAdminEmails() {
  const fromEnv = String(process.env.ADMIN_ALLOWED_EMAILS || "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);

  const defaults = [ROOT_SUPER_ADMIN_EMAIL, "rahulchakradharperepogu@gmail.com"];
  return Array.from(new Set([...fromEnv, ...defaults]));
}

export function isSuperAdminEmail(email) {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return isRootSuperAdmin(clean) || getAllowedAdminEmails().includes(clean);
}
