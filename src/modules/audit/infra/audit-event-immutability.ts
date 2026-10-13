import type { Schema } from "mongoose";

import { AuditEventImmutableError } from "@/shared/audit/errors/audit-errors";

const BLOCKED_MUTATIONS = [
  "updateOne",
  "updateMany",
  "deleteOne",
  "deleteMany",
  "findOneAndUpdate",
  "findOneAndDelete",
  "findOneAndReplace",
  "replaceOne",
] as const;

export function installAuditEventImmutabilityGuards(schema: Schema): void {
  for (const op of BLOCKED_MUTATIONS) {
    schema.pre(op, function blockAuditMutation() {
      throw new AuditEventImmutableError(op);
    });
  }
}
