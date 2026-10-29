import "server-only";

import { z } from "zod";

import {
  BuildingLegalDocumentPdfError,
  BuildingLegalDocumentPdfErrorCode,
} from "@/modules/building-legal-documents/pdf/building-legal-document-pdf.errors";
import {
  buildingLegalDocumentPdfInputFromPreview,
  generateBuildingLegalDocumentPdfBuffer,
} from "@/modules/building-legal-documents/pdf/building-legal-document-pdf.service";
import {
  recordBuildingLegalDocumentPdfDownloaded,
  recordBuildingLegalDocumentPdfViewed,
} from "@/modules/building-legal-documents/services/building-legal-document-audit.service";
import {
  BuildingLegalDocumentError,
  BuildingLegalDocumentErrorCode,
} from "@/modules/building-legal-documents/domain/building-legal-document-errors";
import { getBuildingLegalDocumentPreview } from "@/modules/building-legal-documents/services/building-legal-document.service";
import { assertLawyerAdminOrganization } from "@/modules/organizations/services/assert-lawyer-admin";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import { resolveAuditCorrelationId } from "@/modules/audit/services/audit-correlation";
import { canAccessOperationalPortal } from "@/shared/auth/account-portal-access";
import { sessionGrantsAccess } from "@/shared/auth/access-policy";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { isProduction } from "@/shared/config/env.server";

/** Upper bound for generated PDF bytes (snapshot text max 200k — PDF stays well below this). */
export const BUILDING_LEGAL_DOCUMENT_PDF_MAX_BYTES = 20 * 1024 * 1024;

export const BuildingLegalDocumentPdfDisposition = {
  INLINE: "inline",
  ATTACHMENT: "attachment",
} as const;

export type BuildingLegalDocumentPdfDisposition =
  (typeof BuildingLegalDocumentPdfDisposition)[keyof typeof BuildingLegalDocumentPdfDisposition];

const routeParamsSchema = z.object({
  buildingId: z.string().uuid(),
  documentId: z.string().uuid(),
});

export function parseBuildingLegalDocumentPdfDisposition(
  searchParams: URLSearchParams,
): BuildingLegalDocumentPdfDisposition {
  const raw = searchParams.get("disposition")?.trim().toLowerCase();
  if (raw === BuildingLegalDocumentPdfDisposition.ATTACHMENT) {
    return BuildingLegalDocumentPdfDisposition.ATTACHMENT;
  }
  return BuildingLegalDocumentPdfDisposition.INLINE;
}

export function buildBuildingLegalDocumentPdfFilename(input: {
  buildingLegalDocumentId: string;
  category: string;
}): string {
  const safeCategory = input.category.replace(/[^a-z0-9_]/gi, "");
  return `vaad-legal-${safeCategory}-${input.buildingLegalDocumentId}.pdf`;
}

export function buildBuildingLegalDocumentPdfResponseHeaders(input: {
  disposition: BuildingLegalDocumentPdfDisposition;
  filename: string;
  byteLength: number;
}): Headers {
  const headers = new Headers();
  headers.set("Content-Type", "application/pdf");
  headers.set("Content-Length", String(input.byteLength));
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "same-origin");
  headers.set("X-Frame-Options", "SAMEORIGIN");
  headers.set("Content-Security-Policy", "frame-ancestors 'self'");
  const dispositionType =
    input.disposition === BuildingLegalDocumentPdfDisposition.ATTACHMENT
      ? "attachment"
      : "inline";
  headers.set(
    "Content-Disposition",
    `${dispositionType}; filename="${input.filename.replace(/"/g, "")}"`,
  );
  return headers;
}

function assertLawyerAdminPdfAccess(context: AuthenticatedContext): void {
  if (context.user.role !== UserRole.LAWYER_ADMIN) {
    throw new BuildingLegalDocumentError(
      BuildingLegalDocumentErrorCode.FORBIDDEN,
      "Role mismatch",
    );
  }
  if (context.user.accountStatus !== AccountStatus.ACTIVE) {
    throw new BuildingLegalDocumentError(
      BuildingLegalDocumentErrorCode.FORBIDDEN,
      "Account not operational",
    );
  }
  const allowed = sessionGrantsAccess({
    session: context.session,
    userRole: context.user.role,
    surface: "development_portal",
    isProductionEnvironment: isProduction(),
    userId: context.user.id,
    accountStatus: context.user.accountStatus,
  });
  if (!allowed) {
    throw new BuildingLegalDocumentError(
      BuildingLegalDocumentErrorCode.FORBIDDEN,
      "MFA required",
    );
  }
  try {
    assertLawyerAdminOrganization(context);
  } catch {
    throw new BuildingLegalDocumentError(
      BuildingLegalDocumentErrorCode.FORBIDDEN,
      "Lawyer admin required",
    );
  }
}

function assertPortalPdfAccess(context: AuthenticatedContext): void {
  if (!canAccessOperationalPortal(context)) {
    throw new BuildingLegalDocumentError(
      BuildingLegalDocumentErrorCode.FORBIDDEN,
      "Account not operational",
    );
  }
  if (context.user.role === UserRole.LAWYER_ADMIN) {
    throw new BuildingLegalDocumentError(
      BuildingLegalDocumentErrorCode.FORBIDDEN,
      "Use admin PDF route",
    );
  }
  const allowed = sessionGrantsAccess({
    session: context.session,
    userRole: context.user.role,
    surface: "development_portal",
    isProductionEnvironment: isProduction(),
    userId: context.user.id,
    accountStatus: context.user.accountStatus,
  });
  if (!allowed) {
    throw new BuildingLegalDocumentError(
      BuildingLegalDocumentErrorCode.FORBIDDEN,
      "MFA required",
    );
  }
}

export async function respondWithBuildingLegalDocumentPdf(input: {
  context: AuthenticatedContext | null;
  buildingId: string;
  documentId: string;
  disposition: BuildingLegalDocumentPdfDisposition;
  audience: "lawyer_admin" | "portal";
}): Promise<Response> {
  if (!input.context) {
    return new Response(null, { status: 401 });
  }

  const parsedParams = routeParamsSchema.safeParse({
    buildingId: input.buildingId,
    documentId: input.documentId,
  });
  if (!parsedParams.success) {
    return new Response(null, { status: 404 });
  }

  try {
    if (input.audience === "lawyer_admin") {
      assertLawyerAdminPdfAccess(input.context);
    } else {
      assertPortalPdfAccess(input.context);
    }

    const preview = await getBuildingLegalDocumentPreview({
      context: input.context,
      buildingLegalDocumentId: parsedParams.data.documentId,
      expectedBuildingId: parsedParams.data.buildingId,
      portalActiveOnly: input.audience === "portal",
    });

    const pdfInput = buildingLegalDocumentPdfInputFromPreview(preview);
    const buffer = await generateBuildingLegalDocumentPdfBuffer(pdfInput);

    if (buffer.byteLength > BUILDING_LEGAL_DOCUMENT_PDF_MAX_BYTES) {
      throw new BuildingLegalDocumentPdfError(
        BuildingLegalDocumentPdfErrorCode.GENERATION_FAILED,
        "PDF exceeds size limit.",
      );
    }

    const correlationId = await resolveAuditCorrelationId();
    const auditPayload = {
      context: input.context,
      buildingId: preview.buildingId,
      buildingLegalDocumentId: preview.buildingLegalDocumentId,
      category: preview.category,
      correlationId,
    };

    if (input.disposition === BuildingLegalDocumentPdfDisposition.ATTACHMENT) {
      await recordBuildingLegalDocumentPdfDownloaded(auditPayload);
    } else {
      await recordBuildingLegalDocumentPdfViewed(auditPayload);
    }

    const filename = buildBuildingLegalDocumentPdfFilename({
      buildingLegalDocumentId: preview.buildingLegalDocumentId,
      category: preview.category,
    });

    const headers = buildBuildingLegalDocumentPdfResponseHeaders({
      disposition: input.disposition,
      filename,
      byteLength: buffer.byteLength,
    });

    return new Response(new Uint8Array(buffer), { status: 200, headers });
  } catch (error) {
    if (error instanceof BuildingLegalDocumentPdfError) {
      if (error.code === BuildingLegalDocumentPdfErrorCode.GENERATION_FAILED) {
        return new Response(null, { status: 413 });
      }
      return new Response(null, { status: 404 });
    }
    if (error instanceof BuildingLegalDocumentError) {
      return new Response(null, { status: 404 });
    }
    return new Response(null, { status: 500 });
  }
}
