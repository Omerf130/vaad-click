/**
 * Read-only check — counts lawyer_admin users (no secrets printed).
 * Usage: node --env-file=.env.local scripts/count-lawyer-admins.mjs
 */
import mongoose from "mongoose";

function resolveDatabaseName() {
  const explicit = process.env.MONGODB_DB_NAME?.trim();
  if (explicit) return explicit;
  const env = process.env.NODE_ENV ?? "development";
  if (env === "production") return "vaadclick";
  if (env === "test") return "vaadclick_test";
  return "vaadclick_dev";
}

const uri = process.env.MONGODB_URI?.trim();
if (!uri) {
  console.error("FAIL: MONGODB_URI is not set.");
  process.exit(1);
}

const dbName = resolveDatabaseName();

try {
  await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 10000 });
  const count = await mongoose.connection.db
    .collection("users")
    .countDocuments({ role: "lawyer_admin" });
  console.log(`OK: MongoDB connected. Database: ${dbName}`);
  console.log(`Lawyer administrator accounts: ${count}`);
} catch (error) {
  const message =
    error instanceof Error
      ? error.message.replace(/mongodb(\+srv)?:\/\/[^\s]+/gi, "mongodb://[redacted]")
      : "Unknown error";
  console.error(`FAIL: ${message}`);
  process.exit(1);
} finally {
  await mongoose.disconnect().catch(() => undefined);
}
