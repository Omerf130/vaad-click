import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import {
  PUBLIC_HEADER_NAV_DESTINATIONS,
  resolvePublicHeaderNavActions,
} from "@/shared/navigation/public-header-auth-nav";

function context(input: {
  role: UserRole;
  accountStatus: AccountStatus;
}): AuthenticatedContext {
  return {
    user: {
      id: "user-1",
      fullName: "Test User",
      email: "test@example.com",
      role: input.role,
      accountStatus: input.accountStatus,
    },
    session: {
      userId: "user-1",
      authStage: "mfa_complete",
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
    },
  } as AuthenticatedContext;
}

describe("public header auth navigation", () => {
  it("shows login and register for guests", () => {
    const actions = resolvePublicHeaderNavActions(null);
    expect(actions.map((action) => action.href)).toEqual([
      PUBLIC_HEADER_NAV_DESTINATIONS.login,
      PUBLIC_HEADER_NAV_DESTINATIONS.register,
    ]);
  });

  it("routes active building representatives to the operator dashboard", () => {
    const actions = resolvePublicHeaderNavActions(
      context({ role: UserRole.BUILDING_REP, accountStatus: AccountStatus.ACTIVE }),
    );
    expect(actions).toEqual([
      {
        href: PUBLIC_HEADER_NAV_DESTINATIONS.operatorDashboard,
        label: "מעבר לדשבורד",
        variant: "primary",
      },
    ]);
  });

  it("routes active management companies to the operator dashboard", () => {
    const actions = resolvePublicHeaderNavActions(
      context({
        role: UserRole.MANAGEMENT_COMPANY,
        accountStatus: AccountStatus.ACTIVE,
      }),
    );
    expect(actions[0]?.href).toBe(PUBLIC_HEADER_NAV_DESTINATIONS.operatorDashboard);
    expect(actions[0]?.label).toBe("מעבר לדשבורד");
  });

  it("routes active lawyer admins to the admin workspace", () => {
    const actions = resolvePublicHeaderNavActions(
      context({ role: UserRole.LAWYER_ADMIN, accountStatus: AccountStatus.ACTIVE }),
    );
    expect(actions).toEqual([
      {
        href: PUBLIC_HEADER_NAV_DESTINATIONS.lawyerAdmin,
        label: "ניהול משרד",
        variant: "primary",
      },
    ]);
  });

  it("routes pending accounts to account status instead of dashboard", () => {
    const actions = resolvePublicHeaderNavActions(
      context({
        role: UserRole.BUILDING_REP,
        accountStatus: AccountStatus.PENDING_APPROVAL,
      }),
    );
    expect(actions).toEqual([
      {
        href: PUBLIC_HEADER_NAV_DESTINATIONS.accountStatus,
        label: "מעקב אחר הרשמה",
        variant: "primary",
      },
    ]);
    expect(actions.some((action) => action.href === PUBLIC_HEADER_NAV_DESTINATIONS.register)).toBe(
      false,
    );
  });

  it("does not expose admin routes to operators", () => {
    const actions = resolvePublicHeaderNavActions(
      context({ role: UserRole.BUILDING_REP, accountStatus: AccountStatus.ACTIVE }),
    );
    expect(actions.some((action) => action.href.includes("/admin"))).toBe(false);
  });
});

describe("public header menu wiring", () => {
  it("passes auth actions from server header into client menu props", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/public/PublicHeader/PublicHeader.tsx"),
      "utf8",
    );
    expect(source).toMatch(/resolvePublicHeaderNavActions/);
    expect(source).toMatch(/authActions=\{authActions\}/);
  });

  it("renders mobile menu auth actions from props", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/public/PublicHeader/PublicHeaderMenu.tsx"),
      "utf8",
    );
    expect(source).toMatch(/authActions\.map/);
    expect(source).not.toMatch(/href="\/login"/);
  });
});
