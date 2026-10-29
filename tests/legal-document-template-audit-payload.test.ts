import { describe, expect, it } from "vitest";

import { AuditEventType } from "@/shared/audit/domain/audit-event-taxonomy";
import { AuditOutcome } from "@/shared/audit/domain/audit-outcome";
import { AuditActorType } from "@/shared/audit/domain/audit-actor-type";
import { UserRole } from "@/modules/users/domain/user-role";
import { auditEventWriteInputSchema } from "@/shared/audit/validation/audit-event-input.schema";

describe("legal document template draft_created audit payload", () => {
  it("passes audit input validation used on create draft", () => {
    const parsed = auditEventWriteInputSchema.parse({
      eventType: AuditEventType.LEGAL_DOCUMENT_ONBOARDING_TEMPLATE_DRAFT_CREATED,
      actor: {
        type: AuditActorType.USER,
        userId: "507f1f77bcf86cd799439011",
        role: UserRole.LAWYER_ADMIN,
      },
      action: "legal_document_template_draft_create",
      outcome: AuditOutcome.SUCCESS,
      target: { entityType: "legal_document_template", entityId: "550e8400-e29b-41d4-a716-446655440000" },
      metadata: {
        category: "power_of_attorney",
        revisionId: "660e8400-e29b-41d4-a716-446655440001",
        revisionNumber: 1,
        contentSha256Prefix: "abcd1234abcd1234",
      },
      correlationId: "corr-1",
    });
    expect(parsed.eventType).toBe(AuditEventType.LEGAL_DOCUMENT_ONBOARDING_TEMPLATE_DRAFT_CREATED);
  });
});
