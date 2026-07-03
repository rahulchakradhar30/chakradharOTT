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
