export function isValidEmail(email) {
  const value = String(email || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function sanitizeText(value, max = 1000) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, max);
}

export function asPositiveNumber(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return null;
  return num;
}
