# CP6B — Building-scoped authorization

Server-enforced tenant scope for operational building data. Product rules: [`cp6-organizational-rules.md`](cp6-organizational-rules.md).

## Scope resolver

`resolveBuildingAccessScope(context)` loads **current** MongoDB relationships on every call (no building permissions in session cookies).

| Role / state | Scope |
|--------------|--------|
| `pending_approval`, `rejected`, `disabled`, `locked` | `denied` — no assignment queries |
| `lawyer_admin` + `active` | `global` — all **active** buildings |
| `building_rep` + `active` | `assigned` — 0 or 1 active building where user is designated rep |
| `management_company` + `active` | `assigned` — 0..n active buildings linked to user's `managementCompanyId` |

Pure derivation for tests: `deriveBuildingAccessScope(...)`.

## Public server APIs (`src/shared/auth/building-access/`)

| API | Use |
|-----|-----|
| `resolveBuildingAccessScope` | Fresh scope from DB |
| `getAccessibleBuildingPublicIds` | ID list for filters |
| `listAccessibleBuildings` | Scoped listing (portal proof) |
| `findAccessibleBuildingByPublicId` | Read one building with scope ∩ query filter |
| `assertBuildingAccess` | Throw `BuildingAccessError` before mutations |
| `buildActiveBuildingScopeFilter` | Merge into Mongo queries — **never** trust client `buildingId` alone |
| `isWellFormedBuildingPublicId` | Reject malformed IDs early |

Route helper: `requireBuildingPortalAccess(buildingPublicId)` in `require-building-access.ts` (audits `building_access_denied`).

## Enforcement points

- `/app/buildings` — lists via `listAccessibleBuildings`
- `/app/buildings/[buildingId]` — `requireBuildingPortalAccess`
- Future modules: call `assertBuildingAccess` / `buildActiveBuildingScopeFilter` at service boundary

## Revocation

Effective on next request when:

- Account status leaves `active`
- Representative cleared or reassigned (`clearBuildingRepresentative`, `assignBuildingRepresentative`)
- Management company unlinked (`unlinkBuildingFromManagementCompany`)
- Building archived (`organizationalStatus !== active` excluded from scope queries)

## Deferred

- CP6C admin UI
- Full building dashboard and operational modules
