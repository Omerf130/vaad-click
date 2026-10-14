import "server-only";

import type { DocumentAccessPolicy } from "@/modules/document-assets/domain/document-access-policy";
import {
  DocumentAssetError,
  DocumentAssetErrorCode,
} from "@/modules/document-assets/domain/document-asset-errors";
import { isDownloadableDocumentStatus } from "@/modules/document-assets/domain/document-asset-status";
import type { DocumentAssetDocument } from "@/modules/document-assets/infra/document-asset.model";
import { UserRole } from "@/modules/users/domain/user-role";
import { assertBuildingAccess } from "@/shared/auth/building-access/assert-building-access";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { BuildingScopeMode } from "@/shared/auth/building-access/building-access-scope.types";

export const DocumentAssetAccessIntent = {
  LIST: "list",
  READ: "read",
  UPLOAD: "upload",
  DELETE: "delete",
} as const;

export type DocumentAssetAccessIntent =
  (typeof DocumentAssetAccessIntent)[keyof typeof DocumentAssetAccessIntent];

export type DocumentAssetAuthorizationSubject = Pick<
  DocumentAssetDocument,
  "buildingId" | "classification" | "status" | "accessPolicy" | "deletedAt"
>;

function isLawyerAdmin(context: AuthenticatedContext): boolean {
  return context.user.role === UserRole.LAWYER_ADMIN;
}

function assignedScopeAllowsRead(input: {
  context: AuthenticatedContext;
  policy: DocumentAccessPolicy;
  intent: DocumentAssetAccessIntent;
}): boolean {
  if (input.policy.lawyerAdminOnlyRead) {
    return false;
  }
  if (input.intent === DocumentAssetAccessIntent.UPLOAD) {
    return (
      input.context.user.role === UserRole.BUILDING_REP &&
      input.policy.buildingOperatorsMayUpload
    );
  }
  if (
    input.context.user.role === UserRole.MANAGEMENT_COMPANY &&
    input.policy.managementCompanyMayView
  ) {
    return (
      input.intent === DocumentAssetAccessIntent.LIST ||
      input.intent === DocumentAssetAccessIntent.READ
    );
  }
  if (input.context.user.role === UserRole.BUILDING_REP && input.policy.buildingOperatorsMayUpload) {
    return (
      input.intent === DocumentAssetAccessIntent.LIST ||
      input.intent === DocumentAssetAccessIntent.READ
    );
  }
  return false;
}

export async function authorizeDocumentAssetAccess(input: {
  context: AuthenticatedContext;
  document: DocumentAssetAuthorizationSubject;
  intent: DocumentAssetAccessIntent;
  lawyerAdminBuildingWorkflow?: boolean;
}): Promise<void> {
  if (input.document.deletedAt) {
    throw new DocumentAssetError(DocumentAssetErrorCode.NOT_FOUND, "Document not found");
  }

  const { scope } = await assertBuildingAccess({
    context: input.context,
    buildingPublicId: input.document.buildingId,
  });

  if (isLawyerAdmin(input.context)) {
    if (input.lawyerAdminBuildingWorkflow || scope.mode === BuildingScopeMode.GLOBAL) {
      return;
    }
  }

  if (scope.mode === BuildingScopeMode.ASSIGNED) {
    if (assignedScopeAllowsRead({
      context: input.context,
      policy: input.document.accessPolicy,
      intent: input.intent,
    })) {
      return;
    }
  }

  throw new DocumentAssetError(DocumentAssetErrorCode.FORBIDDEN, "Document access denied");
}

export function assertDocumentReadableByStatus(
  status: DocumentAssetAuthorizationSubject["status"],
): void {
  if (!isDownloadableDocumentStatus(status)) {
    throw new DocumentAssetError(
      DocumentAssetErrorCode.VALIDATION,
      "Document is not available for download",
    );
  }
}
