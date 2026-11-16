import "server-only";

import { z } from "zod";

import { WarningLetterFinalDocumentStatus } from "@/modules/warning-letters/domain/warning-letter-final-document-status";
import { assertLawyerAdminDebtCaseReview } from "@/modules/debt-cases/services/debt-case-authorization.service";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import { generateWarningLetterFinalPdfBuffer } from "@/modules/warning-letters/pdf/warning-letter-pdf.service";
import {
  WARNING_LETTER_FINAL_PDF_RESPONSE_HEADER_VALUE,
  WARNING_LETTER_REVIEW_PDF_RESPONSE_HEADER,
} from "@/modules/warning-letters/pdf/warning-letter-pdf.constants";
import {
  WarningLetterPdfError,
  WarningLetterPdfErrorCode,
} from "@/modules/warning-letters/pdf/warning-letter-pdf.errors";
import {
  WarningLetterFinalPdfDisposition,
  buildWarningLetterFinalPdfFilename,
  type WarningLetterFinalPdfDisposition as WarningLetterFinalPdfDispositionType,
} from "@/modules/warning-letters/presentation/warning-letter-final-pdf-urls";
import { loadWarningLetterFinalDocumentById } from "@/modules/warning-letters/services/warning-letter-finalization.service";
import {
  WARNING_LETTER_REVIEW_PDF_MAX_BYTES,
  buildWarningLetterReviewPdfResponseHeaders,
} from "@/modules/warning-letters/services/warning-letter-review-pdf-route.service";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";

const debtCaseParamsSchema = z.object({
  debtCaseId: z.string().uuid(),
});

const finalPdfQuerySchema = z.object({
  finalDocumentId: z.string().uuid(),
});

export function parseWarningLetterFinalPdfDisposition(
  searchParams: URLSearchParams,
): WarningLetterFinalPdfDispositionType {
  const raw = searchParams.get("disposition")?.trim().toLowerCase();
  if (raw === WarningLetterFinalPdfDisposition.ATTACHMENT) {
    return WarningLetterFinalPdfDisposition.ATTACHMENT;
  }
  return WarningLetterFinalPdfDisposition.INLINE;
}

export function buildWarningLetterFinalPdfResponseHeaders(input: {
  disposition: WarningLetterFinalPdfDispositionType;
  filename: string;
  byteLength: number;
}): Headers {
  const headers = buildWarningLetterReviewPdfResponseHeaders({
    disposition: input.disposition,
    filename: input.filename,
    byteLength: input.byteLength,
  });
  headers.set(WARNING_LETTER_REVIEW_PDF_RESPONSE_HEADER, WARNING_LETTER_FINAL_PDF_RESPONSE_HEADER_VALUE);
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

export async function respondWithWarningLetterFinalPdf(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
  finalDocumentId: string;
  disposition: WarningLetterFinalPdfDispositionType;
}): Promise<Response> {
  const params = debtCaseParamsSchema.safeParse({ debtCaseId: input.debtCaseId });
  const query = finalPdfQuerySchema.safeParse({ finalDocumentId: input.finalDocumentId });
  if (!params.success || !query.success) {
    throw new WarningLetterPdfError(WarningLetterPdfErrorCode.VALIDATION, "Invalid route parameters");
  }

  await assertLawyerAdminDebtCaseReview({ context: input.context });
  assertLawyerAdminOnly(input.context);

  const loaded = await loadWarningLetterFinalDocumentById({
    debtCaseId: params.data.debtCaseId,
    finalDocumentId: query.data.finalDocumentId,
  });

  if (!loaded) {
    throw new WarningLetterPdfError(WarningLetterPdfErrorCode.NOT_FOUND, "Final document not found");
  }

  if (loaded.status !== WarningLetterFinalDocumentStatus.READY_FOR_DELIVERY) {
    throw new WarningLetterPdfError(
      WarningLetterPdfErrorCode.FORBIDDEN,
      "Final PDF unavailable — document not ready",
    );
  }

  const buffer = await generateWarningLetterFinalPdfBuffer({
    snapshot: loaded.snapshot,
    draftRevision: loaded.draftRevision,
  });

  if (buffer.length > WARNING_LETTER_REVIEW_PDF_MAX_BYTES) {
    throw new WarningLetterPdfError(
      WarningLetterPdfErrorCode.GENERATION_FAILED,
      "PDF exceeds size limit",
    );
  }

  const filename = buildWarningLetterFinalPdfFilename({
    letterCaseReference: loaded.snapshot.letterCaseReference,
    draftRevision: loaded.draftRevision,
  });

  const headers = buildWarningLetterFinalPdfResponseHeaders({
    disposition: input.disposition,
    filename,
    byteLength: buffer.length,
  });

  return new Response(new Uint8Array(buffer), { status: 200, headers });
}