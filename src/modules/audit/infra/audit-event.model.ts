import "server-only";

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

import { AuditActorType } from "@/shared/audit/domain/audit-actor-type";
import { AUDIT_OUTCOMES } from "@/shared/audit/domain/audit-outcome";
import { UserRole } from "@/modules/users/domain/user-role";
import { installAuditEventImmutabilityGuards } from "@/modules/audit/infra/audit-event-immutability";

const auditEventSchema = new Schema(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    eventType: { type: String, required: true, index: true },
    eventVersion: { type: Number, required: true, default: 1 },
    occurredAt: { type: Date, required: true, index: true },
    actorType: {
      type: String,
      required: true,
      enum: Object.values(AuditActorType),
      index: true,
    },
    actorUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    actorRole: {
      type: String,
      required: false,
      enum: Object.values(UserRole),
    },
    actorExternalId: { type: String, required: false, maxlength: 128 },
    actorSystemComponent: { type: String, required: false, maxlength: 120 },
    targetEntityType: { type: String, required: false, maxlength: 64, index: true },
    targetEntityId: { type: String, required: false, maxlength: 128, index: true },
    action: { type: String, required: true, maxlength: 120 },
    outcome: {
      type: String,
      required: true,
      enum: AUDIT_OUTCOMES,
    },
    metadata: { type: Schema.Types.Mixed, required: false, default: undefined },
    correlationId: { type: String, required: false, maxlength: 128, index: true },
  },
  {
    timestamps: false,
    collection: "audit_events",
    strict: "throw",
  },
);

installAuditEventImmutabilityGuards(auditEventSchema);

auditEventSchema.index({ occurredAt: -1 });
auditEventSchema.index({ eventType: 1, occurredAt: -1 });
auditEventSchema.index({ actorUserId: 1, occurredAt: -1 });
auditEventSchema.index({ targetEntityType: 1, targetEntityId: 1, occurredAt: -1 });

export type AuditEventDocument = InferSchemaType<typeof auditEventSchema> & {
  _id: mongoose.Types.ObjectId;
};

export type AuditEventModel = Model<AuditEventDocument>;

export const AuditEvent: AuditEventModel =
  (mongoose.models.AuditEvent as AuditEventModel | undefined) ??
  mongoose.model<AuditEventDocument>("AuditEvent", auditEventSchema);
