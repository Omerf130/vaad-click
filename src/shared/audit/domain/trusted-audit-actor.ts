import type { UserRole } from "@/modules/users/domain/user-role";
import { AuditActorType } from "@/shared/audit/domain/audit-actor-type";

export type TrustedUserActor = {
  type: typeof AuditActorType.USER;
  userId: string;
  role: UserRole;
};

export type TrustedSystemActor = {
  type: typeof AuditActorType.SYSTEM;
  systemComponent: string;
};

export type TrustedExternalActor = {
  type: typeof AuditActorType.EXTERNAL;
  externalId: string;
  provider?: string;
};

export type TrustedAuditActor =
  | TrustedUserActor
  | TrustedSystemActor
  | TrustedExternalActor;
