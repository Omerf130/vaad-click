# CP6A — Organizational foundation

Technical reference for the organizational layer delivered in CP6A. Product rules: [`cp6-organizational-rules.md`](cp6-organizational-rules.md).

## Modules

| Area | Path | Responsibility |
|------|------|----------------|
| Buildings | `src/modules/buildings/` | Model, address normalization, create + rep/mgmt assignment services |
| Management companies | `src/modules/management-companies/` | Model, lawyer-provisioned company records linked to primary user |
| Organizations | `src/modules/organizations/` | Lawyer-admin guard, account approve/reject/reconsider, org audit helpers |
| Portal access | `src/shared/auth/account-portal-access.ts`, `require-access.ts` | Status-only vs operational portal gates |

## Account lifecycle

- Public registration → `pending_approval` ([`register.service.ts`](../src/modules/auth/services/register.service.ts)).
- Portal password login allowed for `pending_approval`, `rejected`, and `active` ([`account-status.ts`](../src/modules/users/domain/account-status.ts)); disabled/locked blocked.
- Lawyer admin login requires `active` only.
- Routes: authenticated shell via `requireAuthenticatedPortalSession`; `/app` via `requireOperationalPortalAccess` (active only); `/app/account-status` via `requireAccountStatusPageAccess`.

## Database invariants (buildings)

- Sparse unique index on `designatedRepresentativeUserId` for active buildings (at most one building per rep).
- Partial unique index on `normalizedAddressKey` when active and no duplicate exception.
- `managementCompanyId` on building documents references management company `_id`; users carry `managementCompanyId` for company primary linkage.

## Audit

Org mutations use Mongo transactions and [`organization-audit.service.ts`](../src/modules/organizations/services/organization-audit.service.ts). Audit write failure throws `AuditWriteFailedError` and rolls back the transaction.

Event types are listed in [`audit-event-taxonomy.ts`](../src/shared/audit/domain/audit-event-taxonomy.ts) under `account.*`, `building.*`, `management_company.*`.

## Follow-on

- **CP6B (landed):** [`cp6b-building-scoped-authorization.md`](cp6b-building-scoped-authorization.md)
- CP6C: Lawyer approval queue and assignment UI.
- Building legal verification workflows, debt, payments, email/SMS.

## Verification

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Key automated suites: `account-portal-access.test.ts`, `register-pending-status.test.ts`, `account-approval.service.test.ts`, `building-lifecycle.service.test.ts`, `building-assignment.service.test.ts`, `building-model-invariants.test.ts`.
