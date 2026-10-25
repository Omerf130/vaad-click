/** Server-only env: exact public browser origin (e.g. stable Vercel project URL). */
export const ALLOWED_APP_ORIGIN_ENV = "ALLOWED_APP_ORIGIN";

export function parseAllowedAppOriginConfig(input: {
  raw: string | undefined;
  isProductionEnvironment: boolean;
}): string | null {
  const trimmed = input.raw?.trim();
  if (!trimmed) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (url.username || url.password) {
    return null;
  }
  if (url.pathname !== "/" && url.pathname !== "") {
    return null;
  }
  if (url.search || url.hash) {
    return null;
  }
  if (!url.hostname) {
    return null;
  }

  if (input.isProductionEnvironment && url.protocol !== "https:") {
    return null;
  }

  if (!input.isProductionEnvironment && url.protocol !== "https:" && url.protocol !== "http:") {
    return null;
  }

  return url.origin;
}
