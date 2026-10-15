# CP8 — Debt case management (planning only)

**Status:** Planning + CP8.1/8.1A domain + **CP8.2 persistence** (see [`cp8.2-debt-case-persistence.md`](./cp8.2-debt-case-persistence.md)).  
**Primary source:** [`docs/תשובות לשאלות של עומר.docx`](./תשובות%20לשאלות%20של%20עומר.docx) (extracted and analyzed).  
**Supporting specs:** [`docs/אפיון מערכת מכתבי התראה – שיפוטי בבניין (2).docx`](./אפיון%20מערכת%20מכתבי%20התראה%20–%20שיפוטי%20בבניין%20(2).docx), [`docs/ועד בקליק – הצעה לנציגויות ולחברות ניהול.docx`](./ועד%20בקליק%20–%20הצעה%20לנציגויות%20ולחברות%20ניהול.docx).

---

## 1. Requirements coverage matrix

Legend: **Done** = usable in product today · **Infra** = types/module boundary only · **Partial** · **Not started** · **Deferred** = explicit later checkpoint.

| Requirement | Lawyer DOCX (Oct 2026) | Original specs (Oct 2026 DOCX) | Current implementation (CP0–CP7) | CP8 target |
|-------------|------------------------|--------------------------------|----------------------------------|------------|
| Open debt case (rep / MC / lawyer) | All roles per permissions; new reg saves drafts | Process 2 form; MC picks building | Portal building pages are placeholders | **Build** |
| Draft before legal readiness | Drafts yes; no treatment until approval + POA + agreement; **existing customer** skips checks | Building must be lawyer-approved first | No case entity; verification `VERIFIED` blocked in CP6A guard | **Build** + readiness flags |
| One open case per apartment/debtor | Yes; merge debt before letter sent | Duplicate block same apt + period | — | **Build** |
| New case after letter sent | Linked new case; frozen letter debt | Same | — | **Model + rules** (letter frozen deferred) |
| Debtor fields (owners, tenant, phones) | Detailed (2 owners in name; tenant → owner mobile; same letter) | Similar; letter to owner, tenant copy | — | **Build** |
| ID / email / mail address | ID optional until legal stage; email optional | ID required on building reg; debtor email optional | National ID not in CP6 org scope | **Build** per lawyer |
| Debt types | Regular + special + description | Same | — | **Build** |
| Indexation/interest | Not in v1; lawyer calculates at lawsuit | — | — | **Out of CP8** |
| Statement OCR / AI compare | Mentioned for future card | AI read card; flags not blocks | — | **Deferred** (CP8: optional attachment placeholder only) |
| Auto checks + lawyer queue | Auto checks then lawyer queue; **existing** streamlined to “Send” | AI flags; lawyer approves every send | Audit types only | **Build checks + queue**; no send |
| Lawyer actions on review | Approve/send, edit, return, reject | Same minus send in CP8 | — | **Partial** (no send/PDF) |
| Edit after submit | Until lawyer approves letter; then frozen | Same | — | **Build** |
| Treatment blockers | Unsigned POA/agreement; unapproved building; dispute; insolvency; death; bank change blocks transfers | Legal enforcement list | Committee unsigned; bank `not_collected` | **Build gate service** |
| Duplicates | Hard: overlapping period same apt; soft: name other apt / recent close | Overlap block | — | **Build** |
| MC permissions + SMS for costly actions | MC = routine; SMS for waiver/cancel/compromise/litigation | Similar | — | **Defer SMS**; stub permission hooks |
| Direct payment report | MC/rep report; freezes principal | Same | Payment types only | **Defer** |
| Status list (long) | 15+ statuses | Shorter MVP list | — | **Model superset**; CP8 implements subset |
| Warning letter / delivery | WhatsApp manual, SMS/email auto | Full channel matrix | — | **Deferred** |
| Payments / fees | 277+VAT, 200 waiver, etc. | Parameters in settings | CP6D global settings; **no engine** | **Deferred**; document 327 ₪ conflict |
| Documents | Building once; case optional card | Upload + signed docs | CP7 infra, storage off | **Deferred** uploads |
| Digital signatures | Required before treatment | Unified signing doc | Engagement `signedAt` null | **Deferred** |
| Building verification | Lawyer approves building | Manual checklist | `lawyerVerificationStatus` exists; **cannot set VERIFIED** | **CP8 or CP8b** enable lawyer verify workflow |
| Auth (OTP vs password) | — | Mobile OTP | CP3B email/password dev | **No change in CP8** |

---

## 2. Conflicts and resolution (do not silently overwrite)

| Topic | Older / CP6D / specs | Lawyer latest | Proposed resolution |
|-------|----------------------|---------------|---------------------|
| **Waiver / committee fee after debtor waiver** | Marketing + spec: **200 ₪ + VAT**; SMS gate (Q15). CP6D: `committeeTreatmentFeeWhenDebtorWaived*` lawyer-entered, gross-inclusive, **no default** | **327 NIS** (VAT unknown) | **CP6D-F follow-up** only: new published settings version when lawyer confirms gross/VAT. **CP8:** no fee math; store enum `waiverFeePolicyVersion` reference later. |
| **Treatment fee in letters** | Spec: **277 ₪ + VAT** parameter | Aligns with Bar minimum narrative | Keep in global financial settings / future letter params — **not CP8** |
| **Existing customer fast path** | Spec: after building approved, straight to letter flow | **Existing** customer: direct treatment **without** check; Clarification A: auto prep, lawyer clicks **Send** (not auto-send) | Introduce lawyer-admin flag `building.legacyFastTrackEligible` (or engagement profile) + audit; **eligibility criteria** documented below; CP8 implements **review tier** not sending |
| **Building verification** | Spec: lawyer marks building approved | CP6A forbids `VERIFIED` transition in code | **CP8:** lawyer-admin workflow to set `lawyerVerificationStatus` to `verified` with checklist + audit (narrow change, guarded) **or** parallel `buildingLegalReadiness` record — pick one in CP8 kickoff |
| **Registration saves debtor drafts** | Lawyer: end of registration | Spec: building reg then process 2 | Current: register → pending approval, no debtor UI | CP8: drafts on portal after **active** account; optional later: draft during pending (lawyer said yes — **confirm** if pending users may save drafts) |
| **Auth** | Spec: OTP | CP3B: password | Defer OTP to CP17; CP8 uses existing session auth |
| **AI / OCR** | Spec: AI flags and card read | Lawyer: system reads card | **CP8:** manual amount/period only; `validationFlags` from rules; attachment OCR **deferred** |

---

## 3. Proposed domain entities and MongoDB models

### 3.1 Design principles

- **Building scope:** every case row has `buildingId` (public UUID); all queries filtered via CP6B.
- **Separate dimensions** instead of one overloaded status (see §4).
- **Immutable financial snapshot** when a letter is sent (future): `debtSnapshotAtLetterSend` subdocument, write-once.
- **Linkage:** `predecessorDebtCaseId` for post-letter new cases; `repeatDebtorHint` derived from normalized key (display only).
- **PII minimization:** optional `DebtorProfile` collection keyed by hash for repeat detection — **prefer** normalized fields on case + index on `(buildingId, normalizedName, apartmentNumber)` before splitting entities.

### 3.2 Collections (proposed)

#### `debt_cases`

| Field | Purpose |
|-------|---------|
| `debtCaseId` | Public UUID |
| `buildingId` | Scope |
| `apartmentNumber` | Unit identifier (string, building-local) |
| `parties` | Structured CP8.1A: `propertyOwners[]` (1–2), optional `tenant`, `legalDebtorDesignation`, `postalAddress` |
| Per-party contact | Optional email; mobile E.164 on owners/tenant per occupancy rules |
| Per-party identity | Optional `identityDocumentType` + `identityNumber` (explicit type — no checksum inference) |
| `debtType` | `regular_vaad` \| `special_assessment` |
| `specialAssessmentDescription` | Required if special |
| `principalAmountMinor` | Integer agorot |
| `periodStartMonth` / `periodEndMonth` | Inclusive YYYY-MM |
| `workflowStatus` | CP8 lifecycle (§4) |
| `lawyerReviewStatus` | Queue dimension |
| `legalTreatmentHold` | Boolean + `holdReasons[]` enum |
| `validationFlags[]` | `{ code, severity: warn|block, messageHe }` |
| `predecessorDebtCaseId` | Nullable link |
| `letterSentAt` | Null in CP8; gates edits when set (future) |
| `debtSnapshotAtLetter` | Frozen copy of principal/period/debtor fields (future) |
| `submittedAt`, `submittedByUserId` | Submission audit |
| `createdByUserId`, `updatedByUserId` | Operators |
| `revision` | Optimistic concurrency |
| `deletedAt` | Soft delete if needed (prefer status `rejected`/`closed`) |

**Indexes (proposed):**

- `{ buildingId, workflowStatus, updatedAt: -1 }` — portal lists
- `{ buildingId, apartmentNumber, workflowStatus }` — duplicate detection
- `{ lawyerReviewStatus, submittedAt: 1 }` — lawyer queue (partial: pending review)
- Unique partial (careful): open-case guard implemented in **transaction** + query for overlapping `[periodStart, periodEnd]` among non-closed statuses

#### `debt_case_review_events` (optional)

Append-only lawyer actions (return/reject/approve intent) if not fully covered by audit log — **prefer mandatory audit only** unless UI needs fast timeline.

#### Extend existing (no snapshot rewrite)

- **`buildings`:** use `lawyerVerificationStatus`, `averageMonthlyVaadFeeMinor` for amount sanity flags; add optional `legacyFastTrackEligible` (lawyer-set).
- **`committee_engagements`:** readiness inputs (`signedAt`, POA) remain null until signature CP; expose `computeBuildingLegalReadiness()` reading engagement + building verification.

### 3.3 Extension points (not over-engineered)

- `document-assets`: `ownerEntityType: debt_case`, classification `debt_case_attachment` when Blob live.
- Future `warning_letters` module references `debtCaseId`.
- Future `payments` reference frozen snapshot amounts, not live case fields.

---

## 4. Lifecycle and status transition matrix

### 4.1 Dimensions

| Dimension | CP8 values | Later values |
|-----------|------------|--------------|
| **workflowStatus** | `draft`, `awaiting_building_verification`, `awaiting_lawyer_review`, `returned_for_completion`, `rejected`, `closed_manual` | `letter_sent`, `pre_suit_notice_sent`, `payment_plan`, `partially_paid`, `frozen_dispute`, `legal_proceedings`, `paid_pending_transfer`, `closed_paid`, `closed_waiver`, … |
| **lawyerReviewStatus** | `not_submitted`, `pending`, `approved_for_letter_prep`, `rejected`, `returned` | ties to letter module |
| **legalTreatmentHold** | computed: POA/agreement/building not ready, dispute, insolvency, death | bank transfer hold |
| **letterDeliveryStatus** | `none` | `pending_send`, `sent`, … |
| **paymentStatus** | `none` | platform / direct / partial |

### 4.2 CP8 transitions (workflowStatus)

| From | To | Actor | Conditions |
|------|-----|-------|------------|
| `draft` | `draft` | rep/mc/lawyer | save |
| `draft` | `awaiting_lawyer_review` | rep/mc | submit passes validation; may set hold flags but **still queue** for lawyer |
| `draft` | `awaiting_building_verification` | system | optional if building not verified — **or** stay draft with banner (product choice) |
| `awaiting_lawyer_review` | `returned_for_completion` | lawyer | question / missing docs |
| `awaiting_lawyer_review` | `rejected` | lawyer | reason required |
| `awaiting_lawyer_review` | `draft` | rep/mc | only if returned |
| `awaiting_lawyer_review` | *approved* | lawyer | sets `lawyerReviewStatus = approved_for_letter_prep` — **no letter in CP8** |
| `returned_for_completion` | `awaiting_lawyer_review` | rep/mc | resubmit |
| any open | `closed_manual` | lawyer | reason |

**Edit rules:**

- **Draft / returned:** operators may edit all case fields.
- **awaiting_lawyer_review:** operator edit **returns case to queue** (lawyer DOCX) — reset review to `pending`, audit `status_changed`.
- **After `letterSentAt` (future):** no edit to principal/period/debtor identity; only allowed side-actions (payment report, dispute, stop).

**Overlap / duplicate (pre-submit and on submit):**

- **Block submit:** same `buildingId` + `apartmentNumber` + overlapping month range + existing case in `{draft, awaiting_*, letter_sent, ...}` excluding `rejected`/`closed_*`.
- **Before letter sent:** merge policy = operator must update existing case (UI message), not second open case.
- **After letter sent:** new case with `predecessorDebtCaseId`.

---

## 5. Role and permission matrix (CP8)

| Action | Lawyer-admin | Building rep | Management co. |
|--------|--------------|--------------|----------------|
| List cases in building | Yes (global) | Assigned building | Assigned buildings |
| View case detail | Yes | Assigned | Assigned |
| Create draft | Yes | Assigned | Assigned |
| Edit draft / returned | Yes | Assigned | Assigned |
| Submit for review | Yes | Assigned | Assigned |
| Edit while in review | Yes | Assigned (re-queues) | Assigned (re-queues) |
| Return / reject / approve-for-prep | Yes | No | No |
| Set building verified / fast-track | Yes | No | No |
| View audit trail | Yes | No | No |

**Future (hooks only in CP8):** SMS-gated waiver/cancel/compromise/litigation → rep-only confirm; MC may initiate if policy allows.

**Enforcement:** service-layer `authorizeDebtCaseAccess` + `assertBuildingAccess`; never trust client `buildingId`.

---

## 6. Validation and duplicate-prevention strategy

### 6.1 Draft vs submit (lawyer DOCX)

| Field | Draft | Submit |
|-------|-------|--------|
| Full name | optional | **required** |
| Apartment | optional | **required** |
| Owner/tenant | optional | **required** |
| Debtor mobile | optional | **required** |
| Owner mobile | if tenant | **required** if tenant |
| Principal amount | optional | **required** > 0 |
| Period months | optional | **required**, start ≤ end |
| Debt type | optional | **required** |
| Special description | — | required if special |
| ID number | optional | optional (required before **legal** stage — CP8 stores, validates format if present) |
| Email, postal | optional | optional |

### 6.2 Conditional rules

- **Tenant:** `ownerMobile` required; validation flag if owner mobile equals tenant mobile.
- **Two owners:** up to two entries in `propertyOwners[]` (CP8.1A).
- **Phone reuse:** warn/block if debtor mobile matches submitter (rep/MC user profile phone) — **block on submit**.
- **Amount sanity:** only when a lawyer-approved **configured** anomaly policy is enabled (CP8.1A — no default ×3 threshold).
- **Debt type:** enum enforcement via Zod.

### 6.3 Concurrency

- Submit in Mongo **transaction** with **month claim** collection (`buildingId` + normalized apartment + month). Drafts do not claim months.
- `revision` field on update; reject stale saves.

### 6.4 Repeat debtors

- Normalize name (trim, collapse spaces, lower case) + `apartmentNumber` + `buildingId` for **hint** “חייב חוזר” when prior **closed** case exists — warn only.

---

## 7. Onboarding readiness (CP8 without false “legal ready”)

**Legal treatment** (letter prep, send, collection) requires:

- Building `lawyerVerificationStatus === verified` (once enabled)
- Committee engagement **signed** POA + fee agreement (future CP)
- No active `legalTreatmentHold` flags

**CP8 UX honesty:**

- Portal shows **badges**: “טיוטה — טיפול משפטי לא התחיל”, “ממתין לאימות בניין”, “ממתין לחתימה על הסכם (לא זמין עדיין)” using **computed readiness**, not fake signed state.
- **Submit to lawyer queue** allowed for drafts (lawyer review can proceed internally) — aligns with lawyer allowing drafts before approval; **approve-for-letter-prep** action sets hold if readiness fails.
- **`legacyFastTrackEligible`:** lawyer-only; when true, auto validation tier “streamlined” (fewer warn flags) but **still** requires explicit lawyer approve action in CP9 letter CP.

---

## 8. Audit and privacy (CP8)

**Emit (extend taxonomy as needed):**

- `debt_case.case.created`
- `debt_case.case.updated`
- `debt_case.case.submitted`
- `debt_case.case.status_changed`
- `debt_case.case.returned`
- `debt_case.case.rejected`
- `debt_case.case.approved_for_letter_prep` (CP8 foundation)

**Metadata safe subset:** `debtCaseId`, `buildingId`, `apartmentNumber`, `workflowStatus`, `lawyerReviewStatus`, flag codes, `revision`, actor role — **no** full name, phone, ID, amounts in audit (amounts optional as minor units only if lawyer requires — default **omit**).

**Pattern:** Mongo transaction on state change + `writeAuditEventMandatory` same as committee engagement / document soft delete.

---

## 9. Clarification A — Streamlined review (design for CP9; rules in CP8)

**Eligibility for streamlined path (all required):**

- Building `legacyFastTrackEligible === true` **OR** building verified + engagement signed (future)
- No `validationFlags` with severity `block`
- No `legalTreatmentHold` active
- Debt type regular (optional exclude special assessments)
- Not a linked post-letter case (optional)

**Behavior:** case still enters `awaiting_lawyer_review`; UI presents “מוכן לשליחה” when eligible; **Send** button disabled until CP9 letter module. Lawyer must click to send — no auto-send.

---

## 10. UI plan (Hebrew RTL, existing SCSS)

### Operator portal

- **`/app/buildings/[buildingId]`** — replace placeholder: case list + “פתיחת תיק חדש”.
- **`/app/buildings/[buildingId]/debt-cases/new`** — draft form (sections: debtor, debt, flags).
- **`/app/buildings/[buildingId]/debt-cases/[debtCaseId]`** — view/edit draft or read-only when in review; show readiness banners.

### Lawyer-admin

- Enable nav **`/app/admin/debt-cases`** — queue filter `lawyerReviewStatus=pending`, building filter.
- **`/app/admin/debt-cases/[debtCaseId]`** — detail, flags, actions: return / reject / approve-for-prep, edit as lawyer.
- Building detail optional tab/link to cases for building.

**Not in CP8:** letter preview PDF, Send, payment buttons, attachment upload.

---

## 11. Recommended implementation split

| Sub-checkpoint | Scope |
|----------------|--------|
| **CP8.1** | Domain enums, errors, readiness calculator (read-only), Zod schemas, status transition guards |
| **CP8.2** | Mongoose model + indexes; `debt-cases` module skeleton |
| **CP8.3** | Authorization service + building-scoped list/get/create/update |
| **CP8.4** | Submit flow, duplicate/overlap transaction, validation flags |
| **CP8.5** | Lawyer queue actions (return/reject/approve-for-prep) + audit |
| **CP8.6** | Portal UI + server actions |
| **CP8.7** | Admin UI + nav `debt_cases` implemented |
| **CP8.8** | Tests + `docs/cp8-debt-case-foundation.md` (implementation doc) |

---

## 12. Likely files / modules

**Create:**

- `src/modules/debt-cases/domain/*` (status, debt-type, holds, validation-flags, errors, transitions)
- `src/modules/debt-cases/infra/debt-case.model.ts`
- `src/modules/debt-cases/validation/debt-case.schema.ts`
- `src/modules/debt-cases/services/debt-case-authorization.service.ts`
- `src/modules/debt-cases/services/debt-case-audit.service.ts`
- `src/modules/debt-cases/services/debt-case.service.ts`
- `src/modules/debt-cases/services/debt-case-validation.service.ts`
- `src/modules/debt-cases/services/building-legal-readiness.service.ts`
- `src/modules/debt-cases/presentation/debt-case-messages.he.ts`
- `src/modules/debt-cases/ui/*` (forms, lists)
- `src/modules/debt-cases/actions/*`
- `src/app/app/(portal)/buildings/[buildingId]/debt-cases/**`
- `src/app/app/(lawyer-admin)/admin/debt-cases/**`
- `tests/debt-case.*.test.ts`

**Modify:**

- [`src/modules/admin/navigation/admin-nav-config.ts`](src/modules/admin/navigation/admin-nav-config.ts) — debt cases implemented
- [`src/shared/audit/domain/audit-event-taxonomy.ts`](src/shared/audit/domain/audit-event-taxonomy.ts) — additional debt events if needed
- [`src/modules/buildings/domain/building-status.ts`](src/modules/buildings/domain/building-status.ts) — allow `verified` transition via guarded service (**only** if chosen over separate readiness entity)
- Portal building detail page

**Do not modify in CP8:** published financial settings, committee snapshots, CP7 storage registry.

---

## 13. Automated test strategy

- **Schema:** draft vs submit rules; tenant → owner mobile; special assessment description.
- **Transitions:** illegal status jumps rejected.
- **Authorization matrix:** rep cross-building denied; MC multi-building allowed; lawyer global.
- **Overlap:** concurrent submit one wins, one fails.
- **Phone rules:** rep phone equals debtor phone blocked.
- **Readiness:** hold prevents `approved_for_letter_prep` but allows submit to queue (define expected behavior in tests once confirmed).
- **Audit:** mandatory audit failure rolls back transaction; metadata excludes PII patterns.
- **Regression:** existing CP6B / financial / document tests unchanged.

---

## 14. Manual browser checklist (per sub-checkpoint)

**CP8.6 portal:** create draft, validation errors in Hebrew, save resume, submit, see “ממתין לבדיקת עורך דין”, readiness banner without claiming signed agreement.

**CP8.7 admin:** queue shows submitted case; return with message → operator sees returned; reject; approve-for-prep shows success but **no** send letter.

**CP8.4 duplicates:** second overlapping case blocked with clear message.

**Security:** manipulate `buildingId` in form → server rejects.

---

## 15. Remaining ambiguities (confirm before / during CP8)

### Confirmed by product owner (CP8 planning session)

| Decision | Choice |
|----------|--------|
| Submit when building unverified / unsigned | **Yes** — case may enter lawyer review queue; **legal treatment** remains blocked until readiness |
| Fast-track / existing customer | **Both** — lawyer-admin manual `legacyFastTrackEligible` **or** automatic when building verified **and** engagement signed |
| Pending-approval registrants saving drafts | **Yes** — allow draft persistence for `pending_approval` users (extends portal/account-status rules; submit to queue still requires operational policy — recommend **draft-only** until `active`, **submit** when active + assigned building) |

### Still open

1. **327 ₪** — gross or net of VAT? Same as committee waived fee in engagement snapshot or separate statutory fee? (**CP6D-F**, not CP8 code.)
2. **Amount sanity** — flag-only vs block submit when far from average fee? (Plan default: **flag-only**.)
3. **Apartment identifier** — string format (e.g. "12", "12א") normalization rules.
4. **ID number** — validate Israeli ID checksum in CP8 or defer?
5. **Pending users submit** — confirm whether `pending_approval` may **submit** to lawyer queue or only **save drafts** (recommended: drafts only until account `active`).

---

## 16. Can implementation begin safely?

**Yes, with scoped CP8.1–CP8.5** using the confirmed gating defaults above; use **flag-only** amount sanity unless lawyer specifies otherwise.

**Do not begin** fee/waiver changes, letter send, or Blob uploads in CP8.

**Recommended next step after approval:** implementation kickoff for **CP8.1–CP8.2** (domain + model) with lawyer-confirmed submit gating defaults recorded in `docs/cp8-debt-case-foundation.md`.
