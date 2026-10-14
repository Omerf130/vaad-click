import { describe, expect, it } from "vitest";

import { UserRole } from "@/modules/users/domain/user-role";
import { parseAdminUserListSearchParams } from "@/modules/users/validation/admin-user-list.schema";

describe("admin user list search + filter integration (params → query intent)", () => {
  it("combines text search with role filter after normalization", () => {
    const params = parseAdminUserListSearchParams({
      q: "demo@example.com",
      role: UserRole.MANAGEMENT_COMPANY,
      status: "",
      page: "1",
    });
    expect(params.q).toBe("demo@example.com");
    expect(params.role).toBe(UserRole.MANAGEMENT_COMPANY);
    expect(params.page).toBe(1);
  });

  it("pending view ignores empty status select", () => {
    const params = parseAdminUserListSearchParams({
      view: "pending",
      status: "",
      q: "test",
    });
    expect(params.view).toBe("pending");
    expect(params.status).toBeUndefined();
    expect(params.q).toBe("test");
  });
});
