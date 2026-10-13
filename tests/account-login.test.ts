import { describe, expect, it } from "vitest";

import { AccountStatus } from "@/modules/users/domain/account-status";
import {
  accountLoginBlockMessage,
  getAccountLoginBlockReason,
  genericAuthenticationFailureMessage,
} from "@/shared/security/account-login";

describe("account login guards", () => {
  it("detects disabled and locked accounts", () => {
    expect(getAccountLoginBlockReason(AccountStatus.ACTIVE)).toBeNull();
    expect(getAccountLoginBlockReason(AccountStatus.DISABLED)).toBe("disabled");
    expect(getAccountLoginBlockReason(AccountStatus.LOCKED)).toBe("locked");
  });

  it("returns safe messages without leaking internals", () => {
    expect(genericAuthenticationFailureMessage()).not.toMatch(/mongodb/i);
    expect(accountLoginBlockMessage("disabled")).toContain("פעיל");
  });
});
