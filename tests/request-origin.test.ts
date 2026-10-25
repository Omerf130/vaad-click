import { beforeEach, describe, expect, it, vi } from "vitest";

const mockHeaders = vi.fn();
const mockGetAppEnv = vi.fn();

vi.mock("next/headers", () => ({
  headers: () => mockHeaders(),
}));

vi.mock("@/shared/config/env.server", () => ({
  getAppEnv: () => mockGetAppEnv(),
}));

function headerBag(values: Record<string, string>) {
  return {
    get: (name: string) => values[name.toLowerCase()] ?? null,
  };
}

describe("assertSameOriginMutationRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("allows origin matching development Host when port is not 3000", async () => {
    mockGetAppEnv.mockReturnValue("development");
    mockHeaders.mockResolvedValue(
      headerBag({
        origin: "http://localhost:3001",
        host: "localhost:3001",
      }),
    );

    const { assertSameOriginMutationRequest } = await import(
      "@/shared/security/request-origin"
    );
    await expect(assertSameOriginMutationRequest()).resolves.toBeUndefined();
  });

  it("rejects cross-origin requests even in development", async () => {
    mockGetAppEnv.mockReturnValue("development");
    mockHeaders.mockResolvedValue(
      headerBag({
        origin: "http://evil.example",
        host: "localhost:3001",
      }),
    );

    const { assertSameOriginMutationRequest } = await import(
      "@/shared/security/request-origin"
    );
    await expect(assertSameOriginMutationRequest()).rejects.toThrow(
      "Cross-origin request rejected",
    );
  });

  it("allows configured ALLOWED_APP_ORIGIN in production", async () => {
    mockGetAppEnv.mockReturnValue("production");
    vi.stubEnv("ALLOWED_APP_ORIGIN", "https://vaad-click-stable.vercel.app");
    vi.stubEnv("VERCEL_URL", "vaad-click-deploy123.vercel.app");
    mockHeaders.mockResolvedValue(
      headerBag({
        origin: "https://vaad-click-stable.vercel.app",
      }),
    );

    const { assertSameOriginMutationRequest } = await import(
      "@/shared/security/request-origin"
    );
    await expect(assertSameOriginMutationRequest()).resolves.toBeUndefined();
  });

  it("rejects unconfigured vercel alias in production", async () => {
    mockGetAppEnv.mockReturnValue("production");
    vi.stubEnv("ALLOWED_APP_ORIGIN", "https://vaad-click-stable.vercel.app");
    vi.stubEnv("VERCEL_URL", "vaad-click-deploy123.vercel.app");
    mockHeaders.mockResolvedValue(
      headerBag({
        origin: "https://vaad-click-other.vercel.app",
      }),
    );

    const { assertSameOriginMutationRequest } = await import(
      "@/shared/security/request-origin"
    );
    await expect(assertSameOriginMutationRequest()).rejects.toThrow(
      "Cross-origin request rejected",
    );
  });

  it("rejects missing Origin and Referer", async () => {
    mockGetAppEnv.mockReturnValue("production");
    vi.stubEnv("ALLOWED_APP_ORIGIN", "https://vaad-click-stable.vercel.app");
    mockHeaders.mockResolvedValue(headerBag({}));

    const { assertSameOriginMutationRequest } = await import(
      "@/shared/security/request-origin"
    );
    await expect(assertSameOriginMutationRequest()).rejects.toThrow(
      "Cross-origin request rejected",
    );
  });

  it("does not trust x-forwarded-host in production", async () => {
    mockGetAppEnv.mockReturnValue("production");
    vi.stubEnv("ALLOWED_APP_ORIGIN", "https://vaad-click-stable.vercel.app");
    mockHeaders.mockResolvedValue(
      headerBag({
        "x-forwarded-host": "evil.example",
        host: "evil.example",
      }),
    );

    const { assertSameOriginMutationRequest } = await import(
      "@/shared/security/request-origin"
    );
    await expect(assertSameOriginMutationRequest()).rejects.toThrow(
      "Cross-origin request rejected",
    );
  });

  it("allows canonical SITE_URL origin in production", async () => {
    mockGetAppEnv.mockReturnValue("production");
    mockHeaders.mockResolvedValue(
      headerBag({
        origin: "https://vaadclick.co.il",
      }),
    );

    const { assertSameOriginMutationRequest } = await import(
      "@/shared/security/request-origin"
    );
    await expect(assertSameOriginMutationRequest()).resolves.toBeUndefined();
  });

  it("allows VERCEL_URL deployment origin in production", async () => {
    mockGetAppEnv.mockReturnValue("production");
    vi.stubEnv("VERCEL_URL", "vaad-click-deploy123.vercel.app");
    mockHeaders.mockResolvedValue(
      headerBag({
        origin: "https://vaad-click-deploy123.vercel.app",
      }),
    );

    const { assertSameOriginMutationRequest } = await import(
      "@/shared/security/request-origin"
    );
    await expect(assertSameOriginMutationRequest()).resolves.toBeUndefined();
  });

  it("rejects arbitrary malicious origin in production", async () => {
    mockGetAppEnv.mockReturnValue("production");
    vi.stubEnv("ALLOWED_APP_ORIGIN", "https://vaad-click-stable.vercel.app");
    mockHeaders.mockResolvedValue(
      headerBag({
        origin: "https://attacker.example",
      }),
    );

    const { assertSameOriginMutationRequest } = await import(
      "@/shared/security/request-origin"
    );
    await expect(assertSameOriginMutationRequest()).rejects.toThrow(
      "Cross-origin request rejected",
    );
  });
});
