import "server-only";

import { z } from "zod";

import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import { DebtCaseError, DebtCaseErrorCode } from "@/modules/debt-cases/domain/debt-case-errors";
import { assertLawyerAdminDebtCaseReview } from "@/modules/debt-cases/services/debt-case-authorization.service";
import { getDebtCase } from "@/modules/debt-cases/services/debt-case.service";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import { WarningLetterDraft } from "@/modules/warning-letters/infra/warning-letter-draft.model";
import { generateWarningLetterReviewPdfBuffer } from "@/modules/warning-letters/pdf/warning-letter-pdf.service";
import {
  WARNING_LETTER_REVIEW_PDF_RESPONSE_HEADER,
  WARNING_LETTER_REVIEW_PDF_RESPONSE_HEADER_VALUE,
} from "@/modules/warning-letters/pdf/warning-letter-pdf.constants";
import {
  WarningLetterPdfError,
  WarningLetterPdfErrorCode,
} from "@/modules/warning-letters/pdf/warning-letter-pdf.errors";
import {
  WarningLetterReviewPdfDisposition,
  buildWarningLetterReviewPdfFilename,
  type WarningLetterReviewPdfDisposition as WarningLetterReviewPdfDispositionType,
} from "@/modules/warning-letters/presentation/warning-letter-review-pdf-urls";
import type { WarningLetterContentSnapshot } from "@/modules/warning-letters/snapshot/warning-letter-snapshot.types";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { connectMongo } from "@/shared/db/connect";

export const WARNING_LETTER_REVIEW_PDF_MAX_BYTES = 20 * 1024 * 1024;

const debtCaseParamsSchema = z.object({
  debtCaseId: z.string().uuid(),
});

const reviewPdfQuerySchema = z.object({
  draftId: z.string().uuid(),
});

export function parseWarningLetterReviewPdfDisposition(
  searchParams: URLSearchParams,
): WarningLetterReviewPdfDispositionType {
  const raw = searchParams.get("disposition")?.trim().toLowerCase();
  if (raw === WarningLetterReviewPdfDisposition.ATTACHMENT) {
    return WarningLetterReviewPdfDisposition.ATTACHMENT;
  }
  return WarningLetterReviewPdfDisposition.INLINE;
}

export function buildWarningLetterReviewPdfResponseHeaders(input: {
  disposition: WarningLetterReviewPdfDispositionType;
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
  headers.set(WARNING_LETTER_REVIEW_PDF_RESPONSE_HEADER, WARNING_LETTER_REVIEW_PDF_RESPONSE_HEADER_VALUE);
  const dispositionType =
    input.disposition === WarningLetterReviewPdfDisposition.ATTACHMENT
      ? "attachment"
      : "inline";
  headers.set(
    "Content-Disposition",
    `${dispositionType}; filename="${input.filename.replace(/"/g, "")}"`,
  );
  return headers;
}

function assertLawyerAdminOnly(context: AuthenticatedContext): void {
  if (context.user.role !== UserRole.LAWYER_ADMIN) {
    throw new WarningLetterPdfError(WarningLetterPdfErrorCode.FORBIDDEN, "Lawyer admin only");
  }
  if (context.user.accountStatus !== AccountStatus.ACTIVE) {
    throw new WarningLetterPdfError(WarningLetterPdfErrorCode.FORBIDDEN, "Account not operational");
  }
}

function mapDebtCaseError(error: unknown): never {
  if (error instanceof DebtCaseError) {
    if (error.code === DebtCaseErrorCode.FORBIDDEN) {
      throw new WarningLetterPdfError(WarningLetterPdfErrorCode.FORBIDDEN, error.message);
    }
    if (error.code === DebtCaseErrorCode.NOT_FOUND) {
      throw new WarningLetterPdfError(WarningLetterPdfErrorCode.NOT_FOUND, error.message);
    }
  }
  throw error;
}

export async function loadWarningLetterDraftSnapshotForReviewPdf(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
  draftId: string;
}): Promise<{ snapshot: WarningLetterContentSnapshot; draftRevision: number; letterCaseReference: string }> {
  await assertLawyerAdminDebtCaseReview({ context: input.context });
  assertLawyerAdminOnly(input.context);
  await connectMongo();

  let debtCase;
  try {
    debtCase = await getDebtCase({
      context: input.context,
      debtCaseId: input.debtCaseId,
    });
  } catch (error) {
    mapDebtCaseError(error);
  }

  if (debtCase.lawyerReviewStatus !== DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP) {
    throw new WarningLetterPdfError(
      WarningLetterPdfErrorCode.FORBIDDEN,
      "Warning letter review PDF is available only after approval for letter preparation",
    );
  }

  const draft = await WarningLetterDraft.findOne({
    debtCaseId: input.debtCaseId,
    draftId: input.draftId,
  }).lean();

  if (!draft?.contentSnapshot) {
    throw new WarningLetterPdfError(WarningLetterPdfErrorCode.NOT_FOUND, "Draft not found");
  }

  return {
    snapshot: draft.contentSnapshot as WarningLetterContentSnapshot,
    draftRevision: draft.draftRevision,
    letterCaseReference: draft.letterCaseReference,
  };
}

export async function respondWithWarningLetterReviewPdf(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
  draftId: string;
  disposition: WarningLetterReviewPdfDispositionType;
}): Promise<Response> {
  const params = debtCaseParamsSchema.safeParse({ debtCaseId: input.debtCaseId });
  const query = reviewPdfQuerySchema.safeParse({ draftId: input.draftId });
  if (!params.success || !query.success) {
    throw new WarningLetterPdfError(WarningLetterPdfErrorCode.VALIDATION, "Invalid route parameters");
  }

  const loaded = await loadWarningLetterDraftSnapshotForReviewPdf({
    context: input.context,
    debtCaseId: params.data.debtCaseId,
    draftId: query.data.draftId,
  });

  const buffer = await generateWarningLetterReviewPdfBuffer({
    snapshot: loaded.snapshot,
    draftRevision: loaded.draftRevision,
  });

  if (buffer.length > WARNING_LETTER_REVIEW_PDF_MAX_BYTES) {
    throw new WarningLetterPdfError(
      WarningLetterPdfErrorCode.GENERATION_FAILED,
      "PDF exceeds size limit",
    );
  }

  const filename = buildWarningLetterReviewPdfFilename({
    letterCaseReference: loaded.letterCaseReference,
    draftRevision: loaded.draftRevision,
  });

  const headers = buildWarningLetterReviewPdfResponseHeaders({
    disposition: input.disposition,
    filename,
    byteLength: buffer.length,
  });

  return new Response(new Uint8Array(buffer), { status: 200, headers });
}