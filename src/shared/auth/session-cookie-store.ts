import "server-only";

import { cookies } from "next/headers";

import type { SessionAuthStage } from "@/modules/auth/domain/session-types";
import {
  buildSessionClearCookieOptions,
  buildSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/shared/auth/session-cookie";

export async function readSessionTokenFromCookies(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export async function writeSessionCookie(
  token: string,
  authStage: SessionAuthStage,
): Promise<void> {
  const options = buildSessionCookieOptions(authStage);
  const store = await cookies();
  store.set(options.name, token, {
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: options.sameSite,
    path: options.path,
    maxAge: options.maxAge,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const options = buildSessionClearCookieOptions();
  const store = await cookies();
  store.set(options.name, "", {
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: options.sameSite,
    path: options.path,
    maxAge: options.maxAge,
  });
}
