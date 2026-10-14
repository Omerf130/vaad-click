# CP6C.2 — Buildings & management companies admin UI

Lawyer-admin routes for organizational CRUD and assignments. Mutations delegate to CP6A services with mandatory audit.

## Routes

| Path | Purpose |
|------|---------|
| `/app/admin/buildings` | List, search, filter |
| `/app/admin/buildings/new` | Create (+ duplicate exception) |
| `/app/admin/buildings/[buildingId]` | Edit, rep assign/remove, company link/unlink, archive |
| `/app/admin/management-companies` | List, search |
| `/app/admin/management-companies/new` | Create + primary user |
| `/app/admin/management-companies/[managementCompanyId]` | Edit, managed buildings list |

## Services added in CP6C.2

- `updateBuildingRecord`, `archiveBuildingRecord` (building lifecycle)
- `updateManagementCompanyRecord`
- `recordBuildingUpdated`, `recordBuildingArchived`, `recordManagementCompanyUpdated` (audit)
- Admin query helpers under `admin-*-query.service.ts`
