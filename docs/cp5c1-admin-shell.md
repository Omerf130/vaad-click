# CP5C.1 — Admin shell and dashboard

## Route architecture

Lawyer admin and development portal share the `/app` URL segment but use **Next.js route groups** so each surface gets exactly one navigation chrome:

| Route group | Path | Shell |
|-------------|------|--------|
| `(portal)` | `/app` | Legacy portal header (`app-shell.module.scss`) + `LogoutButton` |
| `(lawyer-admin)` | `/app/admin/*` | `AdminShell` (navy RTL sidebar + admin top bar) |

`src/app/app/layout.tsx` is a **passthrough** only — no header.

## Admin navigation

Configuration: `src/modules/admin/navigation/admin-nav-config.ts`

- **Implemented:** סקירה כללית → `/app/admin`, הגדרות → `/app/admin/settings`
- **Settings hub** links to `/app/admin/financial-settings`
- **Planned** items render disabled in the sidebar (no fake routes)

Active state: financial settings paths highlight **הגדרות** in the sidebar.

## Pages

- **Dashboard** (`/app/admin`): module grid; real financial settings summary only (published count, draft flag, applicable version). No synthetic KPIs.
- **Settings hub** (`/app/admin/settings`): card entry to financial settings.
- **Financial settings**: wrapped in `AdminPageFrame`; inner CP5B workspace unchanged (CP5C.2 will tab/refine).

## Auth

- Portal group: `requireDevelopmentPortalAccess()`
- Lawyer admin group + pages: `requireLawyerAdminPortal()` (role + portal access)

## Tests

- `tests/admin-nav-config.test.ts` — nav items, active routes, disabled planned modules
- `tests/admin-shell-layout.test.ts` — single-header structure, layout guards

## RTL sidebar (CP5C.2 fix)

The site root is `<html dir="rtl">`, so the admin shell **must** set `direction: ltr` on `.shell` or grid columns mirror (sidebar on the left). Layout: `grid-template-columns: minmax(0, 1fr) 280px`, `grid-template-areas: "main sidebar"`, explicit `grid-column: 1` / `2`. Hebrew `direction: rtl` on `.mainColumn` and `.sidebar` only.

## Manual checks

1. Log in as lawyer admin → `/app/admin` shows one admin top bar and right sidebar; no duplicate portal header.
2. Log in as building rep → `/app` shows portal header only; `/app/admin` redirects forbidden.
3. Sidebar: implemented links work; planned items are disabled with tooltip.
4. Settings hub → financial settings; logout from admin top bar works.
