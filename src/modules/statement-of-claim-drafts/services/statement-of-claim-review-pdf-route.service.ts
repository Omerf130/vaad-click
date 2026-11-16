import "server-only";

import { z } from "zod";

import { assertLawyerAdminDebtCaseReview } from "@/modules/debt-cases/services/debt-case-authorization.service";
import { getDebtCase } from "@/modules/debt-cases/services/debt-case.service";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import type { StatementOfClaimDraftContentSnapshot } from "@/modules/statement-of-claim-drafts/domain/statement-of-claim-draft-content-snapshot.types";
import { StatementOfClaimDraft } from "@/modules/statement-of-claim-drafts/infra/statement-of-claim-draft.model";
import { generateStatementOfClaimReviewPdfBuffer } from "@/modules/statement-of-claim-drafts/pdf/statement-of-claim-pdf.service";
import {
  STATEMENT_OF_CLAIM_REVIEW_PDF_RESPONSE_HEADER,
  STATEMENT_OF_CLAIM_REVIEW_PDF_RESPONSE_HEADER_VALUE,
} from "@/modules/statement-of-claim-drafts/pdf/statement-of-claim-pdf.constants";
import {
  buildStatementOfClaimReviewPdfFilename,
  StatementOfClaimReviewPdfDisposition,
  type StatementOfClaimReviewPdfDisposition as DispositionType,
} from "@/modules/statement-of-claim-drafts/presentation/statement-of-claim-review-pdf-urls";
import {
  WarningLetterPdfError,
  WarningLetterPdfErrorCode,
} from "@/modules/warning-letters/pdf/warning-letter-pdf.errors";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { connectMongo } from "@/shared/db/connect";

export const STATEMENT_OF_CLAIM_REVIEW_PDF_MAX_BYTES = 20 * 1024 * 1024;

const debtCaseParamsSchema = z.object({
  debtCaseId: z.string().uuid(),
});

const reviewPdfQuerySchema = z.object({
  draftId: z.string().uuid(),
});

export function parseStatementOfClaimReviewPdfDisposition(
  searchParams: URLSearchParams,
): DispositionType {
  const raw = searchParams.get("disposition")?.trim().toLowerCase();
  if (raw === StatementOfClaimReviewPdfDisposition.ATTACHMENT) {
    return StatementOfClaimReviewPdfDisposition.ATTACHMENT;
  }
  return StatementOfClaimReviewPdfDisposition.INLINE;
}

export function buildStatementOfClaimReviewPdfResponseHeaders(input: {
  disposition: DispositionType;
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
  headers.set(STATEMENT_OF_CLAIM_REVIEW_PDF_RESPONSE_HEADER, STATEMENT_OF_CLAIM_REVIEW_PDF_RESPONSE_HEADER_VALUE);
  const dispositionType =
    input.disposition === StatementOfClaimReviewPdfDisposition.ATTACHMENT
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

export async function loadStatementOfClaimDraftSnapshotForReviewPdf(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
  draftId: string;
}): Promise<{ snapshot: StatementOfClaimDraftContentSnapshot; draftRevision: number; letterCaseReference: string }> {
  await assertLawyerAdminDebtCaseReview({ context: input.context });
  assertLawyerAdminOnly(input.context);
  await connectMongo();

  await getDebtCase({ context: input.context, debtCaseId: input.debtCaseId });

  const draft = await StatementOfClaimDraft.findOne({
    debtCaseId: input.debtCaseId,
    draftId: input.draftId,
  }).lean();

  if (!draft?.contentSnapshot) {
    throw new WarningLetterPdfError(WarningLetterPdfErrorCode.NOT_FOUND, "Draft not found");
  }

  const snapshot = draft.contentSnapshot as StatementOfClaimDraftContentSnapshot;
  if (!snapshot.developmentOnly) {
    throw new WarningLetterPdfError(
      WarningLetterPdfErrorCode.FORBIDDEN,
      "Only development drafts support review PDF",
    );
  }

  return {
    snapshot,
    draftRevision: draft.draftRevision,
    letterCaseReference: snapshot.letterCaseReference,
  };
}

export async function respondWithStatementOfClaimReviewPdf(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
  draftId: string;
  disposition: DispositionType;
}): Promise<Response> {
  const params = debtCaseParamsSchema.safeParse({ debtCaseId: input.debtCaseId });
  const query = reviewPdfQuerySchema.safeParse({ draftId: input.draftId });
  if (!params.success || !query.success) {
    throw new WarningLetterPdfError(WarningLetterPdfErrorCode.VALIDATION, "Invalid route parameters");
  }

  const loaded = await loadStatementOfClaimDraftSnapshotForReviewPdf({
    context: input.context,
    debtCaseId: params.data.debtCaseId,
    draftId: query.data.draftId,
  });

  const buffer = await generateStatementOfClaimReviewPdfBuffer({
    snapshot: loaded.snapshot,
    draftRevision: loaded.draftRevision,
  });

  if (buffer.length > STATEMENT_OF_CLAIM_REVIEW_PDF_MAX_BYTES) {
    throw new WarningLetterPdfError(
      WarningLetterPdfErrorCode.GENERATION_FAILED,
      "PDF exceeds size limit",
    );
  }

  const filename = buildStatementOfClaimReviewPdfFilename({
    letterCaseReference: loaded.letterCaseReference,
    draftRevision: loaded.draftRevision,
  });

  const headers = buildStatementOfClaimReviewPdfResponseHeaders({
    disposition: input.disposition,
    filename,
    byteLength: buffer.length,
  });

  return new Response(new Uint8Array(buffer), { status: 200, headers });
}