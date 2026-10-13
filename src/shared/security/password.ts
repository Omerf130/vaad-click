import argon2 from "argon2";

import { passwordInputSchema } from "@/shared/security/password.schema";

export async function hashPassword(plainPassword: string): Promise<string> {
  const parsed = passwordInputSchema.parse(plainPassword);
  return argon2.hash(parsed, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(
  plainPassword: string,
  passwordHash: string,
): Promise<boolean> {
  if (!passwordHash) {
    return false;
  }

  try {
    return await argon2.verify(passwordHash, plainPassword);
  } catch {
    return false;
  }
}
