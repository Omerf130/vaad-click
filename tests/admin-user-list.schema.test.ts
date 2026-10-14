import { describe, expect, it } from "vitest";

import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import { parseAdminUserListSearchParams } from "@/modules/users/validation/admin-user-list.schema";

describe("parseAdminUserListSearchParams", () => {
  it("defaults view to all and page to 1", () => {
    const params = parseAdminUserListSearchParams({});
    expect(params.view).toBe("all");
    expect(params.page).toBe(1);
  });

  it("preserves search when role and status are empty form values (regression)", () => {
    const params = parseAdminUserListSearchParams({
      q: "ישראל",
      role: "",
      status: "",
      view: "all",
      page: "3",
    });
    expect(params.q).toBe("ישראל");
    expect(params.role).toBeUndefined();
    expect(params.status).toBeUndefined();
    expect(params.page).toBe(3);
  });

  it("parses Hebrew and Latin search terms", () => {
    const params = parseAdminUserListSearchParams({
      q: "Cohen כהן",
      role: "",
      status: "",
    });
    expect(params.q).toBe("Cohen כהן");
  });

  it("parses filters and pending view", () => {
    const params = parseAdminUserListSearchParams({
      q: "cohen",
      role: UserRole.BUILDING_REP,
      status: AccountStatus.ACTIVE,
      view: "pending",
      page: "2",
    });
    expect(params.q).toBe("cohen");
    expect(params.role).toBe(UserRole.BUILDING_REP);
    expect(params.status).toBe(AccountStatus.ACTIVE);
    expect(params.view).toBe("pending");
    expect(params.page).toBe(2);
  });
});
