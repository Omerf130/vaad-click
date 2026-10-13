# CP4A — Audit log infrastructure

Append-only audit events in MongoDB (`audit_events`), validated at the service boundary with Zod. Same Atlas database as the application (`vaadclick_dev` / env-specific names). No external bus or separate DB.

## Event schema (persisted)

| Field | Description |
|--------|-------------|
| `eventId` | Server-generated UUID (public correlation id) |
| `eventType` | Dot-separated lowercase name (`auth.login.failure`) |
| `eventVersion` | Schema version for the event type (default `1`) |
| `occurredAt` | Server timestamp at write time (never client-supplied) |
| `actorType` | `user` \| `system` \| `external` |
| `actorUserId` | ObjectId when actor is a user |
| `actorRole` | User role when actor is a user |
| `actorExternalId` | External actor identifier |
| `actorSystemComponent` | System component name |
| `targetEntityType` / `targetEntityId` | Optional target (omit for e.g. failed login) |
| `action` | Operation verb phrase |
| `outcome` | `success` \| `failure` \| `denied` |
| `metadata` | Allowlisted primitives only; sensitive keys/values rejected |
| `correlationId` | Optional request/correlation id |

MongoDB `_id` is internal. No `createdAt`/`updatedAt` on audit documents (immutable snapshot time is `occurredAt`).

## Naming conventions

`<category>.<domain>.<action>` — see `AuditEventType` in `src/shared/audit/domain/audit-event-taxonomy.ts`.

Categories: authentication, user administration, building, debt case, lawyer approval, legal document, debtor access, payment, system configuration.

## How to record an event

1. Build a **trusted actor** on the server (`buildUserAuditActor`, `buildSystemAuditActor`, `buildExternalAuditActor`) — never trust client-supplied user ids.
2. Call `writeAuditEvent({ eventType, actor, action, outcome, target?, metadata?, correlationId? })`.
3. Optional: `await resolveAuditCorrelationId()` from request headers.

```typescript
import { writeAuditEvent } from "@/modules/audit/services/audit-writer.service";
import { buildSystemAuditActor } from "@/shared/audit/build-audit-actor";
import { AuditEventType } from "@/shared/audit/domain/audit-event-taxonomy";
import { AuditOutcome } from "@/shared/audit/domain/audit-outcome";

await writeAuditEvent({
  eventType: AuditEventType.AUTH_LOGIN_FAILURE,
  actor: buildSystemAuditActor("auth.login"),
  action: "login",
  outcome: AuditOutcome.FAILURE,
  metadata: { reasonCode: "invalid_credentials" },
});
```

CP4A defines types and infrastructure only — **do not emit** business events until the corresponding workflow CP lands.

## Transactional audit requirements

Use `writeAuditEventMandatory(input, { session })` in the **same MongoDB transaction** as the business mutation when:

- Money, legal approval, or debtor-visible state changes
- Account privilege or authentication state changes
- Any operation that must be provably logged for compliance

If the audit insert fails, `AuditWriteFailedError` is thrown — **abort the transaction** so the business change does not commit alone.

Non-critical telemetry may use `writeAuditEvent` without `mandatory` (returns `null` on failure); do not use that pattern for security-critical paths.

## Privacy and sensitive data

Forbidden in metadata (keys and patterns): passwords, hashes, tokens, cookies, secrets, OTP/MFA, connection strings, card data, bearer tokens, full document bodies.

Metadata values: primitives only; strings max 500 chars; max 32 keys.

Prefer identifiers and reason codes over full document snapshots.

## Append-only limitations

Application layer:

- Mongoose pre-hooks block update/delete/replace on `AuditEvent`
- No HTTP routes or Server Actions for audit mutation
- Only `AuditEvent.create` via `audit-writer.service`

This is **not** cryptographic tamper-proofing and **not** DB-enforced immutability. Production should use MongoDB roles that deny `update`/`delete` on `audit_events` for application users, with retention/archival performed by a separate privileged role (decision open — see CP25).

## Index strategy

- `eventId` (unique)
- `occurredAt` (desc)
- `eventType` + `occurredAt`
- `actorUserId` + `occurredAt`
- `targetEntityType` + `targetEntityId` + `occurredAt`
- `correlationId`

## CP4B integration points (planned)

- Auth login/logout/session revocation (`auth.*`)
- Registration and account status changes (`user_admin.*`, `auth.*`)
- Pass `ClientSession` from transactional user/building/case services
- Wire `resolveAuditCorrelationId()` in Server Actions and Route Handlers

## Open retention decisions

- Hot retention period in Atlas
- Archive to object storage vs. online query window
- Lawyer-facing export UI (CP25)
- Whether to add hashed event chaining (not in CP4A)
