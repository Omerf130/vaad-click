import "server-only";

import { getAuthSecret } from "@/shared/config/env.server";
import { hashSessionTokenWithSecret } from "@/shared/security/session-token";

export function hashSessionToken(token: string): string {
  return hashSessionTokenWithSecret(token, getAuthSecret());
}
