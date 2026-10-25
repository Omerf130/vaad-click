import "server-only";

import type { SessionAuthStage } from "@/modules/auth/domain/session-types";
import type { UserRole } from "@/modules/users/domain/user-role";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { AuditActorType } from "@/shared/audit/domain/audit-actor-type";
import { AuditEventType } from "@/shared/audit/domain/audit-event-taxonomy";
import { AuditOutcome } from "@/shared/audit/domain/audit-outcome";
import {
  buildExternalAuditActor,
  buildSystemAuditActor,
  buildUserAuditActor,
} from "@/shared/audit/build-audit-actor";
import {
  writeAuditEvent,
  writeAuditEventMandatory,
} from "@/modules/audit/services/audit-writer.service";
import type { ClientSession } from "mongoose";

const ANONYMOUS_LOGIN_ACTOR = buildExternalAuditActor({
  externalId: "anonymous",
  provider: "auth",
});

export type AuthRateLimitChannel = "login" | "register" | "password_setup";

export async function recordAuthLoginSuccess(input: {
  userId: string;
  role: UserRole;
  authStage: SessionAuthStage;
  correlationId?: string;
  session: ClientSession;
}): Promise<void> {
  await writeAuditEventMandatory(
    {
      eventType: AuditEventType.AUTH_LOGIN_SUCCESS,
      actor: {
        type: AuditActorType.USER,
        userId: input.userId,
        role: input.role,
      },
      action: "login",
      outcome: AuditOutcome.SUCCESS,
      target: { entityType: "user", entityId: input.userId },
      metadata: { authStage: input.authStage },
      correlationId: input.correlationId,
    },
    { session: input.session },
  );
}

export async function recordAuthLoginFailure(input: {
  correlationId?: string;
}): Promise<void> {
  await writeAuditEvent({
    eventType: AuditEventType.AUTH_LOGIN_FAILURE,
    actor: ANONYMOUS_LOGIN_ACTOR,
    action: "login",
    outcome: AuditOutcome.FAILURE,
    metadata: { reasonCode: "authentication_failed" },
    correlationId: input.correlationId,
  });
}

export async function recordAuthLogout(input: {
  context: AuthenticatedContext;
  correlationId?: string;
}): Promise<void> {
  await writeAuditEvent({
    eventType: AuditEventType.AUTH_LOGOUT,
    actor: buildUserAuditActor(input.context),
    action: "logout",
    outcome: AuditOutcome.SUCCESS,
    target: { entityType: "user", entityId: input.context.user.id },
    correlationId: input.correlationId,
  });
}

export async function recordAuthRegistrationSuccess(input: {
  userId: string;
  role: UserRole;
  correlationId?: string;
  session: ClientSession;
}): Promise<void> {
  await writeAuditEventMandatory(
    {
      eventType: AuditEventType.AUTH_REGISTRATION_SUCCESS,
      actor: {
        type: AuditActorType.USER,
        userId: input.userId,
        role: input.role,
      },
      action: "register",
      outcome: AuditOutcome.SUCCESS,
      target: { entityType: "user", entityId: input.userId },
      metadata: { registeredRole: input.role },
      correlationId: input.correlationId,
    },
    { session: input.session },
  );
}

export async function recordAuthRegistrationFailure(input: {
  reasonCode: "duplicate_identity" | "role_forbidden" | "validation";
  correlationId?: string;
}): Promise<void> {
  await writeAuditEvent({
    eventType: AuditEventType.AUTH_REGISTRATION_FAILURE,
    actor: ANONYMOUS_LOGIN_ACTOR,
    action: "register",
    outcome: AuditOutcome.FAILURE,
    metadata: { reasonCode: input.reasonCode },
    correlationId: input.correlationId,
  });
}

export async function recordAuthRateLimitExceeded(input: {
  channel: AuthRateLimitChannel;
  correlationId?: string;
}): Promise<void> {
  await writeAuditEvent({
    eventType: AuditEventType.AUTH_RATE_LIMIT_EXCEEDED,
    actor: buildSystemAuditActor("auth.rate_limit"),
    action: "rate_limit",
    outcome: AuditOutcome.DENIED,
    metadata: { channel: input.channel },
    correlationId: input.correlationId,
  });
}

export async function recordAuthAccessForbidden(input: {
  context: AuthenticatedContext;
  reasonCode:
    | "production_mfa_required"
    | "role_mismatch"
    | "account_not_operational"
    | "account_status_page_denied"
    | "building_access_denied";
  correlationId?: string;
  buildingPublicId?: string;
}): Promise<void> {
  await writeAuditEvent({
    eventType: AuditEventType.AUTH_ACCESS_FORBIDDEN,
    actor: buildUserAuditActor(input.context),
    action: "access",
    outcome: AuditOutcome.DENIED,
    target: { entityType: "user", entityId: input.context.user.id },
    metadata: {
      reasonCode: input.reasonCode,
      ...(input.buildingPublicId ? { buildingId: input.buildingPublicId } : {}),
    },
    correlationId: input.correlationId,
  });
}

export async function recordAuthLawyerDemoPortalAccess(input: {
  userId: string;
  role: UserRole;
  correlationId?: string;
}): Promise<void> {
  await writeAuditEvent({
    eventType: AuditEventType.AUTH_LAWYER_DEMO_PORTAL_ACCESS,
    actor: {
      type: AuditActorType.USER,
      userId: input.userId,
      role: input.role,
    },
    action: "lawyer_demo_portal_access",
    outcome: AuditOutcome.SUCCESS,
    target: { entityType: "user", entityId: input.userId },
    metadata: { temporaryDemoException: true },
    correlationId: input.correlationId,
  });
}

export async function recordAuthAccountPasswordInitialized(input: {
  userId: string;
  role: UserRole;
  correlationId?: string;
  session: ClientSession;
}): Promise<void> {
  await writeAuditEventMandatory(
    {
      eventType: AuditEventType.AUTH_ACCOUNT_PASSWORD_INITIALIZED,
      actor: {
        type: AuditActorType.USER,
        userId: input.userId,
        role: input.role,
      },
      action: "password_initialize",
      outcome: AuditOutcome.SUCCESS,
      target: { entityType: "user", entityId: input.userId },
      correlationId: input.correlationId,
    },
    { session: input.session },
  );
}
