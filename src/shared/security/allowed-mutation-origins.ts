import type { AppEnv } from "@/shared/config/env.server";
import {
  ALLOWED_APP_ORIGIN_ENV,
  parseAllowedAppOriginConfig,
} from "@/shared/security/allowed-app-origin";
import { SITE_URL } from "@/shared/seo/site";

function normalizeOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function buildAllowedMutationOrigins(input: {
  appEnv: AppEnv;
  env: Record<string, string | undefined>;
  siteUrl?: string;
}): Set<string> {
  const origins = new Set<string>();
  const siteOrigin = normalizeOrigin(input.siteUrl ?? SITE_URL);
  if (siteOrigin) {
    origins.add(siteOrigin);
  }

  if (input.appEnv === "development") {
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
  }

  const vercel = input.env.VERCEL_URL?.trim();
  if (vercel) {
    const vercelOrigin = normalizeOrigin(`https://${vercel}`);
    if (vercelOrigin) {
      origins.add(vercelOrigin);
    }
  }

  const configuredOrigin = parseAllowedAppOriginConfig({
    raw: input.env[ALLOWED_APP_ORIGIN_ENV],
    isProductionEnvironment: input.appEnv === "production",
  });
  if (configuredOrigin) {
    origins.add(configuredOrigin);
  }

  return origins;
}
