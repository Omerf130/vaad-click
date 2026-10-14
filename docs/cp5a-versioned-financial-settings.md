# CP5A — Versioned financial settings

Backend infrastructure for **global** platform financial configuration. No admin UI (CP5B), no billing calculations, no payment processing, **no automatic seed** of fee amounts or VAT rates.

## Collections

| Collection | Purpose |
|------------|---------|
| `financial_settings_versions` | Draft and immutable published versions |
| `financial_settings_counters` | Atomic `versionNumber` allocation (`_id: published_version_number`) |

## Money and percentages

- Amounts: integer **minor units** (agorot) + `currency: "ILS"`.
- Percentages: **basis points** (e.g. `2000` = 20.00%).

## VAT

- Each published version embeds a **lawyer-entered** `vatSchedule` (no server default rate).
- Snapshots resolve a schedule row by technical lookup (`effectiveFrom <= asOf`). This is **not** legal VAT determination or filing output.

## Lifecycle

| Action | Audit (mandatory, same Mongo transaction) |
|--------|-------------------------------------------|
| Create draft | `system_config.financial_settings.draft_created` |
| Update draft | `system_config.financial_settings.draft_updated` |
| Discard draft | `system_config.financial_settings.draft_discarded` |
| Publish draft | `system_config.financial_settings.version_published` |

- At most **one** draft globally (partial unique index on `status: draft`).
- Published rows are **immutable** (Mongoose guards). Corrections: clone → draft → publish new version.
- **No retroactive publication:** `effectiveFrom` must be **today or later** on the Asia/Jerusalem calendar.

## Applicability (including future-effective versions)

For instant `t`, applicable published version = latest with `effectiveFrom <= t`. If none → `null` (e.g. before the first future effective date).

Example: versions effective 2026-11-01 and 2026-12-01 — on 2026-10-14 → none; on 2026-11-15 → November version; on 2026-12-15 → December version.

## Publication concurrency

1. Verify draft `{ status: draft, revision }`.
2. `findOneAndUpdate` counter `$inc` in the same transaction.
3. Single `findOneAndUpdate` draft → `published`.
4. Mandatory audit.

Unique partial indexes on published `effectiveFrom` and `versionNumber` prevent duplicate published rows.

## Authorization

All service entrypoints call `assertLawyerAdmin(context)` (CP5B will obtain context via `requireLawyerAdminPortal()`).

## Snapshots

`materializeFinancialSettingsSnapshot(publishedVersion, asOf)` produces a frozen struct for future debt cases. Includes `FINANCIAL_SETTINGS_SNAPSHOT_DISCLAIMER`.

## CP5B handoff

Server Actions and lawyer admin UI for editing drafts, entering VAT/fees explicitly, and publishing.

## Open business rules

Ex-VAT vs in-VAT charging, escalation calculation base, court costs policy, and legal eligibility to charge remain stakeholder decisions — stored as configurable fields only.
