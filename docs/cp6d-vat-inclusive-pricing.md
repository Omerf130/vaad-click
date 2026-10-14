# CP6D — VAT-inclusive treatment fee pricing

## Semantics

| Mode | `amountsMonetaryBasis` | Lawyer input | Stored on publish |
|------|------------------------|--------------|-------------------|
| Legacy (CP5–early CP6D) | `legacy_net_exclusive_vat` (default when absent) | Net / ex-VAT in `*ExVat` fields | Unchanged historical rows |
| Current | `gross_inclusive_vat` | Gross treatment fees in agorot | Frozen `gross` + derived `net` + `vat` |

Published versions are immutable. No backfill or mutation of legacy published documents.

## Draft and publish rules

- New drafts save treatment fees as **gross-inclusive** only (`debtorTreatmentFeeGross`, `committeeTreatmentFeeWhenDebtorWaivedGross`).
- **No suggested monetary default** for treatment fees (277 ₪ ex-VAT is not converted or pre-filled).
- Suggested **percentages** on first draft only: trust processing 2.3%, committee transfer 0.5%, success fee 20%.
- Legacy or cloned legacy drafts retain net values for display/reference but **cannot publish** until the lawyer enters gross amounts and saves.
- Cloning a gross published version copies **gross inputs only**; net/VAT are recomputed at the next publish from the VAT schedule row at `effectiveFrom`.
- Net/VAT derivation: integer agorot, half-up net, `vat = gross - net` (`src/shared/financial/vat-amount-breakdown.ts`).

## Success fee (metadata only)

- Rate: configurable basis points (default suggestion 20%).
- **Base (contractual, not calculated in CP6D):** principal, indexation, and interest **actually collected after the lawsuit was filed**.
- **Excluded:** court-awarded legal fees/expenses, court fee reimbursements, enforcement fees, warning-letter treatment expenses.
- **Partial collections:** expenses first, then principal (`expenses_then_principal`).
- VAT treatment of the success-fee charge itself is **out of scope** until billing is implemented.

## Out of scope (CP6D)

- VAT on principal debt
- Payment, invoice, platform-fee, or success-fee calculation engines
- Bank details and digital signatures

## Future VAT rate changes

- Treatment fee **gross** amounts are the lawyer-signed commercial figures on each published version.
- If statutory VAT rates change after publish, **existing published gross amounts are not auto-adjusted**; a new financial-settings version with a future `effectiveFrom` is required.
- Net/VAT breakdown on each gross-inclusive version is **frozen at publish** using the schedule entry applicable to that version’s `effectiveFrom`.

## Open questions (before billing / CP7)

- Final VAT treatment of the success-fee charge
- Whether committee-assumed treatment fees follow identical VAT invoicing rules as debtor fees
- Interaction between frozen engagement snapshots and later VAT schedule amendments
