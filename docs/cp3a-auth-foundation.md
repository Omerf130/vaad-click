# CP3A — Database and authentication security foundation

This note records decisions and planned controls for Checkpoint 3A. It supplements Checkpoint 0 (§ AuthN strategy, folder layout).

## Alignment with Checkpoint 0

- **MongoDB Atlas + Mongoose** in `src/shared/db` (server-only).
- **Zod** at validation boundaries (`src/shared/validation`, module schemas).
- **Lawyer admin:** password + mandatory MFA (TOTP recommended in CP0; SMS is an open stakeholder question).
- **Building rep / management company:** mobile OTP only (no passwords); real SMS in **CP17**.
- **Auth.js (NextAuth v5)** remains an optional adapter for a later sub-checkpoint if we want CSRF/session helpers; CP3A implements **custom server-side sessions** in MongoDB to avoid premature login routes and to keep MFA stage semantics explicit.

## Session model

- HttpOnly cookie `vc_session` holds an opaque token only.
- MongoDB `sessions` collection stores **HMAC-SHA256(token)** with `AUTH_SECRET` — not the raw token.
- `authStage`: `primary` (lawyer password verified, MFA pending) vs `mfa_complete` (fully authenticated).
- TTL: 1 hour for `primary`, 7 days for `mfa_complete` (defaults; lawyer-configurable TTLs deferred to CP5 where appropriate).
- Revocation sets `revokedAt`; lookup ignores revoked rows.
- MongoDB TTL index on `expiresAt` for physical cleanup.

**Authorization:** roles and scopes are **never** read from cookies; always load the user from the database using the session reference.

## CP3B update (development auth)

Email/password login, registration (rep/mgmt), and logout are implemented in CP3B. MFA interfaces are **deferred for development** but **not waived for production** — see [cp3b-auth-flows.md](./cp3b-auth-flows.md).

## MFA (CP3A scope)

- Lawyer accounts **require** MFA before `sessionSatisfiesAuthenticationPolicy` passes.
- `canPersistMfaEnrollmentCompletion()` returns **false** in CP3A — no mock OTP/TOTP bypass.
- **Unresolved (decide before lawyer login in CP3B/CP27):**
  - **TOTP authenticator app** (CP0 recommendation, no SMS cost, works offline) vs **SMS second factor** (stakeholder question #5 in CP0).
  - Whether lawyer primary login is **password-only** vs **passkey/WebAuthn** (CP0 open question).

## Planned controls (not active in CP3A)

| Control | Status | Target checkpoint |
|--------|--------|-------------------|
| Rate limiting (login, OTP) | Planned | CP3B+ with `rate-limiter-flexible` + Mongo store (CP0) |
| CSRF on cookie-mutating routes | Planned | CP3B when login/actions ship |
| Brute-force lockout counters | Planned | CP3B |
| Auth.js adapter / CSRF helpers | Optional | CP3B if adopted |
| Real SMS OTP | Not implemented | CP17 |

## Environment

See `.env.example`. Never commit `.env.local`. Database name defaults: `vaadclick_dev` / `vaadclick_test` / `vaadclick`, overridable via `MONGODB_DB_NAME`.
