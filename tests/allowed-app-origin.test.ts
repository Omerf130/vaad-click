import { describe, expect, it } from "vitest";

import { parseAllowedAppOriginConfig } from "@/shared/security/allowed-app-origin";
import { buildAllowedMutationOrigins } from "@/shared/security/allowed-mutation-origins";

describe("parseAllowedAppOriginConfig", () => {
  it("accepts https origin in production", () => {
    expect(
      parseAllowedAppOriginConfig({
        raw: "https://vaad-click.vercel.app",
        isProductionEnvironment: true,
      }),
    ).toBe("https://vaad-click.vercel.app");
  });

  it("rejects http origin in production", () => {
    expect(
      parseAllowedAppOriginConfig({
        raw: "http://vaad-click.vercel.app",
        isProductionEnvironment: true,
      }),
    ).toBeNull();
  });

  it("rejects credentials in URL", () => {
    expect(
      parseAllowedAppOriginConfig({
        raw: "https://user:pass@vaad-click.vercel.app",
        isProductionEnvironment: true,
      }),
    ).toBeNull();
  });

  it("rejects path, query, and fragment", () => {
    expect(
      parseAllowedAppOriginConfig({
        raw: "https://vaad-click.vercel.app/login",
        isProductionEnvironment: true,
      }),
    ).toBeNull();
    expect(
      parseAllowedAppOriginConfig({
        raw: "https://vaad-click.vercel.app?x=1",
        isProductionEnvironment: true,
      }),
    ).toBeNull();
    expect(
      parseAllowedAppOriginConfig({
        raw: "https://vaad-click.vercel.app#x",
        isProductionEnvironment: true,
      }),
    ).toBeNull();
  });

  it("rejects malformed values", () => {
    expect(
      parseAllowedAppOriginConfig({
        raw: "not-a-url",
        isProductionEnvironment: true,
      }),
    ).toBeNull();
  });

  it("missing config returns null", () => {
    expect(
      parseAllowedAppOriginConfig({
        raw: undefined,
        isProductionEnvironment: true,
      }),
    ).toBeNull();
  });

  it("normalizes trailing slash to origin", () => {
    expect(
      parseAllowedAppOriginConfig({
        raw: "https://vaad-click.vercel.app/",
        isProductionEnvironment: true,
      }),
    ).toBe("https://vaad-click.vercel.app");
  });

  it("allows http origin in non-production", () => {
    expect(
      parseAllowedAppOriginConfig({
        raw: "http://localhost:3000",
        isProductionEnvironment: false,
      }),
    ).toBe("http://localhost:3000");
  });
});

describe("buildAllowedMutationOrigins", () => {
  const stableAlias = "https://vaad-click-stable.vercel.app";
  const deploymentHost = "vaad-click-abc123.vercel.app";

  it("includes configured Vercel alias, canonical site, and VERCEL_URL", () => {
    const set = buildAllowedMutationOrigins({
      appEnv: "production",
      env: {
        VERCEL_URL: deploymentHost,
        ALLOWED_APP_ORIGIN: stableAlias,
      },
    });
    expect(set.has("https://vaadclick.co.il")).toBe(true);
    expect(set.has(`https://${deploymentHost}`)).toBe(true);
    expect(set.has(stableAlias)).toBe(true);
  });

  it("does not allow unconfigured vercel subdomain", () => {
    const set = buildAllowedMutationOrigins({
      appEnv: "production",
      env: {
        VERCEL_URL: deploymentHost,
        ALLOWED_APP_ORIGIN: stableAlias,
      },
    });
    expect(set.has("https://other-project.vercel.app")).toBe(false);
  });

  it("ignores invalid ALLOWED_APP_ORIGIN without widening allowlist", () => {
    const set = buildAllowedMutationOrigins({
      appEnv: "production",
      env: {
        ALLOWED_APP_ORIGIN: "http://insecure.example",
      },
    });
    expect(set.has("http://insecure.example")).toBe(false);
  });
});
