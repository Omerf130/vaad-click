# CP6C.1 — Lawyer admin user management

Hebrew RTL admin UI for public-registration account review.

## Routes

| Path | Purpose |
|------|---------|
| `/app/admin/users` | List, filters, pending queue tab |
| `/app/admin/users/[userId]` | Detail, approve/reject/reconsider |

## Mutations

Server Actions in `admin-user.actions.ts` call CP6A `account-approval.service` with same-origin guard and mandatory audit.

Approval does **not** assign buildings — see UI copy on detail page.

## Data

`admin-user-query.service.ts` lists only `building_rep` and `management_company` users (lawyer admin excluded from queue).

Last login proxy: latest session `createdAt` when present.
