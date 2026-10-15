# CP8.2 — Debt case persistence foundation

**Status:** Implemented (backend only — no UI/routes).

## Collections

### `debt_cases`

Structured parties (CP8.1A), lifecycle dimensions, validation flags, optimistic `revision`, optional `pendingOnboardingRequestId`.

### `debt_case_period_claims`

Atomic month reservations on **submit** only. Unique key:

`(buildingId, apartmentKeyNormalized, periodMonth)` — **no debtor identity in the key**, so overlapping claims for the same apartment/month are blocked even when names or IDs differ.

Future lawyer-controlled overlap exceptions are **not** implemented in CP8.2 (no silent bypass).

### `pending_building_onboarding_requests`

Server-owned association between a `pending_approval` user and a building:

1. Created automatically on public registration (OPEN, no building).
2. `buildingId` set only via lawyer-admin `bindPendingOnboardingToBuilding`.
3. Pending users **cannot** pass a client building UUID to gain access.

## Concurrency

Submit/resubmit runs MongoDB transaction: insert month claims → update case → mandatory audit. Duplicate claim (`E11000`) → `DEBT_CASE_DUPLICATE_OVERLAP`.

**Empirical verification:** optional integration test when `MONGODB_URI` and `RUN_DEBT_CASE_INTEGRATION=1` are set (`tests/debt-case-submit-concurrency.integration.test.ts`). Otherwise concurrency is covered by unit tests on claim logic only.

## Audit privacy

Debt-case audit metadata includes: `debtCaseId` (target entity), `buildingId`, workflow/review statuses, validation flag codes, `revision`. No apartment keys, names, phones, IDs, or amounts.

## Legal readiness

Loaded from building + committee engagement (`signedAt` only). `poaSigned` remains false until modeled. Submit allowed with warn flags; approve stores hold reasons when treatment not allowed.

## Deferred

Registration UI for building onboarding, portal/API routes, overlap exception workflow, POA persistence, `legacyFastTrackEligible` admin UI.
