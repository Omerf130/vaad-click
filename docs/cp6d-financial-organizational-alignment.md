# CP6D — Financial & organizational alignment

Authoritative reconciliation of post-CP6 client financial requirements with CP5 global settings and CP6 organizational model. **No payment processing, signatures, or bank collection in CP6D.**

## Global financial settings (CP5 extended)

- **Platform fees (separate, never combined):**
  - `trustAccountProcessingFeeBasisPoints` — default suggested **2.3%** on new first draft only.
  - `committeeTransferFeeBasisPoints` — default suggested **0.5%** on new first draft only.
- **Committee-assumed treatment fee:** configurable amount (`committeeTreatmentFeeWhenDebtorWaivedExVat`). **No 200 ₪ suggested default** — lawyer must enter explicitly.
- **Success fee:** `recoveryFeeRateBasisPoints` (default suggested 20% ex-VAT); VAT from embedded `vatSchedule`.
- **Policy metadata (stored, not calculated):** success fee calculation base, confirmed exclusions, `expenses_then_principal` allocation order.

### Versioning rules

- Published rows remain **immutable**; legacy publishes without `platformFees` stay valid historical records.
- **New publishes** require complete `platformFees` and escalation metadata (no `UNSPECIFIED` base/allocation).
- Existing **drafts** remain editable; missing platform fees must be filled before publish (no silent backfill).

## Committee engagement (per building)

| Concept | CP6D behavior |
|---------|----------------|
| **Proposed terms** | Lawyer captures snapshot from applicable global version — **not signed** |
| **Signed terms** | Fields reserved (`signedAt`, `signedByUserId`, `signedTermsSnapshot` always null) |
| **Replace proposed** | Audited lawyer-admin operation while unsigned only |
| **Outbound transfers** | **`outboundTransfersAllowed` always false** — no enable action |
| **Bank account** | `bankAccountCollectionStatus: not_collected` only — no account numbers or documents |

Collection: `committee_engagements`.

Audit: `building.committee_engagement.proposed_terms_captured` / `proposed_terms_replaced`.

## Trust account & payments (design only)

See [`payment-trust.types.ts`](../src/shared/financial/payment-trust.types.ts) and deferred CPs for links, webhooks, ledger, MASAV batches.

## Open business questions (documented — no implementation)

1. Are 2.3% / 0.5% ex-VAT or in-VAT? Calculation base and payer?
2. Rounding per line vs invoice (agorot).
3. Partial collection allocation across expense subcategories beyond expenses-then-principal.
4. Off-platform committee receipts vs success fee base.
5. Waiver approval workflow for debtor treatment fee.

## Verification

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Key suites: `financial-settings-*.test.ts`, `committee-engagement.service.test.ts`, `financial-settings-draft-to-publish.test.ts`.
