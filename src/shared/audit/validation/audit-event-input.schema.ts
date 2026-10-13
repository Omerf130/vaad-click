import { z } from "zod";

import { UserRole } from "@/modules/users/domain/user-role";
import { AuditActorType } from "@/shared/audit/domain/audit-actor-type";
import { isWellFormedAuditEventType } from "@/shared/audit/domain/audit-event-taxonomy";
import { AUDIT_OUTCOMES } from "@/shared/audit/domain/audit-outcome";
import { auditMetadataSchema } from "@/shared/audit/validation/audit-metadata.schema";

const entityTypeSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z][a-z0-9_]*$/);

const entityIdSchema = z.string().min(1).max(128);

const trustedUserActorSchema = z.object({
  type: z.literal(AuditActorType.USER),
  userId: z.string().min(1).max(128),
  role: z.enum([
    UserRole.LAWYER_ADMIN,
    UserRole.BUILDING_REP,
    UserRole.MANAGEMENT_COMPANY,
  ]),
});

const trustedSystemActorSchema = z.object({
  type: z.literal(AuditActorType.SYSTEM),
  systemComponent: z.string().min(1).max(120),
});

const trustedExternalActorSchema = z.object({
  type: z.literal(AuditActorType.EXTERNAL),
  externalId: z.string().min(1).max(128),
  provider: z.string().min(1).max(64).optional(),
});

export const trustedAuditActorSchema = z.discriminatedUnion("type", [
  trustedUserActorSchema,
  trustedSystemActorSchema,
  trustedExternalActorSchema,
]);

const auditTargetSchema = z.object({
  entityType: entityTypeSchema,
  entityId: entityIdSchema,
});

export const auditEventWriteInputSchema = z
  .object({
    eventType: z.string().min(3).max(120).refine(isWellFormedAuditEventType, {
      message: "Invalid audit event type format",
    }),
    eventVersion: z.number().int().min(1).max(9999).default(1),
    actor: trustedAuditActorSchema,
    action: z.string().min(1).max(120),
    outcome: z.enum(AUDIT_OUTCOMES as [string, ...string[]]),
    target: auditTargetSchema.optional(),
    metadata: auditMetadataSchema.optional(),
    correlationId: z.string().min(1).max(128).optional(),
  })
  .strict();

/** Caller input — `eventVersion` optional (defaults to 1 during parse). */
export type AuditEventWriteInput = z.input<typeof auditEventWriteInputSchema>;
export type AuditEventWritePayload = z.infer<typeof auditEventWriteInputSchema>;
