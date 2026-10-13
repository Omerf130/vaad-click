"use server";

import { redirect } from "next/navigation";

import { SessionAuthStage } from "@/modules/auth/domain/session-types";
import {
  establishLoginSessionWithMandatoryAudit,
  LoginSessionEstablishmentError,
} from "@/modules/auth/services/auth-login-session.service";
import { loginWithEmailPassword } from "@/modules/auth/services/login.service";
import { registerPublicUser } from "@/modules/auth/services/register.service";
import { revokeServerSessionByToken } from "@/modules/auth/services/session.service";
import { loginInputSchema } from "@/modules/auth/validation/login.schema";
import { registerInputSchema } from "@/modules/auth/validation/register.schema";
import {
  recordAuthLoginFailure,
  recordAuthLogout,
  recordAuthRateLimitExceeded,
  recordAuthRegistrationFailure,
} from "@/modules/audit/services/auth-audit.service";
import { resolveAuditCorrelationId } from "@/modules/audit/services/audit-correlation";
import { UserRole } from "@/modules/users/domain/user-role";
import { getAuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import {
  clearSessionCookie,
  readSessionTokenFromCookies,
  writeSessionCookie,
} from "@/shared/auth/session-cookie-store";
import { getClientIpFromHeaders } from "@/shared/security/client-ip";
import { assertSameOriginMutationRequest } from "@/shared/security/request-origin";
import {
  consumeRateLimit,
  RateLimitExceededError,
} from "@/shared/security/rate-limit";
import {
  LOGIN_RATE_LIMIT,
  REGISTER_RATE_LIMIT,
  loginRateLimitKey,
  registerRateLimitKey,
} from "@/shared/security/rate-limit/rate-limit-config";
import { sanitizeReturnPath } from "@/shared/security/safe-redirect";
import { genericAuthenticationFailureMessage } from "@/shared/security/account-login";

const MAX_FORM_FIELD_LENGTH = 512;

export type AuthActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

function clampFormData(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.slice(0, MAX_FORM_FIELD_LENGTH);
}

function loginRedirectPath(role: UserRole, returnTo: string | null): string {
  if (returnTo) {
    return returnTo;
  }
  if (role === UserRole.LAWYER_ADMIN) {
    return "/app/admin";
  }
  return "/app";
}

export async function loginAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const correlationId = await resolveAuditCorrelationId();

  try {
    await assertSameOriginMutationRequest();
  } catch {
    return { ok: false, message: "הבקשה נדחתה." };
  }

  const parsed = loginInputSchema.safeParse({
    email: clampFormData(formData.get("email")),
    password: clampFormData(formData.get("password")),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "יש לתקן את השדות המסומנים.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const ip = await getClientIpFromHeaders();
  const rateKey = loginRateLimitKey(ip, parsed.data.email);

  try {
    await consumeRateLimit(
      {
        keyPrefix: "login",
        points: LOGIN_RATE_LIMIT.points,
        durationSeconds: LOGIN_RATE_LIMIT.durationSeconds,
        blockDurationSeconds: LOGIN_RATE_LIMIT.blockDurationSeconds,
      },
      rateKey,
    );
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      await recordAuthRateLimitExceeded({ channel: "login", correlationId });
      return {
        ok: false,
        message: "יותר מדי ניסיונות כניסה. נסה שוב מאוחר יותר.",
      };
    }
    throw error;
  }

  const result = await loginWithEmailPassword(parsed.data);
  if (!result.ok) {
    await recordAuthLoginFailure({ correlationId });
    return { ok: false, message: result.message };
  }

  try {
    const session = await establishLoginSessionWithMandatoryAudit({
      userId: result.userId,
      role: result.role,
      authStage: result.authStage,
      correlationId,
    });
    await writeSessionCookie(session.token, result.authStage);
  } catch (error) {
    if (error instanceof LoginSessionEstablishmentError) {
      return { ok: false, message: genericAuthenticationFailureMessage() };
    }
    throw error;
  }

  const returnTo = sanitizeReturnPath(clampFormData(formData.get("returnTo")));
  redirect(loginRedirectPath(result.role, returnTo));
}

export async function registerAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const correlationId = await resolveAuditCorrelationId();

  try {
    await assertSameOriginMutationRequest();
  } catch {
    return { ok: false, message: "הבקשה נדחתה." };
  }

  const parsed = registerInputSchema.safeParse({
    fullName: clampFormData(formData.get("fullName")),
    email: clampFormData(formData.get("email")),
    password: clampFormData(formData.get("password")),
    role: clampFormData(formData.get("role")),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "יש לתקן את השדות המסומנים.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const ip = await getClientIpFromHeaders();
  try {
    await consumeRateLimit(
      {
        keyPrefix: "register",
        points: REGISTER_RATE_LIMIT.points,
        durationSeconds: REGISTER_RATE_LIMIT.durationSeconds,
        blockDurationSeconds: REGISTER_RATE_LIMIT.blockDurationSeconds,
      },
      registerRateLimitKey(ip),
    );
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      await recordAuthRateLimitExceeded({ channel: "register", correlationId });
      return {
        ok: false,
        message: "יותר מדי ניסיונות הרשמה. נסה שוב מאוחר יותר.",
      };
    }
    throw error;
  }

  const result = await registerPublicUser(parsed.data, { correlationId });
  if (!result.ok) {
    if (result.code === "DUPLICATE_EMAIL") {
      await recordAuthRegistrationFailure({
        reasonCode: "duplicate_identity",
        correlationId,
      });
    } else if (result.code === "ROLE_FORBIDDEN") {
      await recordAuthRegistrationFailure({
        reasonCode: "role_forbidden",
        correlationId,
      });
    }
    return { ok: false, message: result.message };
  }

  await writeSessionCookie(result.sessionToken, SessionAuthStage.MFA_COMPLETE);
  redirect("/app");
}

export async function logoutAction(): Promise<void> {
  const correlationId = await resolveAuditCorrelationId();

  try {
    await assertSameOriginMutationRequest();
  } catch {
    redirect("/login");
  }

  const context = await getAuthenticatedContext();
  const token = await readSessionTokenFromCookies();

  if (context) {
    await recordAuthLogout({ context, correlationId });
  }

  if (token) {
    await revokeServerSessionByToken(token);
  }
  await clearSessionCookie();
  redirect("/login");
}
