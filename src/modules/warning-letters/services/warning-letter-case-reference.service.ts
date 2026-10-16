import "server-only";

import type { ClientSession } from "mongoose";

import { formatLetterCaseReference } from "@/modules/warning-letters/domain/format-letter-case-reference";
import {
  WarningLetterCaseReferenceCounter,
  warningLetterCaseReferenceCounterId,
} from "@/modules/warning-letters/infra/warning-letter-case-reference-counter.model";

export async function allocateLetterCaseReference(input: {
  letterDateIso: string;
  session: ClientSession;
}): Promise<string> {
  const year = Number(input.letterDateIso.slice(0, 4));
  const counter = await WarningLetterCaseReferenceCounter.findOneAndUpdate(
    { _id: warningLetterCaseReferenceCounterId(year) },
    { $inc: { next: 1 } },
    {
      upsert: true,
      returnDocument: "after",
      session: input.session,
      setDefaultsOnInsert: true,
    },
  ).lean();

  if (!counter?.next) {
    throw new Error("Failed to allocate warning letter case reference");
  }

  return formatLetterCaseReference(year, counter.next);
}

/** Reuse an existing reference when regenerating a draft revision chain. */
export function resolveLetterCaseReferenceForRegeneration(input: {
  existingReference: string;
}): string {
  return input.existingReference.trim();
}
