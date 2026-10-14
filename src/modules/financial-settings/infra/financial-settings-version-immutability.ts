import type { Schema } from "mongoose";

import { FinancialSettingsVersionImmutableError } from "@/modules/financial-settings/domain/financial-settings-errors";
import { FinancialSettingsVersionStatus } from "@/modules/financial-settings/domain/financial-settings-version-status";

type MongoUpdate = {
  $set?: Record<string, unknown>;
  $unset?: Record<string, unknown>;
};

function readUpdateStatus(update: MongoUpdate | null | undefined): unknown {
  return update?.$set?.status;
}

export function assertDraftScopedFilter(filter: Record<string, unknown>): void {
  if (filter.status !== FinancialSettingsVersionStatus.DRAFT) {
    throw new FinancialSettingsVersionImmutableError("filter must require draft status");
  }
}

export function assertPublishTransitionAllowed(
  filter: Record<string, unknown>,
  update: MongoUpdate | null | undefined,
): void {
  assertDraftScopedFilter(filter);
  if (readUpdateStatus(update) !== FinancialSettingsVersionStatus.PUBLISHED) {
    throw new FinancialSettingsVersionImmutableError(
      "publish must set status to published in one update",
    );
  }
}

export function assertDraftMutationAllowed(
  filter: Record<string, unknown>,
  update: MongoUpdate | null | undefined,
): void {
  if (filter.status === FinancialSettingsVersionStatus.PUBLISHED) {
    throw new FinancialSettingsVersionImmutableError("published document filter");
  }

  if (readUpdateStatus(update) === FinancialSettingsVersionStatus.PUBLISHED) {
    assertPublishTransitionAllowed(filter, update);
    return;
  }

  assertDraftScopedFilter(filter);
}

const UPDATE_OPS = [
  "updateOne",
  "updateMany",
  "findOneAndUpdate",
  "findOneAndReplace",
  "replaceOne",
] as const;

const DELETE_OPS = ["deleteOne", "deleteMany", "findOneAndDelete"] as const;

export function installFinancialSettingsVersionImmutabilityGuards(schema: Schema): void {
  for (const op of UPDATE_OPS) {
    schema.pre(op, function enforceUpdatePolicy() {
      const filter = this.getFilter() as Record<string, unknown>;
      const update = this.getUpdate() as MongoUpdate | null | undefined;
      assertDraftMutationAllowed(filter, update);
    });
  }

  for (const op of DELETE_OPS) {
    schema.pre(op, function enforceDeletePolicy() {
      const filter = this.getFilter() as Record<string, unknown>;
      assertDraftScopedFilter(filter);
    });
  }
}
