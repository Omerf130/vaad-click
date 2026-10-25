import "server-only";

import { headers } from "next/headers";

import { getAppEnv } from "@/shared/config/env.server";
import { buildAllowedMutationOrigins } from "@/shared/security/allowed-mutation-origins";

function normalizeOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function allowedMutationOrigins(): Set<string> {
  return buildAllowedMutationOrigins({
    appEnv: getAppEnv(),
    env: process.env,
  });
}

/** Dev-only: allow the active server Host (e.g. localhost:3001 when 3000 is taken). */
function developmentRequestHostOrigin(hostHeader: string | null): string | null {
  if (getAppEnv() !== "development" || !hostHeader?.trim()) {
    return null;
  }
  const host = hostHeader.split(",")[0]?.trim();
  if (!host) {
    return null;
  }
  return normalizeOrigin(`http://${host}`);
}

/** Validates Origin/Referer for cookie-authenticated mutations (CSRF defense in depth). */
export async function assertSameOriginMutationRequest(): Promise<void> {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  const referer = headerStore.get("referer");

  const actual =
    (origin && normalizeOrigin(origin)) ||
    (referer ? normalizeOrigin(referer) : null);

  const allowed = allowedMutationOrigins();
  const hostOrigin = developmentRequestHostOrigin(
    headerStore.get("x-forwarded-host") ?? headerStore.get("host"),
  );
  if (hostOrigin) {
    allowed.add(hostOrigin);
  }

  if (!actual || !allowed.has(actual)) {
    throw new Error("Cross-origin request rejected");
  }
}
