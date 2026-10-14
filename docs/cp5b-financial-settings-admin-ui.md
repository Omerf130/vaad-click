# CP5B — Financial settings admin UI

Lawyer-admin page: `/app/admin/financial-settings`.

## Suggested initial values

When **zero published versions** exist, creating a new draft pre-fills (via Server Action only):

- 277 ₪ ex-VAT debtor treatment fee
- 200 ₪ ex-VAT committee waiver fee
- 20% escalation recovery rate

Not applied on clone or when published history exists. **No VAT default.** Not auto-published.

UI labels these as **ערך מוצע לסקירה** when `publishedCount === 0` and draft was not cloned.

## Save vs publish

- Publish uses **saved draft from MongoDB** only (`buildPublishPayloadFromSavedDraft`).
- Client blocks publish review while form is dirty.
- Server verifies `revision` matches current draft before publish.

## Security

- `requireLawyerAdminPortal` + `assertSameOriginMutationRequest` on mutations.
- CP5A services enforce `assertLawyerAdmin` and mandatory audit.

## Numeric input

Shekels and percents parsed via string → scaled integer (`decimal-string-parse.ts`), not float `Math.round`.
