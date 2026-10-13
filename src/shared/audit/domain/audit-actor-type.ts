export const AuditActorType = {
  USER: "user",
  SYSTEM: "system",
  EXTERNAL: "external",
} as const;

export type AuditActorType = (typeof AuditActorType)[keyof typeof AuditActorType];
