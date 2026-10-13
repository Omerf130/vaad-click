# CP4B — Authentication and account audit integration

## Events emitted

| Event type | Trigger |
|------------|---------|
| `auth.login.success` | Password verified; session + audit committed in one transaction |
| `auth.login.failure` | Invalid credentials / inactive account (generic; no email in metadata) |
| `auth.logout` | Authenticated logout action |
| `auth.registration.success` | Public registration committed with mandatory audit |
| `auth.registration.failure` | Duplicate identity or forbidden role (no email in metadata) |
| `auth.rate_limit.exceeded` | Login, registration, or password-setup rate limit hit |
| `auth.access.forbidden` | Authenticated user denied (production MFA gate or role mismatch) |
| `auth.account.password_initialized` | Initial lawyer admin password set via setup token (transaction) |

Not emitted: routine `getAuthenticatedContext()` / layout session reads, unauthenticated redirect to `/login`, validation-only form errors.

## Actor derivation

| Situation | Actor |
|-----------|--------|
| Login success, logout, forbidden | `buildUserAuditActor(AuthenticatedContext)` |
| Login failure, registration failure | External `anonymous` / provider `auth` |
| Rate limits | System `auth.rate_limit` |
| Password initialized | User actor for the lawyer admin user id |

Client-supplied user ids are never trusted.

## Metadata (allowlisted primitives)

- Login failure: `{ reasonCode: "authentication_failed" }`
- Login success: `{ authStage: "primary" \| "mfa_complete" }`
- Registration success: `{ registeredRole: "<role>" }`
- Registration failure: `{ reasonCode: "duplicate_identity" \| "role_forbidden" \| "validation" }`
- Rate limit: `{ channel: "login" \| "register" \| "password_setup" }`
- Forbidden: `{ reasonCode: "production_mfa_required" \| "role_mismatch" }`

No passwords, tokens, cookies, emails (including on failed login), or raw bodies.

## Transaction boundaries

| Operation | Transaction contents |
|-----------|----------------------|
| Login completion | Revoke prior sessions → create session → mandatory `auth.login.success` |
| Registration | Create user → mandatory `auth.registration.success` → create session |
| Lawyer password setup | Consume setup token → set password hash → mandatory `auth.account.password_initialized` |

## Failure handling

- **Mandatory audit failure:** Mongo transaction aborts; login shows generic auth failure; registration returns generic “cannot complete registration”; password setup shows generic setup failure.
- **Optional audit failure:** Login/registration failure and rate-limit audits use non-mandatory writes (`null` on failure) — auth outcome unchanged, no user-facing audit detail.
- **Rate limits:** Still enforced before auth logic; one audit event per blocked request (no per-attempt login failure flood while limited).

## Noise controls

- No audit on unauthenticated `/app` redirect to `/login`.
- Forbidden audits only when a valid session exists but access policy denies.
- Rate-limit path skips login-failure audit (denied outcome recorded once on the limit).

## Remaining limitations

- No audit UI/export (CP25).
- CSRF/origin rejection on auth actions is not audited (avoid noise).
- `/unauthorized` page visits are not audited.
- IP addresses are not stored in audit metadata (channel-only for rate limits).
- Retention and DB-level immutability remain open (CP4A).

## Future hooks

- Business CPs: import `writeAuditEventMandatory` inside domain transactions.
- Optional: pass `x-correlation-id` from edge/proxy for cross-service tracing.
