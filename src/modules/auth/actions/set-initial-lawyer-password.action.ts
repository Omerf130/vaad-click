"use server";

import { redirect } from "next/navigation";

import { recordAuthRateLimitExceeded } from "@/modules/audit/services/auth-audit.service";
import { resolveAuditCorrelationId } from "@/modules/audit/services/audit-correlation";
import { completeLawyerAdminSetupWithToken } from "@/modules/auth/services/lawyer-admin-setup-token.service";
import { passwordInputSchema } from "@/shared/security/password.schema";
import { getAppEnv } from "@/shared/config/env.server";
import { getClientIpFromHeaders } from "@/shared/security/client-ip";
import { assertSameOriginMutationRequest } from "@/shared/security/request-origin";
import {
  consumeRateLimit,
  RateLimitExceededError,
} from "@/shared/security/rate-limit";

export type SetInitialPasswordState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

const SETUP_RATE_LIMIT = {
  keyPrefix: "lawyer-admin-password-setup",
  points: 10,
  durationSeconds: 60 * 60,
  blockDurationSeconds: 60 * 60,
};

const GENERIC_SETUP_FAILURE =
  "לא ניתן להשלים את הגדרת הסיסמה. ייתכן שהקישור פג תוקף או כבר נוצל.";

export async function setInitialLawyerPasswordAction(
  _prev: SetInitialPasswordState,
  formData: FormData,
): Promise<SetInitialPasswordState> {
  if (getAppEnv() === "production") {
    return { ok: false, message: "Password setup is not available." };
  }

  try {
    await assertSameOriginMutationRequest();
  } catch {
    return { ok: false, message: "הבקשה נדחתה." };
  }

  const setupToken = String(formData.get("setupToken") ?? "").slice(0, 512);
  if (!setupToken) {
    return { ok: false, message: GENERIC_SETUP_FAILURE };
  }

  const password = String(formData.get("password") ?? "").slice(0, 128);
  const confirm = String(formData.get("confirmPassword") ?? "").slice(0, 128);

  if (password !== confirm) {
    return { ok: false, message: "הסיסמאות אינן תואמות." };
  }

  const parsed = passwordInputSchema.safeParse(password);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? "סיסמה לא תקינה";
    return {
      ok: false,
      fieldErrors: { password: [firstIssue] },
      message: "יש לתקן את השדות המסומנים.",
    };
  }

  const correlationId = await resolveAuditCorrelationId();
  const ip = await getClientIpFromHeaders();
  try {
    await consumeRateLimit(SETUP_RATE_LIMIT, `setup:${ip}`);
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      await recordAuthRateLimitExceeded({
        channel: "password_setup",
        correlationId,
      });
      return { ok: false, message: "יותר מדי ניסיונות. נסה שוב מאוחר יותר." };
    }
    throw error;
  }

  const result = await completeLawyerAdminSetupWithToken({
    rawToken: setupToken,
    password: parsed.data,
  });

  if (!result.ok) {
    return { ok: false, message: GENERIC_SETUP_FAILURE };
  }

  redirect("/login?setup=complete");
}
