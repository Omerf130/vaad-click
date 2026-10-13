import "server-only";

import { randomUUID } from "node:crypto";

import { headers } from "next/headers";

const CORRELATION_HEADER_NAMES = ["x-correlation-id", "x-request-id"] as const;

export async function resolveAuditCorrelationId(): Promise<string | undefined> {
  const headerStore = await headers();
  for (const name of CORRELATION_HEADER_NAMES) {
    const value = headerStore.get(name)?.trim();
    if (value && value.length <= 128) {
      return value;
    }
  }
  return undefined;
}

export function createAuditCorrelationId(): string {
  return randomUUID();
}
