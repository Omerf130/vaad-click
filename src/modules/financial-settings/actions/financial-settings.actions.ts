"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { resolveAuditCorrelationId } from "@/modules/audit/services/audit-correlation";
import { CourtCostsPolicy } from "@/modules/financial-settings/domain/court-costs-policy";
import {
  FinancialSettingsError,
  FinancialSettingsErrorCode,
} from "@/modules/financial-settings/domain/financial-settings-errors";
import { CollectionAllocationOrder } from "@/modules/financial-settings/domain/collection-allocation-order";
import { EscalationCalculationBase } from "@/modules/financial-settings/domain/escalation-calculation-base";
import { CONFIRMED_SUCCESS_FEE_EXCLUSIONS } from "@/modules/financial-settings/domain/success-fee-exclusion";
import {
  SUGGESTED_COMMITTEE_TRANSFER_FEE_BASIS_POINTS,
  SUGGESTED_ESCALATION_RECOVERY_BASIS_POINTS,
  SUGGESTED_TRUST_ACCOUNT_PROCESSING_FEE_BASIS_POINTS,
} from "@/modules/financial-settings/domain/suggested-initial-values";
import {
  buildPublishPayloadFromSavedDraft,
  type SavedFinancialSettingsDraftForPublish,
} from "@/modules/financial-settings/presentation/draft-to-publish-payload";
import { mapFinancialSettingsErrorToHebrew } from "@/modules/financial-settings/presentation/financial-settings-messages.he";
import { mapDraftFormZodErrorToFieldErrors } from "@/modules/financial-settings/presentation/map-zod-error-to-field-errors";
import {
  createFinancialSettingsDraft,
  createFinancialSettingsDraftFromPublished,
  discardFinancialSettingsDraft,
  updateFinancialSettingsDraft,
} from "@/modules/financial-settings/services/financial-settings-draft.service";
import { publishFinancialSettingsDraft } from "@/modules/financial-settings/services/financial-settings-publish.service";
import {
  getCurrentFinancialSettingsDraft,
  getPublishedFinancialSettingsHistory,
} from "@/modules/financial-settings/services/financial-settings-query.service";
import {
  draftFormFieldsSchema,
  mapDraftFormToContentInput,
  parseVatFormRows,
} from "@/modules/financial-settings/validation/financial-settings-form.schema";
import { publishFinancialSettingsInputSchema } from "@/modules/financial-settings/validation/financial-settings-content.schema";
import { requireLawyerAdminPortal } from "@/shared/auth/require-access";
import { CurrencyCode } from "@/shared/financial/currency";
import { assertSameOriginMutationRequest } from "@/shared/security/request-origin";

const FINANCIAL_SETTINGS_PATH = "/app/admin/financial-settings";

export type FinancialSettingsActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
  revision?: number;
};

function clampFormValue(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.slice(0, 4096);
}

function revalidateFinancialSettingsPage(): void {
  revalidatePath(FINANCIAL_SETTINGS_PATH);
}

async function guardMutation(): Promise<
  Awaited<ReturnType<typeof requireLawyerAdminPortal>>
> {
  await assertSameOriginMutationRequest();
  return requireLawyerAdminPortal();
}

function handleFinancialSettingsError(error: unknown): FinancialSettingsActionState {
  if (error instanceof FinancialSettingsError) {
    return {
      ok: false,
      message: mapFinancialSettingsErrorToHebrew(error.code),
    };
  }
  return { ok: false, message: mapFinancialSettingsErrorToHebrew(FinancialSettingsErrorCode.VALIDATION) };
}

export async function createFinancialSettingsDraftFormAction(
  _prev: FinancialSettingsActionState,
  _formData: FormData,
): Promise<FinancialSettingsActionState> {
  void _prev;
  void _formData;
  try {
    const context = await guardMutation();
    const correlationId = await resolveAuditCorrelationId();
    const published = await getPublishedFinancialSettingsHistory({ context });

    const initial =
      published.length === 0
        ? {
            currency: CurrencyCode.ILS,
            platformFees: {
              trustAccountProcessingFeeBasisPoints:
                SUGGESTED_TRUST_ACCOUNT_PROCESSING_FEE_BASIS_POINTS,
              committeeTransferFeeBasisPoints: SUGGESTED_COMMITTEE_TRANSFER_FEE_BASIS_POINTS,
            },
            escalation: {
              recoveryFeeRateBasisPoints: SUGGESTED_ESCALATION_RECOVERY_BASIS_POINTS,
              calculationBase:
                EscalationCalculationBase.COLLECTED_PRINCIPAL_AND_INDEXATION_INTEREST_AFTER_LAWSUIT_FILED,
              courtCostsPolicy: CourtCostsPolicy.UNSPECIFIED,
              successFeeExclusions: [...CONFIRMED_SUCCESS_FEE_EXCLUSIONS],
              collectionAllocationOrder: CollectionAllocationOrder.EXPENSES_THEN_PRINCIPAL,
            },
          }
        : undefined;

    await createFinancialSettingsDraft({ context, correlationId, initial });
    revalidateFinancialSettingsPage();
    return { ok: true, message: "הטיוטה נוצרה." };
  } catch (error) {
    return handleFinancialSettingsError(error);
  }
}

export async function createFinancialSettingsDraftFromPublishedAction(
  _prev: FinancialSettingsActionState,
  formData: FormData,
): Promise<FinancialSettingsActionState> {
  try {
    const context = await guardMutation();
    const correlationId = await resolveAuditCorrelationId();
    const sourceSettingsVersionId = clampFormValue(formData.get("sourceSettingsVersionId"));
    if (!sourceSettingsVersionId) {
      return { ok: false, message: "לא נבחרה גרסה לשכפול." };
    }

    await createFinancialSettingsDraftFromPublished({
      context,
      correlationId,
      sourceSettingsVersionId,
    });
    revalidateFinancialSettingsPage();
    return { ok: true, message: "הטיוטה נוצרה משכפול גרסה." };
  } catch (error) {
    return handleFinancialSettingsError(error);
  }
}

export async function updateFinancialSettingsDraftAction(
  _prev: FinancialSettingsActionState,
  formData: FormData,
): Promise<FinancialSettingsActionState> {
  try {
    const context = await guardMutation();
    const correlationId = await resolveAuditCorrelationId();

    const fieldsResult = draftFormFieldsSchema.safeParse({
      revision: clampFormValue(formData.get("revision")),
      debtorTreatmentFeeShekels: clampFormValue(formData.get("debtorTreatmentFeeShekels")),
      committeeAssumedTreatmentFeeShekels: clampFormValue(
        formData.get("committeeAssumedTreatmentFeeShekels"),
      ),
      trustAccountProcessingFeePercent: clampFormValue(
        formData.get("trustAccountProcessingFeePercent"),
      ),
      committeeTransferFeePercent: clampFormValue(formData.get("committeeTransferFeePercent")),
      escalationPercent: clampFormValue(formData.get("escalationPercent")),
      notesInternal: clampFormValue(formData.get("notesInternal")) || undefined,
    });
    if (!fieldsResult.success) {
      return { ok: false, fieldErrors: mapDraftFormZodErrorToFieldErrors(fieldsResult.error) };
    }
    const fields = fieldsResult.data;

    let vatRows;
    try {
      vatRows = parseVatFormRows(clampFormValue(formData.get("vatScheduleJson")));
    } catch {
      return { ok: false, message: "לוח המע\"מ אינו תקין." };
    }

    const mapped = mapDraftFormToContentInput({ fields, vatRows });
    if (!mapped.ok) {
      return { ok: false, fieldErrors: mapped.fieldErrors };
    }

    const updated = await updateFinancialSettingsDraft({
      context,
      correlationId,
      revision: mapped.revision,
      content: mapped.content,
    });

    revalidateFinancialSettingsPage();
    return {
      ok: true,
      message: "הטיוטה נשמרה.",
      revision: updated?.revision,
    };
  } catch (error) {
    if (error instanceof FinancialSettingsError) {
      return handleFinancialSettingsError(error);
    }
    if (error instanceof ZodError) {
      return { ok: false, fieldErrors: mapDraftFormZodErrorToFieldErrors(error) };
    }
    return {
      ok: false,
      message: "לא ניתן לשמור את הטיוטה. נסה/י שוב או רעננ/י את הדף.",
    };
  }
}

export async function discardFinancialSettingsDraftAction(
  _prev: FinancialSettingsActionState,
  formData: FormData,
): Promise<FinancialSettingsActionState> {
  try {
    const context = await guardMutation();
    const correlationId = await resolveAuditCorrelationId();
    const confirm = clampFormValue(formData.get("confirmDiscard"));
    if (confirm !== "yes") {
      return { ok: false, message: "יש לאשר מחיקת טיוטה." };
    }

    await discardFinancialSettingsDraft({ context, correlationId });
    revalidateFinancialSettingsPage();
    return { ok: true, message: "הטיוטה נמחקה." };
  } catch (error) {
    return handleFinancialSettingsError(error);
  }
}

export async function publishFinancialSettingsDraftAction(
  _prev: FinancialSettingsActionState,
  formData: FormData,
): Promise<FinancialSettingsActionState> {
  try {
    const context = await guardMutation();
    const correlationId = await resolveAuditCorrelationId();

    const confirmPublish = clampFormValue(formData.get("confirmPublish"));
    if (confirmPublish !== "yes") {
      return { ok: false, message: "יש לאשר פרסום במפורש." };
    }

    const revision = Number(clampFormValue(formData.get("revision")));
    if (!Number.isInteger(revision) || revision <= 0) {
      return { ok: false, message: "גרסת הטיוטה אינה תקינה. שמור/י ורעננ/י." };
    }

    const effectiveFromIso = clampFormValue(formData.get("effectiveFromIso"));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFromIso)) {
      return { ok: false, message: "יש לבחור תאריך תחילת תוקף." };
    }

    const draft = await getCurrentFinancialSettingsDraft({ context });
    if (!draft) {
      return { ok: false, message: "לא נמצאה טיוטה לפרסום." };
    }

    if (draft.revision !== revision) {
      return {
        ok: false,
        message: mapFinancialSettingsErrorToHebrew(
          FinancialSettingsErrorCode.DRAFT_REVISION_CONFLICT,
        ),
      };
    }

    const payload = buildPublishPayloadFromSavedDraft(
      draft as SavedFinancialSettingsDraftForPublish,
      effectiveFromIso,
    );
    publishFinancialSettingsInputSchema.parse(payload);

    await publishFinancialSettingsDraft({
      context,
      correlationId,
      payload,
    });

    revalidateFinancialSettingsPage();
    return { ok: true, message: "הגרסה פורסמה בהצלחה." };
  } catch (error) {
    return handleFinancialSettingsError(error);
  }
}
