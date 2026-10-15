"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";

import {
  createDebtCaseDraft,
  getDebtCase,
  listDebtCasesForBuilding,
  previewDebtCaseSubmissionFlags,
  submitDebtCaseForLawyerReview,
  updateDebtCase,
} from "@/modules/debt-cases/services/debt-case.service";
import { DebtCaseError, DebtCaseErrorCode } from "@/modules/debt-cases/domain/debt-case-errors";
import type { DebtCaseValidationFlag } from "@/modules/debt-cases/domain/debt-case-validation-flag";
import { mapDebtCaseErrorToHebrew } from "@/modules/debt-cases/presentation/debt-case-messages.he";
import {
  debtCaseDraftInputSchema,
  debtCaseSubmitInputSchema,
} from "@/modules/debt-cases/validation/debt-case.schema";
import {
  validationSummaryMessage,
  zodErrorToFieldErrors,
} from "@/modules/debt-cases/presentation/debt-case-form-field-errors";
import {
  normalizeDebtCaseValidationFlags,
  sanitizePortalDebtCaseActionState,
  type DebtCaseFormIntent,
} from "@/modules/debt-cases/presentation/portal-debt-case-action-state";
import {
  parseDebtCaseFormDataToDraftPayload,
  parseDebtCaseFormDataToSubmitPayload,
} from "@/modules/debt-cases/validation/debt-case-form.parser";
import { resolveAuditCorrelationId } from "@/modules/audit/services/audit-correlation";
import { findAccessibleBuildingByPublicId } from "@/shared/auth/building-access/assert-building-access";
import { requireOperatorPortalAccess } from "@/shared/auth/require-operator-portal";
import { assertSameOriginMutationRequest } from "@/shared/security/request-origin";

export type { DebtCaseFormIntent };

export type PortalDebtCaseActionState = {
  ok: boolean;
  message?: string;
  code?: string;
  fieldErrors?: Record<string, string>;
  flags?: DebtCaseValidationFlag[];
  revision?: number;
  debtCaseId?: string;
  lastIntent?: DebtCaseFormIntent;
};

function buildingCasesPath(buildingId: string) {
  return `/app/buildings/${buildingId}`;
}

function casePath(buildingId: string, debtCaseId: string) {
  return `/app/buildings/${buildingId}/debt-cases/${debtCaseId}`;
}

function returnActionState(state: PortalDebtCaseActionState): PortalDebtCaseActionState {
  return sanitizePortalDebtCaseActionState(state);
}

function handleDebtCaseError(error: unknown): PortalDebtCaseActionState {
  if (error instanceof DebtCaseError) {
    return returnActionState({
      ok: false,
      code: error.code,
      message: mapDebtCaseErrorToHebrew(error.code),
    });
  }
  if (error instanceof ZodError) {
    const fieldErrors = zodErrorToFieldErrors(error);
    return returnActionState({
      ok: false,
      message: validationSummaryMessage(fieldErrors),
      fieldErrors,
    });
  }
  if (error instanceof Error && error.message === "Cross-origin request rejected") {
    return returnActionState({ ok: false, message: "הבקשה נדחתה." });
  }
  return returnActionState({ ok: false, message: "לא ניתן להשלים את הפעולה." });
}

function rethrowNextRedirect(error: unknown): void {
  if (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  ) {
    throw error;
  }
}

async function assertBuildingScope(
  context: Awaited<ReturnType<typeof requireOperatorPortalAccess>>,
  buildingId: string,
) {
  const building = await findAccessibleBuildingByPublicId({ context, buildingPublicId: buildingId });
  if (!building) {
    throw new DebtCaseError(DebtCaseErrorCode.FORBIDDEN, "Building access denied");
  }
}

export async function createDebtCaseDraftFormAction(
  _prev: PortalDebtCaseActionState,
  formData: FormData,
): Promise<PortalDebtCaseActionState> {
  try {
    await assertSameOriginMutationRequest();
    const context = await requireOperatorPortalAccess();
    const buildingId = String(formData.get("buildingId") ?? "").trim();
    await assertBuildingScope(context, buildingId);

    const correlationId = await resolveAuditCorrelationId();
    const created = await createDebtCaseDraft({
      context,
      payload: { buildingId },
      correlationId,
    });

    revalidatePath(buildingCasesPath(buildingId));
    redirect(casePath(buildingId, created.debtCaseId));
  } catch (error) {
    rethrowNextRedirect(error);
    return handleDebtCaseError(error);
  }
}

export async function saveDebtCaseDraftFormAction(
  _prev: PortalDebtCaseActionState,
  formData: FormData,
): Promise<PortalDebtCaseActionState> {
  try {
    await assertSameOriginMutationRequest();
    const context = await requireOperatorPortalAccess();
    const buildingId = String(formData.get("buildingId") ?? "").trim();
    const debtCaseId = String(formData.get("debtCaseId") ?? "").trim();
    const expectedRevision = Number(formData.get("revision") ?? -1);
    await assertBuildingScope(context, buildingId);

    const rawPayload = parseDebtCaseFormDataToDraftPayload({ formData, buildingId });
    const payload = debtCaseDraftInputSchema.parse(rawPayload);

    const correlationId = await resolveAuditCorrelationId();
    const updated = await updateDebtCase({
      context,
      debtCaseId,
      expectedRevision,
      payload,
      correlationId,
    });

    revalidatePath(buildingCasesPath(buildingId));
    revalidatePath(casePath(buildingId, debtCaseId));

    return returnActionState({
      ok: true,
      message: "הטיוטה נשמרה.",
      revision: updated.revision,
      debtCaseId,
    });
  } catch (error) {
    return handleDebtCaseError(error);
  }
}

export async function previewDebtCaseSubmitFormAction(
  _prev: PortalDebtCaseActionState,
  formData: FormData,
): Promise<PortalDebtCaseActionState> {
  try {
    await assertSameOriginMutationRequest();
    const context = await requireOperatorPortalAccess();
    const buildingId = String(formData.get("buildingId") ?? "").trim();
    const debtCaseId = String(formData.get("debtCaseId") ?? "").trim();
    await assertBuildingScope(context, buildingId);

    const rawPayload = parseDebtCaseFormDataToSubmitPayload({ formData, buildingId });
    const payload = debtCaseSubmitInputSchema.parse({
      ...rawPayload,
      buildingId,
      principalAmountMinor: rawPayload.principalAmountMinor,
    });

    const preview = await previewDebtCaseSubmissionFlags({
      context,
      debtCaseId,
      payload,
    });

    return returnActionState({
      ok: !preview.blocking,
      message: preview.blocking
        ? "יש לתקן חסימות לפני הגשה."
        : preview.flags.length > 0
          ? "ניתן להגיש — שימו לב לאזהרות."
          : "הנתונים תקינים להגשה.",
      flags: normalizeDebtCaseValidationFlags(preview.flags),
    });
  } catch (error) {
    return handleDebtCaseError(error);
  }
}

export async function submitDebtCaseFormAction(
  _prev: PortalDebtCaseActionState,
  formData: FormData,
): Promise<PortalDebtCaseActionState> {
  try {
    await assertSameOriginMutationRequest();
    const context = await requireOperatorPortalAccess();
    const buildingId = String(formData.get("buildingId") ?? "").trim();
    const debtCaseId = String(formData.get("debtCaseId") ?? "").trim();
    const expectedRevision = Number(formData.get("revision") ?? -1);
    await assertBuildingScope(context, buildingId);

    const rawPayload = parseDebtCaseFormDataToSubmitPayload({ formData, buildingId });
    const payload = debtCaseSubmitInputSchema.parse({
      ...rawPayload,
      buildingId,
    });

    const correlationId = await resolveAuditCorrelationId();
    const updated = await submitDebtCaseForLawyerReview({
      context,
      debtCaseId,
      expectedRevision,
      payload,
      correlationId,
    });

    revalidatePath(buildingCasesPath(buildingId));
    revalidatePath(casePath(buildingId, debtCaseId));

    return returnActionState({
      ok: true,
      message:
        "התיק הוגש לבדיקת עורך הדין. הגשה זו אינה שליחת מכตב משפטי.",
      revision: updated.revision,
      debtCaseId,
      flags: normalizeDebtCaseValidationFlags(updated.validationFlags),
    });
  } catch (error) {
    return handleDebtCaseError(error);
  }
}

export async function debtCaseOperatorFormAction(
  _prev: PortalDebtCaseActionState,
  formData: FormData,
): Promise<PortalDebtCaseActionState> {
  const intentRaw = String(formData.get("intent") ?? "save");
  const lastIntent: DebtCaseFormIntent =
    intentRaw === "preview" ? "preview" : intentRaw === "submit" ? "submit" : "save";

  let result: PortalDebtCaseActionState;
  if (lastIntent === "preview") {
    result = await previewDebtCaseSubmitFormAction(_prev, formData);
  } else if (lastIntent === "submit") {
    result = await submitDebtCaseFormAction(_prev, formData);
  } else {
    result = await saveDebtCaseDraftFormAction(_prev, formData);
  }

  return returnActionState({ ...result, lastIntent });
}

export async function loadPortalDebtCasesForBuildingAction(buildingId: string) {
  const context = await requireOperatorPortalAccess();
  await assertBuildingScope(context, buildingId);
  return listDebtCasesForBuilding({ context, buildingId });
}

export async function loadPortalDebtCaseDetailAction(input: {
  buildingId: string;
  debtCaseId: string;
}) {
  const context = await requireOperatorPortalAccess();
  await assertBuildingScope(context, input.buildingId);
  const record = await getDebtCase({ context, debtCaseId: input.debtCaseId });
  if (record.buildingId !== input.buildingId) {
    throw new DebtCaseError(DebtCaseErrorCode.FORBIDDEN, "Building mismatch");
  }
  return record;
}
