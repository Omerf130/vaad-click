import { beforeEach, describe, expect, it, vi } from "vitest";

import { UserRole } from "@/modules/users/domain/user-role";
import { SessionAuthStage } from "@/modules/auth/domain/session-types";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { AuditEventType } from "@/shared/audit/domain/audit-event-taxonomy";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";

const mockWriteMandatory = vi.fn();

vi.mock("@/modules/audit/services/audit-writer.service", () => ({
  writeAuditEventMandatory: (...args: unknown[]) => mockWriteMandatory(...args),
}));

const context: AuthenticatedContext = {
  user: {
    id: "507f1f77bcf86cd799439011",
    fullName: "Lawyer",
    email: "lawyer@example.com",
    role: UserRole.LAWYER_ADMIN,
    accountStatus: AccountStatus.ACTIVE,
  },
  session: {
    userId: "507f1f77bcf86cd799439011",
    authStage: SessionAuthStage.MFA_COMPLETE,
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
  },
};

const session = { id: "mongo-session" };

describe("financial settings audit recording", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteMandatory.mockResolvedValue({ eventId: "evt-1" });
  });

  it("uses mandatory audit with session for draft creation", async () => {
    const { recordFinancialSettingsDraftCreated } = await import(
      "@/modules/audit/services/financial-settings-audit.service"
    );
    await recordFinancialSettingsDraftCreated({
      settingsVersionId: "ver-1",
      revision: 1,
      context,
      session: session as never,
    });

    expect(mockWriteMandatory).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: AuditEventType.SYSTEM_CONFIG_FINANCIAL_SETTINGS_DRAFT_CREATED,
      }),
      { session },
    );
  });

  it("uses mandatory audit with session for publication", async () => {
    const { recordFinancialSettingsVersionPublished } = await import(
      "@/modules/audit/services/financial-settings-audit.service"
    );
    await recordFinancialSettingsVersionPublished({
      settingsVersionId: "ver-1",
      versionNumber: 2,
      effectiveFromIso: "2030-01-01",
      revision: 3,
      context,
      session: session as never,
    });

    expect(mockWriteMandatory).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: AuditEventType.SYSTEM_CONFIG_FINANCIAL_SETTINGS_VERSION_PUBLISHED,
        metadata: expect.objectContaining({ versionNumber: 2 }),
      }),
      { session },
    );
  });
});
