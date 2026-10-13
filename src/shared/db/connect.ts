import "server-only";

import mongoose from "mongoose";

import { getAppEnv, getMongoDatabaseName, getMongoUri } from "@/shared/config/env.server";
import { toSafeMongoConnectionError } from "@/shared/db/sanitize-mongo-error";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var __vaadclickMongoose: MongooseCache | undefined;
}

const cached: MongooseCache = global.__vaadclickMongoose ?? {
  conn: null,
  promise: null,
};

if (getAppEnv() !== "production") {
  global.__vaadclickMongoose = cached;
}

/**
 * Establishes a Mongoose connection. Reuses the same connection in development
 * across hot reloads. Does not run on module import — call from server runtime only.
 */
export async function connectMongo(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const uri = getMongoUri();
    const dbName = getMongoDatabaseName();

    cached.promise = mongoose
      .connect(uri, {
        dbName,
        maxPoolSize: 10,
        autoIndex: getAppEnv() !== "production",
      })
      .then((instance) => instance)
      .catch((error: unknown) => {
        cached.promise = null;
        throw toSafeMongoConnectionError(error);
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export async function disconnectMongo(): Promise<void> {
  if (cached.conn) {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
  }
}
