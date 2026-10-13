import "server-only";

import { randomUUID } from "node:crypto";

import type { ClientSession } from "mongoose";
import { Types } from "mongoose";

import { AuditEvent } from "@/modules/audit/infra/audit-event.model";
import type { UserRole } from "@/modules/users/domain/user-role";
import { AuditActorType } from "@/shared/audit/domain/audit-actor-type";
import type { TrustedAuditActor } from "@/shared/audit/domain/trusted-audit-actor";
import { AuditWriteFailedError } from "@/shared/audit/errors/audit-errors";
import type { AuditOutcome } from "@/shared/audit/domain/audit-outcome";
import {
  auditEventWriteInputSchema,
  type AuditEventWriteInput,
  type AuditEventWritePayload,
} from "@/shared/audit/validation/audit-event-input.schema";
import { connectMongo } from "@/shared/db/connect";

export type WriteAuditEventOptions = {
  session?: ClientSession;
};

export type WriteAuditEventResult = {
  id: string;
  eventId: string;
  occurredAt: Date;
};

function mapActorToDocument(actor: TrustedAuditActor): {
  actorType: (typeof AuditActorType)[keyof typeof AuditActorType];
  actorUserId?: Types.ObjectId;
  actorRole?: UserRole;
  actorExternalId?: string;
  actorSystemComponent?: string;
} {
  if (actor.type === AuditActorType.USER) {
    return {
      actorType: AuditActorType.USER,
      actorUserId: new Types.ObjectId(actor.userId),
      actorRole: actor.role,
    };
  }
  if (actor.type === AuditActorType.SYSTEM) {
    return {
      actorType: AuditActorType.SYSTEM,
      actorSystemComponent: actor.systemComponent,
    };
  }
  return {
    actorType: AuditActorType.EXTERNAL,
    actorExternalId: actor.externalId,
  };
}

function authoritativeOccurredAt(): Date {
  return new Date();
}

/**
 * Append a validated audit event. Does not throw on persistence failure unless
 * `mandatory: true` (use for security-critical paths inside transactions).
 */
export async function writeAuditEvent(
  input: AuditEventWriteInput,
  options?: WriteAuditEventOptions & { mandatory?: false },
): Promise<WriteAuditEventResult | null>;

export async function writeAuditEvent(
  input: AuditEventWriteInput,
  options: WriteAuditEventOptions & { mandatory: true },
): Promise<WriteAuditEventResult>;

export async function writeAuditEvent(
  input: AuditEventWriteInput,
  options?: WriteAuditEventOptions & { mandatory?: boolean },
): Promise<WriteAuditEventResult | null> {
  const parsed = auditEventWriteInputSchema.parse(input);
  await connectMongo();

  const eventId = randomUUID();
  const occurredAt = authoritativeOccurredAt();
  const actorFields = mapActorToDocument(parsed.actor);

  let metadata = parsed.metadata ? { ...parsed.metadata } : undefined;
  if (parsed.actor.type === AuditActorType.EXTERNAL && parsed.actor.provider) {
    metadata = { ...(metadata ?? {}), externalProvider: parsed.actor.provider };
  }

  try {
    const docPayload = buildAuditEventDocument({
      parsed,
      eventId,
      occurredAt,
      actorFields,
      metadata,
    });

    const createOptions = options?.session ? { session: options.session } : undefined;
    const doc = (await AuditEvent.create([docPayload], createOptions))[0];

    if (!doc) {
      throw new AuditWriteFailedError();
    }

    const result: WriteAuditEventResult = {
      id: doc._id.toString(),
      eventId: doc.eventId,
      occurredAt: doc.occurredAt,
    };

    return result;
  } catch (error) {
    if (options?.mandatory) {
      throw new AuditWriteFailedError(
        error instanceof Error ? error.message : undefined,
      );
    }
    return null;
  }
}

/** Security-critical business operations must use this inside the same transaction. */
export async function writeAuditEventMandatory(
  input: AuditEventWriteInput,
  options: WriteAuditEventOptions & { session: ClientSession },
): Promise<WriteAuditEventResult> {
  const result = await writeAuditEvent(input, {
    ...options,
    mandatory: true,
  });
  return result;
}

function buildAuditEventDocument(input: {
  parsed: AuditEventWritePayload;
  eventId: string;
  occurredAt: Date;
  actorFields: ReturnType<typeof mapActorToDocument>;
  metadata: Record<string, string | number | boolean | null> | undefined;
}) {
  const { parsed, eventId, occurredAt, actorFields, metadata } = input;
  return {
    eventId,
    eventType: parsed.eventType,
    eventVersion: parsed.eventVersion,
    occurredAt,
    ...actorFields,
    targetEntityType: parsed.target?.entityType,
    targetEntityId: parsed.target?.entityId,
    action: parsed.action,
    outcome: parsed.outcome as AuditOutcome,
    metadata,
    correlationId: parsed.correlationId,
  };
}
