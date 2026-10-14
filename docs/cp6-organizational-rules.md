# CP6 — Organizational rules (Build gate)

Authoritative product rules for CP6A/6B/6C. Supersedes earlier CP6 draft text that allowed one building representative to manage multiple buildings.

Sources: product owner clarification (2026), parsed DOCX specs, [`homepage.ts`](../src/content/homepage.ts), CP3B auth docs. **Do not invent rules beyond this document and the CP6 plan.**

## Roles (exactly three)

| Role | Scope |
|------|--------|
| `lawyer_admin` | Full platform administration; all buildings, users, management companies; registration review; assignments. Initial lawyer admin unchanged. |
| `building_rep` | **At most one** assigned building; **zero** while awaiting assignment; **never** multiple buildings in MVP. |
| `management_company` | **Multiple** explicitly assigned buildings only; no access from registration or company identity alone. |

**Legal client:** the building committee (נציגות), not the management company.

## Registration and account approval

- Public registration roles: **נציג בניין** (`building_rep`) or **חברת ניהול** (`management_company`) only.
- **`lawyer_admin` is never self-registerable.**
- New self-registrations start in **`pending_approval`** (see account lifecycle).
- Registration **does not** grant operational access.
- Lawyer admin **must approve or reject** each account (separate from building assignment).

## Account status vs building assignment

Two independent dimensions:

1. **Account approval** (`accountStatus`): `pending_approval` → `active` (approved) or `rejected`; plus `disabled` / `locked` for suspension.
2. **Building assignment:** lawyer links users to buildings (rep: 0..1 building; mgmt company: 0..n buildings via org records).

| Account | Assignment | Operational building access |
|---------|------------|----------------------------|
| `pending_approval` | any | **None** (even if stale FK data existed) |
| `rejected` | any | **None** |
| `disabled` / `locked` | any | **None**; FK history preserved |
| `active` | rep, no building | **None** (awaiting assignment) |
| `active` | rep, one building | **That building only** |
| `active` | mgmt, no buildings | **None** |
| `active` | mgmt, linked buildings | **Linked buildings only** |
| `lawyer_admin` | n/a | Global admin surfaces |

**Sessions:** CP3 may create a session after register/login; **operational access** must be enforced server-side from current DB state (approval + assignment), not from session age alone.

## Building and relationship invariants

- Each building: **at most one** designated `building_rep`.
- Each `building_rep` user: **at most one** building assignment (1:1 in MVP).
- Management company: **many** buildings via explicit `managementCompanyId` on each building.
- Buildings may be **created without** a representative.
- **No legal verification** in CP6 (`verified` state not settable).
- **Address dedup:** normalized address key; lawyer-documented exception for distinct entities at same address.
- Optional informational fields on building: unit count, average monthly committee fee (not gating).
- **National ID:** not collected in CP6.

## Mutations

All sensitive org mutations: lawyer-admin only, Zod, same-origin, Mongo transaction, **mandatory audit**, fail closed on audit failure.

Includes: account approve/reject/suspend, rep assign/replace, mgmt company link/unlink, building create/archive, duplicate-address exception.

## Checkpoint split

- **CP6A:** Models, indexes, invariants, account approval lifecycle (extend CP3 register/login helpers), org services, audit, tests — **no admin UI**.
- **CP6B (landed):** Building-scoped authorization — see [`cp6b-building-scoped-authorization.md`](cp6b-building-scoped-authorization.md).
- **CP6C:** Lawyer approval queue, user/building/company admin UI, registration copy/UX alignment.

## Existing code conflicts (pre-CP6A)

Must be corrected during CP6A/6B (not duplicated):

| Location | Issue |
|----------|--------|
| [`access-policy.ts`](../src/shared/auth/access-policy.ts) | Building-scope authorization deferred to **CP6B** |

**CP6A (landed):** models, org services, account approval lifecycle, portal status route, mandatory audit on org mutations. **CP6B** adds building-scoped authorization and IDOR tests. **CP6C** adds lawyer admin UI.
