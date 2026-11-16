"use server";

import { revalidatePath } from "next/cache";

import { resolveAuditCorrelationId } from "@/modules/audit/services/audit-correlation";
import { DebtCaseError } from "@/modules/debt-cases/domain/debt-case-errors";
import { mapLawyerDebtCaseReviewActionError } from "@/modules/debt-cases/presentation/lawyer-debt-case-review-error-map";
import {
  StatementOfClaimDraftError,
} from "@/modules/statement-of-claim-drafts/domain/statement-of-claim-draft-errors";
import { formatStatementOfClaimDraftErrorHe } from "@/modules/statement-of-claim-drafts/presentation/statement-of-claim-draft-messages.he";
import { generateDevelopmentStatementOfClaimDraft } from "@/modules/statement-of-claim-drafts/services/statement-of-claim-draft.service";
import { saveStatementOfClaimDraftSectionEdits } from "@/modules/statement-of-claim-drafts/services/statement-of-claim-draft-edit.service";
import type { StatementOfClaimTemplateSectionId } from "@/modules/statement-of-claim-templates/domain/statement-of-claim-template-section";
import { requireLawyerAdminPortal } from "@/shared/auth/require-access";
import { assertSameOriginMutationRequest } from "@/shared/security/request-origin";

export type AdminStatementOfClaimDraftActionState = {
  ok: boolean;
  message: string;
  draftId?: string;
  draftRevision?: number;
  blockersHe?: string[];
};

function adminDebtCaseDetailPath(debtCaseId: string) {
  return `/app/admin/debt-cases/${debtCaseId}`;
}

export async function generateStatementOfClaimDraftFormAction(
  _prev: AdminStatementOfClaimDraftActionState,
  formData: FormData,
): Promise<AdminStatementOfClaimDraftActionState> {
  try {
    await assertSameOriginMutationRequest();
    const context = await requireLawyerAdminPortal();
    const debtCaseId = String(formData.get("debtCaseId") ?? "").trim();
    const forceRegenerate = formData.get("forceRegenerate") === "on";
    const acknowledgeReplaceLawyerEdits =
      formData.get("acknowledgeReplaceLawyerEdits") === "on";

    if (!debtCaseId) {
      return { ok: false, message: "מזהה תיק חסר." };
    }

    const correlationId = await resolveAuditCorrelationId();
    const result = await generateDevelopmentStatementOfClaimDraft({
      context,
      debtCaseId,
      correlationId,
      forceRegenerate,
      acknowledgeReplaceLawyerEdits,
    });

    revalidatePath(adminDebtCaseDetailPath(debtCaseId));

  const message = result.created
      ? `נוצרה טיוטת כתב תביעה פנימית (גירסה ${result.draftRevision}) — לפיתוח בלבד.`
      : `טיוטה עדכנית כבר קיימת (גירסה ${result.draftRevision}).`;

    return {
      ok: true,
      message,
      draftId: result.draftId,
      draftRevision: result.draftRevision,
    };
  } catch (error) {
    if (error instanceof StatementOfClaimDraftError) {
      return {
        ok: false,
        message:
          error.blockersHe?.length
            ? `${formatStatementOfClaimDraftErrorHe(error.code)} ${error.blockersHe.join(" ")}`
            : formatStatementOfClaimDraftErrorHe(error.code),
        blockersHe: error.blockersHe,
      };
    }
    if (error instanceof DebtCaseError) {
      const mapped = mapLawyerDebtCaseReviewActionError(error);
      return { ok: false, message: mapped.message ?? "שגיאה בתיק." };
    }
    throw error;
  }
}

export type AdminStatementOfClaimDraftEditActionState = AdminStatementOfClaimDraftActionState;

export async function saveStatementOfClaimDraftEditsFormAction(
  _prev: AdminStatementOfClaimDraftEditActionState,
  formData: FormData,
): Promise<AdminStatementOfClaimDraftEditActionState> {
  try {
    await assertSameOriginMutationRequest();
    const context = await requireLawyerAdminPortal();
    const debtCaseId = String(formData.get("debtCaseId") ?? "").trim();
    const sourceDraftId = String(formData.get("sourceDraftId") ?? "").trim();
    const expectedConcurrencyRevision = Number(
      String(formData.get("expectedConcurrencyRevision") ?? ""),
    );
    const sectionIds = formData.getAll("sectionId").map((v) => String(v).trim());

    if (!debtCaseId || !sourceDraftId || !Number.isFinite(expectedConcurrencyRevision)) {
      return { ok: false, message: "נתוני טופס חסרים." };
    }

    const sectionEdits = sectionIds
      .map((sectionId) => ({
        sectionId: sectionId as StatementOfClaimTemplateSectionId,
        titleHe: String(formData.get(`title_${sectionId}`) ?? "").trim(),
        bodyText: String(formData.get(`body_${sectionId}`) ?? "").trim(),
      }))
      .filter((row) => row.titleHe || row.bodyText);

    const correlationId = await resolveAuditCorrelationId();
    const result = await saveStatementOfClaimDraftSectionEdits({
      context,
      debtCaseId,
      sourceDraftId,
      expectedConcurrencyRevision,
      sectionEdits,
      correlationId,
    });

    revalidatePath(adminDebtCaseDetailPath(debtCaseId));

    return {
      ok: true,
      message: result.unchanged
        ? "לא זוהו שינויים."
        : `נשמרה גרסה ${result.draftRevision} (עריכת עורך דין).`,
      draftId: result.draftId,
      draftRevision: result.draftRevision,
    };
  } catch (error) {
    if (error instanceof StatementOfClaimDraftError) {
      const he = formatStatementOfClaimDraftErrorHe(error.code);
      return {
        ok: false,
        message: error.blockersHe?.length ? `${he} ${error.blockersHe.join(" ")}` : he,
        blockersHe: error.blockersHe,
      };
    }
    if (error instanceof DebtCaseError) {
      const mapped = mapLawyerDebtCaseReviewActionError(error);
      return { ok: false, message: mapped.message ?? "שגיאה בתיק." };
    }
    throw error;
  }
}