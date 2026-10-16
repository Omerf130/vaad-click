# Warning letter draft — MongoDB index migration (CP8.4C.1 bugfix)

## Problem

Early CP8.4C.1 created a **global unique** index on `letterCaseReference`. Revisions must reuse the same reference, so a second revision insert fails with E11000 or leaves only an invalidated row visible.

## Required state

| Index | Purpose |
|-------|---------|
| `draftId` unique | Primary business id |
| `unique_active_initial_warning_per_case` partial unique on `{ debtCaseId, letterType }` where `status: "active"` | One active draft per case |
| `unique_draft_revision_per_case_and_letter_type` unique on `{ debtCaseId, letterType, draftRevision }` | Revision numbering |
| `letterCaseReference` **non-unique** (lookup only) | Multiple revisions share one reference |

## Manual migration (production)

Inspect existing indexes:

```javascript
db.warning_letter_drafts.getIndexes()
```

If a unique index exists on `letterCaseReference` alone (often named `letterCaseReference_1`), drop it **only after confirming** no duplicate references exist across unrelated cases (each reference should belong to one `debtCaseId` chain):

```javascript
db.warning_letter_drafts.dropIndex("letterCaseReference_1")
```

Restart the application (or run Mongoose `syncIndexes` in a controlled maintenance window) so new compound indexes are created:

- `unique_draft_revision_per_case_and_letter_type`

Do **not** drop `unique_active_initial_warning_per_case` unless recreating it with the same partial filter.

## Verification

```javascript
db.warning_letter_drafts.getIndexes().map((i) => [i.name, i.unique, i.key])
```

After migration, two documents with the same `letterCaseReference` and different `draftRevision` must insert successfully.
