import {
  sessionTtlSecondsForStage,
  type SessionAuthStage,
} from "@/modules/auth/domain/session-types";

export const SESSION_COOKIE_NAME = "vc_session";

export type SessionCookieOptions = {
  name: string;
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  maxAge: number;
};

export function buildSessionCookieOptions(
  authStage: SessionAuthStage,
  secure: boolean,
): SessionCookieOptions {
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: sessionTtlSecondsForStage(authStage),
  };
}

export function buildSessionClearCookieOptions(secure: boolean): SessionCookieOptions {
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  };
}
