# Temporary lawyer admin demo access (production MFA exception)

**Status:** Implemented — enable only for short-lived UX demos with **synthetic data**, not real debtor PII.

## Purpose

In production, `lawyer_admin` requires session stage `MFA_COMPLETE`, but MFA enrollment is not implemented yet. This **opt-in** exception allows **one** preconfigured **active** lawyer admin to use the admin portal after normal password login (`PRIMARY` stage), without changing MFA policy for anyone else.

## Environment variables (fail closed)

| Variable | Required when enabled | Values |
|----------|----------------------|--------|
| `LAWYER_DEMO_ACCESS_ENABLED` | Yes | Must be exactly `true` (anything else = disabled) |
| `LAWYER_DEMO_USER_ID` | Yes when enabled | 24-character hex MongoDB ObjectId of the demo lawyer user |

**Disabled by default:** omit both variables or set `LAWYER_DEMO_ACCESS_ENABLED` to anything other than `true`.

**Invalid config fails closed:** `LAWYER_DEMO_ACCESS_ENABLED=true` without a valid `LAWYER_DEMO_USER_ID` does **not** grant access.

Do not commit real IDs or secrets. Set values only in the deployment host (e.g. Vercel project settings).

## Activate (deployment)

1. Identify the lawyer admin user’s `_id` in MongoDB (24 hex chars).
2. Set `LAWYER_DEMO_ACCESS_ENABLED=true` and `LAWYER_DEMO_USER_ID=<that id>` on the deployment environment.
3. Redeploy or restart so server reads new env.
4. Lawyer logs in with **existing password** (normal login flow).

## Deactivate

1. Remove `LAWYER_DEMO_ACCESS_ENABLED` or set it to `false`.
2. Remove or clear `LAWYER_DEMO_USER_ID`.
3. Redeploy. Existing sessions remain until expiry or next login policy check — optionally revoke sessions for that user in DB if needed.

## Removal plan (after MFA ships)

1. Disable env vars in production.
2. Delete `lawyer-demo-access*.ts`, audit event type, tests, and this doc.
3. Revert `access-policy` / `require-access` demo branches.
4. Confirm production lawyer login requires real MFA only.

## Security limitations

- Does **not** bypass tenant/building authorization.
- Does **not** apply to `production_legal_workflows` (legal finalize/send remains MFA-only).
- Does **not** apply to other lawyer accounts, pending/rejected/disabled users, or portal roles.
- Not a substitute for MFA on real production data.

## Audit

Each demo login should emit `auth.lawyer_demo.portal_access` (no passwords, no session tokens).

## Implementation files

- `src/shared/auth/lawyer-demo-access.ts` — config parse + grant predicate
- `src/shared/auth/lawyer-demo-access.server.ts` — server env reader
- `src/shared/auth/access-policy.ts` — demo grant on `development_portal` only
- `src/shared/auth/require-access.ts` — passes `userId` + `accountStatus`
- `src/modules/audit/services/auth-audit.service.ts` + `audit-event-taxonomy.ts` — `auth.lawyer_demo.portal_access`
- `src/modules/auth/actions/auth.actions.ts` — audit on demo login
- `src/app/app/(lawyer-admin)/admin/page.tsx` — `productionBlocked` aligned with policy
- `tests/lawyer-demo-access.test.ts`, `tests/access-policy.test.ts`
- `.env.example` — commented placeholders
