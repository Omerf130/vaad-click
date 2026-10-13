import "server-only";

export type AppEnv = "development" | "test" | "production";

const AUTH_SECRET_MIN_LENGTH = 32;

function readNodeEnv(): AppEnv {
  const value = process.env.NODE_ENV;
  if (value === "production" || value === "test" || value === "development") {
    return value;
  }
  return "development";
}

export function getAppEnv(): AppEnv {
  return readNodeEnv();
}

export function isProduction(): boolean {
  return getAppEnv() === "production";
}

/**
 * Resolves MongoDB database name per environment.
 * Override with MONGODB_DB_NAME when using a single Atlas cluster for multiple envs.
 */
export function getMongoDatabaseName(): string {
  const explicit = process.env.MONGODB_DB_NAME?.trim();
  if (explicit) {
    return explicit;
  }

  const env = getAppEnv();
  if (env === "production") {
    return "vaadclick";
  }
  if (env === "test") {
    return "vaadclick_test";
  }
  return "vaadclick_dev";
}

export function getMongoUri(): string {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error("Missing required environment variable: MONGODB_URI");
  }
  return uri;
}

export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error("Missing required environment variable: AUTH_SECRET");
  }
  if (secret.length < AUTH_SECRET_MIN_LENGTH) {
    throw new Error("AUTH_SECRET must be at least 32 characters");
  }
  return secret;
}

/** Validates env vars needed for DB-backed auth operations. Call only at runtime (not during static import side effects). */
export function assertAuthDatabaseEnv(): void {
  getMongoUri();
  getAuthSecret();
}
