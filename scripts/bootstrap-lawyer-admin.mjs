/**
 * Non-interactive bootstrap: creates first lawyer_admin WITHOUT a password.
 * Password is set in the browser at /setup/lawyer-admin (development only).
 *
 * Agent/local usage (identity only — never pass passwords here):
 *   node --env-file=.env.local scripts/bootstrap-lawyer-admin.mjs --full-name "Name" --email "a@b.co"
 */
import mongoose from "mongoose";

const UserRole = { LAWYER_ADMIN: "lawyer_admin" };
const AccountStatus = { ACTIVE: "active" };

function normalizeEmail(raw) {
  return raw.normalize("NFKC").trim().toLowerCase();
}

function resolveDatabaseName() {
  const explicit = process.env.MONGODB_DB_NAME?.trim();
  if (explicit) return explicit;
  const env = process.env.NODE_ENV ?? "development";
  if (env === "production") return "vaadclick";
  if (env === "test") return "vaadclick_test";
  return "vaadclick_dev";
}

function parseArgs(argv) {
  let fullName = "";
  let email = "";
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--full-name") {
      fullName = argv[i + 1] ?? "";
      i += 1;
    } else if (argv[i] === "--email") {
      email = argv[i + 1] ?? "";
      i += 1;
    }
  }
  return { fullName: fullName.trim(), email: email.trim() };
}

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 200 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: false, select: false },
    role: { type: String, required: true, enum: Object.values(UserRole) },
    accountStatus: {
      type: String,
      required: true,
      enum: Object.values(AccountStatus),
      default: AccountStatus.ACTIVE,
    },
    emailVerifiedAt: { type: Date, default: null },
    mfa: { method: { type: String }, enrolledAt: { type: Date, default: null } },
  },
  { timestamps: true, collection: "users" },
);

const cli = parseArgs(process.argv.slice(2));
if (!cli.fullName || !cli.email) {
  console.error("Usage: --full-name \"...\" --email \"...\"");
  process.exit(1);
}

const uri = process.env.MONGODB_URI?.trim();
if (!uri) {
  console.error("MONGODB_URI is not set.");
  process.exit(1);
}

const dbName = resolveDatabaseName();

try {
  await mongoose.connect(uri, { dbName });
  const User = mongoose.models.BootstrapUser ?? mongoose.model("BootstrapUser", userSchema);

  const existing = await User.countDocuments({ role: UserRole.LAWYER_ADMIN });
  if (existing > 0) {
    console.error(`Lawyer administrator already exists (count: ${existing}).`);
    process.exit(1);
  }

  const email = normalizeEmail(cli.email);
  await User.create({
    fullName: cli.fullName,
    email,
    role: UserRole.LAWYER_ADMIN,
    accountStatus: AccountStatus.ACTIVE,
    emailVerifiedAt: null,
    mfa: { enrolledAt: null },
  });

  console.log("OK: Initial lawyer administrator bootstrapped (password not set).");
  console.log(`Database: ${dbName}`);
  console.log(`Email: ${email}`);
  console.log("Next: open /setup/lawyer-admin in local dev to choose a password.");
} catch (error) {
  if (error && typeof error === "object" && "code" in error && error.code === 11000) {
    console.error("Email already registered. Use login or a different email.");
    process.exit(1);
  }
  const message =
    error instanceof Error
      ? error.message.replace(/mongodb(\+srv)?:\/\/[^\s]+/gi, "mongodb://[redacted]")
      : "Unknown error";
  console.error(`FAIL: ${message}`);
  process.exit(1);
} finally {
  await mongoose.disconnect().catch(() => undefined);
}
