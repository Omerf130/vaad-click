import "server-only";

import { headers } from "next/headers";

import { getAppEnv } from "@/shared/config/env.server";
import { SITE_URL } from "@/shared/seo/site";

function normalizeOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function allowedMutationOrigins(): string[] {
  const origins = new Set<string>();
  const siteOrigin = normalizeOrigin(SITE_URL);
  if (siteOrigin) {
    origins.add(siteOrigin);
  }

  if (getAppEnv() === "development") {
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const vercelOrigin = normalizeOrigin(`https://${vercel}`);
    if (vercelOrigin) {
      origins.add(vercelOrigin);
    }
  }

  return [...origins];
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

  const allowed = new Set(allowedMutationOrigins());
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
