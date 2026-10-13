import { UserRole, isPrivilegedRole } from "@/modules/users/domain/user-role";

export class RoleAssignmentError extends Error {
  readonly code = "ROLE_ASSIGNMENT_FORBIDDEN";

  constructor(message = "Role assignment is not permitted.") {
    super(message);
    this.name = "RoleAssignmentError";
  }
}

export type RoleAssignerContext = {
  /** Null represents self-registration or unauthenticated provisioning attempts. */
  assignerRole: UserRole | null;
};

/**
 * Ensures privileged roles cannot be self-assigned and only a lawyer admin may create another lawyer admin.
 * Public registration must remain disabled in CP3A — assignerRole null always fails for privileged roles.
 */
export function assertRoleAssignmentPermitted(
  requestedRole: UserRole,
  context: RoleAssignerContext,
): void {
  if (isPrivilegedRole(requestedRole)) {
    if (context.assignerRole !== UserRole.LAWYER_ADMIN) {
      throw new RoleAssignmentError();
    }
  }

  if (context.assignerRole === null) {
    throw new RoleAssignmentError("Self-service role assignment is not allowed.");
  }
}

/** Public self-registration may only create committee or management company accounts. */
export function assertPublicRegistrationRole(role: UserRole): void {
  if (role !== UserRole.BUILDING_REP && role !== UserRole.MANAGEMENT_COMPANY) {
    throw new RoleAssignmentError("Public registration role is not allowed.");
  }
}
