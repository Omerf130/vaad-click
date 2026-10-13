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

/** Validates Origin/Referer for cookie-authenticated mutations (CSRF defense in depth). */
export async function assertSameOriginMutationRequest(): Promise<void> {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  const referer = headerStore.get("referer");

  const actual =
    (origin && normalizeOrigin(origin)) ||
    (referer ? normalizeOrigin(referer) : null);

  if (!actual || !allowedMutationOrigins().includes(actual)) {
    throw new Error("Cross-origin request rejected");
  }
}
