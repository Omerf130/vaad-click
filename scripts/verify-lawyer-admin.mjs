/**
 * Verifies lawyer admin exists with expected fields (no secrets/hashes printed).
 * Usage: node --env-file=.env.local scripts/verify-lawyer-admin.mjs [email]
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

const emailFilter = process.argv[2]?.trim().toLowerCase();
const uri = process.env.MONGODB_URI?.trim();
if (!uri) {
  console.error("FAIL: MONGODB_URI is not set.");
  process.exit(1);
}

const dbName = resolveDatabaseName();

try {
  await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 10000 });
  const query = { role: "lawyer_admin" };
  if (emailFilter) {
    query.email = emailFilter;
  }

  const admins = await mongoose.connection.db
    .collection("users")
    .find(query, {
      projection: {
        fullName: 1,
        email: 1,
        role: 1,
        accountStatus: 1,
        passwordHash: 1,
      },
    })
    .toArray();

  console.log(`Database: ${dbName}`);
  console.log(`Lawyer administrator accounts: ${admins.length}`);

  for (const admin of admins) {
    const hasHash =
      typeof admin.passwordHash === "string" && admin.passwordHash.length > 0;
    console.log(
      `- ${admin.fullName} <${admin.email}> role=${admin.role} status=${admin.accountStatus} passwordStoredAsHash=${hasHash}`,
    );
  }
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
