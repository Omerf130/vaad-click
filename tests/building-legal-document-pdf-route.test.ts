import { beforeEach, describe, expect, it, vi } from "vitest";

import { SessionAuthStage } from "@/modules/auth/domain/session-types";
import {
  BuildingLegalDocumentError,
  BuildingLegalDocumentErrorCode,
} from "@/modules/building-legal-documents/domain/building-legal-document-errors";
import { BuildingLegalDocumentStatus } from "@/modules/building-legal-documents/domain/building-legal-document-status";
import {
  BuildingLegalDocumentPdfDisposition,
  buildBuildingLegalDocumentPdfFilename,
  buildBuildingLegalDocumentPdfResponseHeaders,
  parseBuildingLegalDocumentPdfDisposition,
  respondWithBuildingLegalDocumentPdf,
} from "@/modules/building-legal-documents/services/building-legal-document-pdf-route.service";
import { LegalDocumentTemplateCategory } from "@/modules/legal-document-templates/domain/legal-document-template-category";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { AuditEventType } from "@/shared/audit/domain/audit-event-taxonomy";

const BUILDING_A = "11111111-1111-4111-8111-111111111111";
const BUILDING_B = "22222222-2222-4222-8222-222222222222";
const DOC_ID = "33333333-3333-4333-8333-333333333333";

const mockPreview = vi.fn();
const mockGeneratePdf = vi.fn();
const mockWriteAudit = vi.fn();
const mockAssertBuildingAccess = vi.fn();
const mockDocFindOne = vi.fn();
const mockUserFind = vi.fn();
const mockAssertLawyerAdminOrg = vi.fn();

vi.mock("@/shared/db/connect", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/modules/building-legal-documents/infra/building-legal-document.model", () => ({
  BuildingLegalDocument: {
    findOne: (...args: unknown[]) => mockDocFindOne(...args),
    updateOne: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("@/modules/users/infra/user.model", () => ({
  User: {
    find: (...args: unknown[]) => mockUserFind(...args),
  },
}));

vi.mock("@/shared/auth/building-access/assert-building-access", () => ({
  assertBuildingAccess: (...args: unknown[]) => mockAssertBuildingAccess(...args),
}));

vi.mock("@/modules/organizations/services/assert-lawyer-admin", () => ({
  assertLawyerAdminOrganization: (...args: unknown[]) => mockAssertLawyerAdminOrg(...args),
}));

vi.mock("@/modules/building-legal-documents/services/building-legal-document.service", () => ({
  getBuildingLegalDocumentPreview: (...args: unknown[]) => mockPreview(...args),
}));

vi.mock("@/modules/building-legal-documents/pdf/building-legal-document-pdf.service", () => ({
  buildingLegalDocumentPdfInputFromPreview: (preview: unknown) => preview,
  generateBuildingLegalDocumentPdfBuffer: (...args: unknown[]) => mockGeneratePdf(...args),
}));

vi.mock("@/modules/audit/services/audit-writer.service", () => ({
  writeAuditEvent: (...args: unknown[]) => mockWriteAudit(...args),
}));

vi.mock("@/modules/audit/services/audit-correlation", () => ({
  resolveAuditCorrelationId: vi.fn().mockResolvedValue("corr-test"),
}));

const lawyerContext: AuthenticatedContext = {
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

const repContext: AuthenticatedContext = {
  ...lawyerContext,
  user: { ...lawyerContext.user, role: UserRole.BUILDING_REP },
};

const mgmtContext: AuthenticatedContext = {
  ...lawyerContext,
  user: { ...lawyerContext.user, role: UserRole.MANAGEMENT_COMPANY },
};

const pendingContext: AuthenticatedContext = {
  ...repContext,
  user: { ...repContext.user, accountStatus: AccountStatus.PENDING_APPROVAL },
};

function previewView(overrides: Partial<{ buildingId: string; status: string; snapshot: string }> = {}) {
  return {
    buildingLegalDocumentId: DOC_ID,
    buildingId: BUILDING_A,
    category: LegalDocumentTemplateCategory.DECLARATION,
    templateRevisionNumber: 1,
    status: overrides.status ?? BuildingLegalDocumentStatus.GENERATED_PENDING_SIGNATURE,
    uiStatus: BuildingLegalDocumentStatus.GENERATED_PENDING_SIGNATURE,
    createdAtIso: "2026-01-15T10:00:00.000Z",
    supersededAtIso: null,
    generatedByFullName: "Lawyer",
    titleHe: "הצהרה",
    renderedContentSnapshot: overrides.snapshot ?? "immutable snapshot marker",
  };
}

describe("building legal document PDF route helpers", () => {
  it("parses attachment disposition only when requested", () => {
    expect(parseBuildingLegalDocumentPdfDisposition(new URLSearchParams())).toBe(
      BuildingLegalDocumentPdfDisposition.INLINE,
    );
    expect(
      parseBuildingLegalDocumentPdfDisposition(new URLSearchParams("disposition=attachment")),
    ).toBe(BuildingLegalDocumentPdfDisposition.ATTACHMENT);
  });

  it("builds safe filenames and response headers", () => {
    const filename = buildBuildingLegalDocumentPdfFilename({
      buildingLegalDocumentId: DOC_ID,
      category: LegalDocumentTemplateCategory.FEE_AGREEMENT,
    });
    expect(filename).toBe(`vaad-legal-fee_agreement-${DOC_ID}.pdf`);

    const headers = buildBuildingLegalDocumentPdfResponseHeaders({
      disposition: BuildingLegalDocumentPdfDisposition.INLINE,
      filename,
      byteLength: 128,
    });
    expect(headers.get("Content-Type")).toBe("application/pdf");
    expect(headers.get("Cache-Control")).toBe("private, no-store");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Content-Disposition")).toContain("inline");
    expect(headers.get("X-Frame-Options")).toBe("SAMEORIGIN");

    const attachmentHeaders = buildBuildingLegalDocumentPdfResponseHeaders({
      disposition: BuildingLegalDocumentPdfDisposition.ATTACHMENT,
      filename,
      byteLength: 128,
    });
    expect(attachmentHeaders.get("Content-Disposition")).toContain("attachment");
  });
});

describe("respondWithBuildingLegalDocumentPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertLawyerAdminOrg.mockImplementation(() => undefined);
    mockAssertBuildingAccess.mockResolvedValue(undefined);
    mockPreview.mockResolvedValue(previewView());
    mockGeneratePdf.mockResolvedValue(Buffer.from("%PDF-1.4 test"));
  });

  it("returns 401 without session", async () => {
    const response = await respondWithBuildingLegalDocumentPdf({
      context: null,
      buildingId: BUILDING_A,
      documentId: DOC_ID,
      disposition: BuildingLegalDocumentPdfDisposition.INLINE,
      audience: "lawyer_admin",
    });
    expect(response.status).toBe(401);
  });

  it("allows lawyer admin inline PDF with audit view event", async () => {
    const response = await respondWithBuildingLegalDocumentPdf({
      context: lawyerContext,
      buildingId: BUILDING_A,
      documentId: DOC_ID,
      disposition: BuildingLegalDocumentPdfDisposition.INLINE,
      audience: "lawyer_admin",
    });

    expect(response.status).toBe(200);
    const body = Buffer.from(await response.arrayBuffer());
    expect(body.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    expect(response.headers.get("Content-Disposition")).toContain("inline");
    expect(mockPreview).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedBuildingId: BUILDING_A,
        portalActiveOnly: false,
      }),
    );
    expect(mockGeneratePdf).toHaveBeenCalledWith(
      expect.objectContaining({ renderedContentSnapshot: "immutable snapshot marker" }),
    );
    expect(mockWriteAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: AuditEventType.LEGAL_DOCUMENT_BUILDING_INSTANCE_PDF_VIEWED,
      }),
      expect.any(Object),
    );
  });

  it("records download audit for attachment disposition", async () => {
    await respondWithBuildingLegalDocumentPdf({
      context: lawyerContext,
      buildingId: BUILDING_A,
      documentId: DOC_ID,
      disposition: BuildingLegalDocumentPdfDisposition.ATTACHMENT,
      audience: "lawyer_admin",
    });

    expect(mockWriteAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: AuditEventType.LEGAL_DOCUMENT_BUILDING_INSTANCE_PDF_DOWNLOADED,
      }),
      expect.any(Object),
    );
  });

  it("allows superseded documents for lawyer admin", async () => {
    mockPreview.mockResolvedValue(
      previewView({ status: BuildingLegalDocumentStatus.SUPERSEDED }),
    );

    const response = await respondWithBuildingLegalDocumentPdf({
      context: lawyerContext,
      buildingId: BUILDING_A,
      documentId: DOC_ID,
      disposition: BuildingLegalDocumentPdfDisposition.INLINE,
      audience: "lawyer_admin",
    });
    expect(response.status).toBe(200);
  });

  it("allows building rep and management company on portal route", async () => {
    for (const context of [repContext, mgmtContext]) {
      const response = await respondWithBuildingLegalDocumentPdf({
        context,
        buildingId: BUILDING_A,
        documentId: DOC_ID,
        disposition: BuildingLegalDocumentPdfDisposition.INLINE,
        audience: "portal",
      });
      expect(response.status).toBe(200);
    }
    expect(mockPreview).toHaveBeenCalledWith(
      expect.objectContaining({ portalActiveOnly: true }),
    );
  });

  it("denies portal superseded documents and cross-building access", async () => {
    mockPreview.mockRejectedValueOnce(
      new BuildingLegalDocumentError(
        BuildingLegalDocumentErrorCode.FORBIDDEN,
        "Historical document not available in portal",
      ),
    );
    const superseded = await respondWithBuildingLegalDocumentPdf({
      context: repContext,
      buildingId: BUILDING_A,
      documentId: DOC_ID,
      disposition: BuildingLegalDocumentPdfDisposition.INLINE,
      audience: "portal",
    });
    expect(superseded.status).toBe(404);

    mockPreview.mockRejectedValueOnce(
      new BuildingLegalDocumentError(BuildingLegalDocumentErrorCode.FORBIDDEN, "Building mismatch"),
    );
    const cross = await respondWithBuildingLegalDocumentPdf({
      context: lawyerContext,
      buildingId: BUILDING_B,
      documentId: DOC_ID,
      disposition: BuildingLegalDocumentPdfDisposition.INLINE,
      audience: "lawyer_admin",
    });
    expect(cross.status).toBe(404);
  });

  it("denies pending accounts and invalid ids without leaking content", async () => {
    const pending = await respondWithBuildingLegalDocumentPdf({
      context: pendingContext,
      buildingId: BUILDING_A,
      documentId: DOC_ID,
      disposition: BuildingLegalDocumentPdfDisposition.INLINE,
      audience: "portal",
    });
    expect(pending.status).toBe(404);
    expect(mockPreview).not.toHaveBeenCalled();

    const invalid = await respondWithBuildingLegalDocumentPdf({
      context: lawyerContext,
      buildingId: BUILDING_A,
      documentId: "not-a-uuid",
      disposition: BuildingLegalDocumentPdfDisposition.INLINE,
      audience: "lawyer_admin",
    });
    expect(invalid.status).toBe(404);

    mockPreview.mockRejectedValueOnce(
      new BuildingLegalDocumentError(
        BuildingLegalDocumentErrorCode.DOCUMENT_NOT_FOUND,
        "missing",
      ),
    );
    const missing = await respondWithBuildingLegalDocumentPdf({
      context: lawyerContext,
      buildingId: BUILDING_A,
      documentId: DOC_ID,
      disposition: BuildingLegalDocumentPdfDisposition.INLINE,
      audience: "lawyer_admin",
    });
    expect(missing.status).toBe(404);
    expect(String(missing)).not.toContain("immutable");
  });

  it("does not persist PDF output", async () => {
    const { BuildingLegalDocument } = await import(
      "@/modules/building-legal-documents/infra/building-legal-document.model"
    );
    await respondWithBuildingLegalDocumentPdf({
      context: lawyerContext,
      buildingId: BUILDING_A,
      documentId: DOC_ID,
      disposition: BuildingLegalDocumentPdfDisposition.INLINE,
      audience: "lawyer_admin",
    });
    expect(BuildingLegalDocument.updateOne).not.toHaveBeenCalled();
    expect(BuildingLegalDocument.create).not.toHaveBeenCalled();
  });
});
