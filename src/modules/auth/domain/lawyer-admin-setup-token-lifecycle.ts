export const LAWYER_ADMIN_SETUP_TOKEN_TTL_MS = 30 * 60 * 1000;

export type SetupTokenRecord = {
  userId: string;
  expiresAt: Date;
  usedAt: Date | null;
};

export function isSetupTokenActive(record: SetupTokenRecord, now: Date = new Date()): boolean {
  if (record.usedAt) {
    return false;
  }
  return record.expiresAt.getTime() > now.getTime();
}

export function computeSetupTokenExpiresAt(now: Date = new Date()): Date {
  return new Date(now.getTime() + LAWYER_ADMIN_SETUP_TOKEN_TTL_MS);
}
