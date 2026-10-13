import { createHmac, randomBytes } from "node:crypto";

const SESSION_TOKEN_BYTES = 32;

export function createOpaqueSessionToken(): string {
  return randomBytes(SESSION_TOKEN_BYTES).toString("base64url");
}

export function hashSessionTokenWithSecret(token: string, authSecret: string): string {
  return createHmac("sha256", authSecret).update(token).digest("hex");
}
