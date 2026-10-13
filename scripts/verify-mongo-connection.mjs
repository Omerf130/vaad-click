/**
 * Local-only connectivity check. Does not read/write application collections.
 * Usage: node --env-file=.env.local scripts/verify-mongo-connection.mjs
 */
import mongoose from "mongoose";

function resolveDatabaseName() {
  const explicit = process.env.MONGODB_DB_NAME?.trim();
  if (explicit) {
    return explicit;
  }
  const env = process.env.NODE_ENV ?? "development";
  if (env === "production") return "vaadclick";
  if (env === "test") return "vaadclick_test";
  return "vaadclick_dev";
}

async function main() {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    console.error("FAIL: MONGODB_URI is not set.");
    process.exit(1);
  }

  const dbName = resolveDatabaseName();
  try {
    await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 10000 });
    await mongoose.connection.db.admin().command({ ping: 1 });
    console.log("OK: MongoDB connection successful.");
    console.log(`Effective database name: ${dbName}`);
    console.log(`Ready state: ${mongoose.connection.readyState}`);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message.replace(/mongodb(\+srv)?:\/\/[^\s]+/gi, "mongodb://[redacted]")
        : "Unknown connection error";
    console.error(`FAIL: ${message}`);
    process.exit(1);
  } finally {
    await mongoose.disconnect().catch(() => undefined);
  }
}

await main();
