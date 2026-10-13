import "server-only";

import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { AuditActorType } from "@/shared/audit/domain/audit-actor-type";
import type {
  TrustedAuditActor,
  TrustedExternalActor,
  TrustedSystemActor,
  TrustedUserActor,
} from "@/shared/audit/domain/trusted-audit-actor";

/** Builds a server-trusted user actor from an authenticated session context. */
export function buildUserAuditActor(context: AuthenticatedContext): TrustedUserActor {
  return {
    type: AuditActorType.USER,
    userId: context.user.id,
    role: context.user.role,
  };
}

export function buildSystemAuditActor(systemComponent: string): TrustedSystemActor {
  return {
    type: AuditActorType.SYSTEM,
    systemComponent,
  };
}

export function buildExternalAuditActor(input: {
  externalId: string;
  provider?: string;
}): TrustedExternalActor {
  return {
    type: AuditActorType.EXTERNAL,
    externalId: input.externalId,
    provider: input.provider,
  };
}

export type { TrustedAuditActor };
