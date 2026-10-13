export const UserRole = {
  LAWYER_ADMIN: "lawyer_admin",
  BUILDING_REP: "building_rep",
  MANAGEMENT_COMPANY: "management_company",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const USER_ROLES: readonly UserRole[] = Object.values(UserRole);

export function isUserRole(value: string): value is UserRole {
  return (USER_ROLES as readonly string[]).includes(value);
}

/** Roles that may only be assigned by an existing lawyer administrator (CP6 expands provisioning). */
export function isPrivilegedRole(role: UserRole): boolean {
  return role === UserRole.LAWYER_ADMIN;
}
