import "server-only";

import type { ClientSession } from "mongoose";

import {
  FinancialSettingsCounter,
  PUBLISHED_VERSION_NUMBER_COUNTER_ID,
} from "@/modules/financial-settings/infra/financial-settings-counter.model";

/**
 * Atomically allocates the next published version number inside a transaction.
 * First allocation returns 1 (counter upserts with next incremented from 0).
 */
export async function allocatePublishedVersionNumber(
  session: ClientSession,
): Promise<number> {
  const counter = await FinancialSettingsCounter.findOneAndUpdate(
    { _id: PUBLISHED_VERSION_NUMBER_COUNTER_ID },
    { $inc: { next: 1 } },
    { upsert: true, new: true, session, setDefaultsOnInsert: true },
  ).lean();

  if (!counter?.next) {
    throw new Error("Failed to allocate financial settings version number");
  }

  return counter.next;
}
