import "server-only";

import {
  buildSessionClearCookieOptions as buildClearOptions,
  buildSessionCookieOptions as buildOptions,
  SESSION_COOKIE_NAME,
  type SessionCookieOptions,
} from "@/modules/auth/domain/session-cookie-policy";
import type { SessionAuthStage } from "@/modules/auth/domain/session-types";
import { isProduction } from "@/shared/config/env.server";

export { SESSION_COOKIE_NAME, type SessionCookieOptions };

export function buildSessionCookieOptions(authStage: SessionAuthStage): SessionCookieOptions {
  return buildOptions(authStage, isProduction());
}

/** Clears the session cookie (logout / revocation). */
export function buildSessionClearCookieOptions(): SessionCookieOptions {
  return buildClearOptions(isProduction());
}
