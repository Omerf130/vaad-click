import { z } from "zod";

import {
  assertAuditMetadataKeyAllowed,
  assertAuditMetadataStringValueSafe,
  AuditSensitiveDataError,
} from "@/shared/audit/validation/sensitive-field-guard";

const metadataPrimitive = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const MAX_AUDIT_METADATA_KEYS = 32;

export const auditMetadataSchema = z
  .record(z.string(), metadataPrimitive)
  .superRefine((record, ctx) => {
    const keys = Object.keys(record);
    if (keys.length > MAX_AUDIT_METADATA_KEYS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Metadata may contain at most ${MAX_AUDIT_METADATA_KEYS} keys`,
      });
      return;
    }

    for (const [key, value] of Object.entries(record)) {
      try {
        assertAuditMetadataKeyAllowed(key);
        if (typeof value === "string") {
          assertAuditMetadataStringValueSafe(value);
        }
      } catch (error) {
        if (error instanceof AuditSensitiveDataError) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: error.message,
            path: [key],
          });
        } else {
          throw error;
        }
      }
    }
  });

export type AuditMetadata = z.infer<typeof auditMetadataSchema>;
