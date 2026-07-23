import crypto from "crypto";

// Base32 Alphabet (RFC 4648)
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = "";

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function base32Decode(input) {
  const clean = input.toUpperCase().replace(/=+$/, "").replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const output = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = ALPHABET.indexOf(clean[i]);
    if (idx === -1) continue;

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}

/**
 * Generate a new TOTP secret & otpauth URL for Google Authenticator
 */
export function generateTotpSecret(email) {
  const randomBytes = crypto.randomBytes(20);
  const secretBase32 = base32Encode(randomBytes);

  const issuer = "ChakradharStream";
  const cleanEmail = (email || "subadmin").trim();
  const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(cleanEmail)}?secret=${secretBase32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

  return {
    secret: secretBase32,
    otpauthUrl,
  };
}

/**
 * Generate 6-digit TOTP code for a secret at a specific counter (timestamp / 30)
 */
function getTotpAtCounter(secretBase32, counter) {
  const key = base32Decode(secretBase32);

  const buffer = Buffer.alloc(8);
  for (let i = 7; i >= 0; i--) {
    buffer[i] = counter & 0xff;
    counter >>= 8;
  }

  const hmac = crypto.createHmac("sha1", key);
  hmac.update(buffer);
  const digest = hmac.digest();

  const offset = digest[digest.length - 1] & 0xf;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  const otp = (binary % 1000000).toString().padStart(6, "0");
  return otp;
}

/**
 * Verify TOTP code with time drift window (±1 window = 30 seconds before/after)
 */
export function verifyTotpCode(secretBase32, userCode) {
  if (!secretBase32 || !userCode) return false;
  const cleanCode = String(userCode).trim();
  if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) return false;

  const currentCounter = Math.floor(Date.now() / 1000 / 30);

  for (let errorWindow = -1; errorWindow <= 1; errorWindow++) {
    const calculatedOtp = getTotpAtCounter(secretBase32, currentCounter + errorWindow);
    if (crypto.timingSafeEqual(Buffer.from(calculatedOtp), Buffer.from(cleanCode))) {
      return true;
    }
  }

  return false;
}
