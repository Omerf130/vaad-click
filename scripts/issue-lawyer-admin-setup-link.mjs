/**
 * Issues a single-use setup token and writes a local browser link (development only).
 * The raw token is NOT printed to stdout.
 *
 * Usage: node --env-file=.env.local scripts/issue-lawyer-admin-setup-link.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHmac, randomBytes } from "node:crypto";

import mongoose from "mongoose";

const SETUP_TOKEN_TTL_MS = 30 * 60 * 1000;
const LOCAL_DIR = ".local";
const LOCAL_LINK_FILE = "lawyer-admin-setup.url";

function resolveDatabaseName() {
  const explicit = process.env.MONGODB_DB_NAME?.trim();
  if (explicit) return explicit;
  const env = process.env.NODE_ENV ?? "development";
  if (env === "production") return "vaadclick";
  if (env === "test") return "vaadclick_test";
  return "vaadclick_dev";
}

function hashToken(rawToken, authSecret) {
  return createHmac("sha256", authSecret).update(rawToken).digest("hex");
}

const authSecret = process.env.AUTH_SECRET?.trim();
if (!authSecret || authSecret.length < 32) {
  console.error("AUTH_SECRET must be set (min 32 chars).");
  process.exit(1);
}

if ((process.env.NODE_ENV ?? "development") === "production") {
  console.error("Refusing to issue setup tokens in production.");
  process.exit(1);
}

const uri = process.env.MONGODB_URI?.trim();
if (!uri) {
  console.error("MONGODB_URI is not set.");
  process.exit(1);
}

const dbName = resolveDatabaseName();
const tokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { collection: "lawyer_admin_setup_tokens" },
);

const userSchema = new mongoose.Schema(
  {
    fullName: String,
    email: String,
    passwordHash: { type: String, select: false },
    role: String,
  },
  { collection: "users" },
);

try {
  await mongoose.connect(uri, { dbName });
  const User = mongoose.models.IssueSetupUser ?? mongoose.model("IssueSetupUser", userSchema);
  const SetupToken =
    mongoose.models.IssueSetupToken ?? mongoose.model("IssueSetupToken", tokenSchema);

  const admins = await User.find({ role: "lawyer_admin" }).select("+passwordHash").lean();
  if (admins.length !== 1 || admins[0].passwordHash) {
    console.error("Expected exactly one lawyer admin without a password hash.");
    process.exit(1);
  }

  const admin = admins[0];
  await SetupToken.deleteMany({ userId: admin._id, usedAt: null });

  const rawToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SETUP_TOKEN_TTL_MS);

  await SetupToken.create({
    userId: admin._id,
    tokenHash: hashToken(rawToken, authSecret),
    expiresAt,
    usedAt: null,
  });

  const baseUrl = process.env.LOCAL_APP_URL?.trim() || "http://localhost:3000";
  const setupUrl = `${baseUrl.replace(/\/$/, "")}/setup/lawyer-admin?token=${encodeURIComponent(rawToken)}`;

  const outDir = path.join(process.cwd(), LOCAL_DIR);
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, LOCAL_LINK_FILE), `${setupUrl}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });

  console.log("OK: Single-use setup link written to .local/lawyer-admin-setup.url");
  console.log("Open that file locally in your browser within 30 minutes.");
  console.log(`Database: ${dbName}`);
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
