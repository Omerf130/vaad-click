import { beforeEach, describe, expect, it, vi } from "vitest";

const mockHeaders = vi.fn();

vi.mock("next/headers", () => ({
  headers: () => mockHeaders(),
}));

vi.mock("@/shared/config/env.server", () => ({
  getAppEnv: () => "development",
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
  });

  it("allows origin matching development Host when port is not 3000", async () => {
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
});
