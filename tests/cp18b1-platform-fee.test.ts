import { describe, expect, it } from "vitest";

import { emptyDebtCasePlatformFeeFields } from "@/modules/debt-cases/domain/debt-case-platform-fee.defaults";
import { WARNING_LETTER_PLATFORM_FEE_AMOUNT_MINOR } from "@/modules/debt-cases/domain/warning-letter-platform-fee.constants";
import {
  initialPlatformFeeCollectionStatus,
  LAWYER_ALLOWED_PLATFORM_FEE_STATUS_TRANSITIONS,
  WarningLetterPlatformFeeCollectionStatus,
} from "@/modules/debt-cases/domain/warning-letter-platform-fee-collection-status";
import { WarningLetterPlatformFeePaymentPreference } from "@/modules/debt-cases/domain/warning-letter-platform-fee-payment-preference";
import { buildPlatformFeeFieldsForCaseSubmit } from "@/modules/debt-cases/domain/warning-letter-platform-fee-submit";
import {
  debtCaseIntakeDraftSaveSchema,
  debtCaseIntakeSubmitSchema,
} from "@/modules/debt-cases/validation/debt-case-intake.schema";

describe("warning letter platform fee constant", () => {
  it("uses 32700 minor units for 327 ILS", () => {
    expect(WARNING_LETTER_PLATFORM_FEE_AMOUNT_MINOR).toBe(32700);
  });
});

describe("buildPlatformFeeFieldsForCaseSubmit", () => {
  it("does not mark immediate payment as paid", () => {
    const fields = buildPlatformFeeFieldsForCaseSubmit(
      WarningLetterPlatformFeePaymentPreference.IMMEDIATE_PAYMENT,
    );
    expect(fields.platformFeeAmountMinor).toBe(WARNING_LETTER_PLATFORM_FEE_AMOUNT_MINOR);
    expect(fields.platformFeeCollectionStatus).toBe(
      WarningLetterPlatformFeeCollectionStatus.AWAITING_ONLINE_PAYMENT,
    );
    expect(fields.platformFeeCollectionStatus).not.toBe(
      WarningLetterPlatformFeeCollectionStatus.PAID_SETTLED,
    );
  });

  it("starts debtor collection path as requested", () => {
    const fields = buildPlatformFeeFieldsForCaseSubmit(
      WarningLetterPlatformFeePaymentPreference.ATTEMPT_DEBTOR_COLLECTION,
    );
    expect(fields.platformFeeCollectionStatus).toBe(
      WarningLetterPlatformFeeCollectionStatus.DEBTOR_COLLECTION_REQUESTED,
    );
  });
});

describe("intake schema payment preference", () => {
  const basePayload = {
    intakeDraftId: "11111111-1111-4111-8111-111111111111",
    expectedRevision: 0,
    submitIdempotencyKey: "key12345678",
    building: {
      mode: "new" as const,
      displayName: "ב",
      address: { city: "c", street: "s", houseNumber: "1" },
    },
    caseDraft: {
      apartmentNumber: "1",
      occupancyType: "owner",
      legalDebtorDesignation: "property_owners",
      debtType: "regular_vaad",
      principalAmountMinor: 10000,
      periodStartMonth: "2024-01",
      periodEndMonth: "2024-06",
      propertyOwners: [{ fullName: "Test", mobile: "0501234567" }],
    },
  };

  it("allows missing preference on draft save", () => {
    expect(
      debtCaseIntakeDraftSaveSchema.safeParse({
        building: { mode: "new", address: {} },
        caseDraft: {},
      }).success,
    ).toBe(true);
  });

  it("requires preference on submit", () => {
    expect(debtCaseIntakeSubmitSchema.safeParse(basePayload).success).toBe(false);
    expect(
      debtCaseIntakeSubmitSchema.safeParse({
        ...basePayload,
        platformFeePreference: WarningLetterPlatformFeePaymentPreference.IMMEDIATE_PAYMENT,
      }).success,
    ).toBe(true);
  });
});

describe("legacy debt cases", () => {
  it("expose null platform fee fields", () => {
    const legacy = emptyDebtCasePlatformFeeFields();
    expect(legacy.platformFeePreference).toBeNull();
    expect(legacy.platformFeeCollectionStatus).toBeNull();
  });
});

describe("lawyer status transitions", () => {
  it("never allows automatic transition to paid without lawyer path", () => {
    expect(
      LAWYER_ALLOWED_PLATFORM_FEE_STATUS_TRANSITIONS[
        WarningLetterPlatformFeeCollectionStatus.AWAITING_ONLINE_PAYMENT
      ],
    ).toContain(WarningLetterPlatformFeeCollectionStatus.PAID_SETTLED);
    expect(initialPlatformFeeCollectionStatus(WarningLetterPlatformFeePaymentPreference.IMMEDIATE_PAYMENT)).not.toBe(
      WarningLetterPlatformFeeCollectionStatus.PAID_SETTLED,
    );
  });
});
