# CP3B — Email/password authentication (development simplification)

## Product decision (development)

During development, all account types authenticate with **email + password**:

- Lawyer administrator
- Building committee representative
- Management company user

Debtors remain **token-based** (later checkpoint). **No SMS OTP, TOTP, passkeys, or MFA UI** in CP3B.

## Production security — MFA not waived

Checkpoint 0 still requires **mandatory lawyer MFA** before production access to sensitive legal workflows.

CP3B implements:

- `sessionGrantsAccess(..., surface: "development_portal")` — password sessions OK for local/preview portal pages in non-production; lawyer in **production** requires `mfa_complete`.
- `sessionGrantsAccess(..., surface: "production_legal_workflows")` — always requires `mfa_complete` (MFA not implemented yet → blocked).

Existing CP3A session stages (`primary` / `mfa_complete`) and MFA enrollment fields are **retained** for a future MFA checkpoint.

## Registration

- Public registration: `building_rep` or `management_company` only.
- No building/company linkage — accounts have **no operational scope** until CP6+ onboarding.
- `emailVerifiedAt` remains null; **no email provider** — verification is not faked.

## Initial lawyer admin

**Preferred:** agent bootstraps the admin (no password), then issues a **single-use setup token** (hash stored in MongoDB). The raw token is written only to **`.local/lawyer-admin-setup.url`** (gitignored). The developer opens that file locally and completes password setup at **`/setup/lawyer-admin?token=…`** within 30 minutes. Visiting `/setup/lawyer-admin` without a valid token returns 404.

Legacy interactive CLI: `npm run provision:lawyer-admin`.

No public admin registration. Recovery reprovision requires `ALLOW_LAWYER_ADMIN_REPROVISION=true`.

## Email verification dependency

When transactional email is available (**CP18**), pending verification can gate activation. CP3B keeps accounts active for development portal access only.
