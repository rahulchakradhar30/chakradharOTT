import crypto from "crypto";

export const RP_NAME = "Chakradhar Stream";

/**
 * Convert string or buffer to URL-safe Base64
 */
export function toBase64Url(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * Convert Base64Url back to Buffer
 */
export function fromBase64Url(base64url) {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64");
}

/**
 * Generate WebAuthn Registration Options for Passkey Creation
 */
export function generateRegistrationOptions(email, displayName, rpId = "localhost") {
  const challenge = crypto.randomBytes(32);
  const userId = crypto.createHash("sha256").update(email.toLowerCase()).digest();

  return {
    challenge: toBase64Url(challenge),
    rp: {
      name: RP_NAME,
      id: rpId,
    },
    user: {
      id: toBase64Url(userId),
      name: email,
      displayName: displayName || email.split("@")[0],
    },
    pubKeyCredParams: [
      { type: "public-key", alg: -7 },  // ES256
      { type: "public-key", alg: -257 }, // RS256
    ],
    timeout: 60000,
    attestation: "none",
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  };
}

/**
 * Parse & verify Passkey registration assertion
 */
export function verifyRegistrationCredential(response, expectedChallenge) {
  if (!response || !response.id || !response.rawId) {
    throw new Error("Invalid registration credential payload");
  }

  const clientDataJSON = JSON.parse(fromBase64Url(response.response.clientDataJSON).toString("utf-8"));

  if (clientDataJSON.type !== "webauthn.create") {
    throw new Error("Invalid clientData type for registration");
  }

  if (clientDataJSON.challenge !== expectedChallenge) {
    throw new Error("Challenge mismatch during passkey registration");
  }

  return {
    credentialId: response.id,
    publicKey: response.response.attestationObject, // Store attestation / pubkey metadata
    counter: 0,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Generate WebAuthn Authentication Challenge for 1-Click Login
 */
export function generateAuthenticationOptions(passkeys = [], rpId = "localhost") {
  const challenge = crypto.randomBytes(32);

  const allowCredentials = passkeys.map((p) => ({
    id: p.credentialId,
    type: "public-key",
  }));

  return {
    challenge: toBase64Url(challenge),
    timeout: 60000,
    rpId,
    allowCredentials,
    userVerification: "preferred",
  };
}

/**
 * Parse & verify Passkey login assertion
 */
export function verifyAuthenticationCredential(response, expectedChallenge) {
  if (!response || !response.id || !response.response) {
    throw new Error("Invalid authentication credential payload");
  }

  const clientDataJSON = JSON.parse(fromBase64Url(response.response.clientDataJSON).toString("utf-8"));

  if (clientDataJSON.type !== "webauthn.get") {
    throw new Error("Invalid clientData type for authentication");
  }

  if (clientDataJSON.challenge !== expectedChallenge) {
    throw new Error("Challenge mismatch during passkey login");
  }

  return {
    success: true,
    credentialId: response.id,
  };
}
