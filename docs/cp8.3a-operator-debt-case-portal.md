# CP8.3A — Operator debt case portal

**Scope:** Active building representatives and management companies only (`/app/buildings/...`).

## Routes

- `/app/buildings/[buildingId]` — case list + “תיק חוב חדש”
- `/app/buildings/[buildingId]/debt-cases/[debtCaseId]` — edit / view / submit

## Server actions

[`src/modules/debt-cases/actions/portal-debt-case.actions.ts`](../src/modules/debt-cases/actions/portal-debt-case.actions.ts) — wraps CP8.2 services; `requireOperatorPortalAccess` + building scope on every mutation.

## Out of scope (CP8.3B+)

Lawyer-admin review queue, pending-registration onboarding UI, letter send.
