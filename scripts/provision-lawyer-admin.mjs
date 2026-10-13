/**
 * One-time local provisioning for the initial lawyer administrator.
 *
 * Usage (interactive terminal required):
 *   npm run provision:lawyer-admin
 *
 * Optional identity args (password still prompted locally, never in argv):
 *   npm run provision:lawyer-admin -- --full-name "שם מלא" --email "you@example.com"
 *
 * Recovery (only when explicitly authorized):
 *   set ALLOW_LAWYER_ADMIN_REPROVISION=true
 */
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import argon2 from "argon2";
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
    const arg = argv[i];
    if (arg === "--full-name") {
      fullName = argv[i + 1] ?? "";
      i += 1;
    } else if (arg === "--email") {
      email = argv[i + 1] ?? "";
      i += 1;
    }
  }
  return { fullName: fullName.trim(), email: email.trim() };
}

function isCreateConfirmed(answer) {
  return answer.trim().toUpperCase() === "YES";
}

async function readHidden(prompt) {
  if (!input.isTTY) {
    throw new Error("Interactive terminal required for hidden password input.");
  }

  output.write(prompt);

  if (typeof input.setRawMode !== "function") {
    throw new Error("This terminal does not support hidden password input.");
  }

  input.setRawMode(true);
  input.resume();
  input.setEncoding("utf8");

  let value = "";
  return await new Promise((resolve, reject) => {
    const onData = (chunk) => {
      const char = chunk.toString("utf8");
      for (const ch of char) {
        if (ch === "\n" || ch === "\r" || ch === "\u0004") {
          input.setRawMode(false);
          input.pause();
          input.removeListener("data", onData);
          output.write("\n");
          resolve(value);
          return;
        }
        if (ch === "\u0003") {
          input.setRawMode(false);
          input.pause();
          input.removeListener("data", onData);
          reject(new Error("Input cancelled (Ctrl+C)."));
          return;
        }
        if (ch === "\u007f" || ch === "\b") {
          value = value.slice(0, -1);
          continue;
        }
        value += ch;
      }
    };
    input.on("data", onData);
  });
}

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 200 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, required: true, enum: Object.values(UserRole) },
    accountStatus: {
      type: String,
      required: true,
      enum: Object.values(AccountStatus),
      default: AccountStatus.ACTIVE,
    },
    emailVerifiedAt: { type: Date, default: null },
    mfa: {
      method: { type: String, default: undefined },
      enrolledAt: { type: Date, default: null },
    },
  },
  { timestamps: true, collection: "users" },
);

async function main() {
  if (!input.isTTY || !output.isTTY) {
    console.error(
      "This script must run in an interactive terminal (Cursor terminal or PowerShell).\n" +
        "Password entry is hidden and cannot run from a non-TTY pipe.",
    );
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    console.error("MONGODB_URI is not set.");
    process.exit(1);
  }

  const cli = parseArgs(process.argv.slice(2));
  const dbName = resolveDatabaseName();
  await mongoose.connect(uri, { dbName });

  const User =
    mongoose.models.ProvisionLawyerUser ??
    mongoose.model("ProvisionLawyerUser", userSchema);

  const allowReprovision =
    process.env.ALLOW_LAWYER_ADMIN_REPROVISION?.trim().toLowerCase() === "true";

  const existing = await User.countDocuments({ role: UserRole.LAWYER_ADMIN });
  if (existing > 0 && !allowReprovision) {
    console.error(
      `A lawyer administrator already exists (count: ${existing}). Aborting.\n` +
        "Authorized recovery only: set ALLOW_LAWYER_ADMIN_REPROVISION=true and rerun locally.",
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  const rl = readline.createInterface({ input, output, terminal: true });

  try {
    const fullName =
      cli.fullName || (await rl.question("Full name: ")).trim();
    const email = normalizeEmail(
      cli.email || (await rl.question("Email: ")),
    );

    const password = await readHidden("Password (hidden, min 12 chars): ");
    const confirm = await readHidden("Confirm password (hidden): ");

    if (!fullName || !email || !password) {
      console.error("All fields are required.");
      process.exit(1);
    }
    if (password !== confirm) {
      console.error("Passwords do not match.");
      process.exit(1);
    }
    if (password.length < 12) {
      console.error("Password must be at least 12 characters.");
      process.exit(1);
    }

    const confirmCreate = (
      await rl.question(
        `\nCreate lawyer_admin for ${email}?\nType YES to confirm (anything else cancels): `,
      )
    ).trim();

    if (!isCreateConfirmed(confirmCreate)) {
      console.log(
        `Cancelled — no account created. (You entered "${confirmCreate || "(empty)"}"; confirmation must be exactly YES.)`,
      );
      process.exit(0);
    }

    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    await User.create({
      fullName,
      email,
      passwordHash,
      role: UserRole.LAWYER_ADMIN,
      accountStatus: AccountStatus.ACTIVE,
      emailVerifiedAt: null,
      mfa: { enrolledAt: null },
    });

    const afterCount = await User.countDocuments({ role: UserRole.LAWYER_ADMIN });
    console.log("Lawyer administrator created successfully.");
    console.log(`Database: ${dbName}`);
    console.log(`Lawyer administrator accounts: ${afterCount}`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Cancelled")) {
      console.error(error.message);
      process.exit(1);
    }
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      console.error(
        "Could not create account: email already in use. Use a different email or log in with the existing account.",
      );
      process.exit(1);
    }
    throw error;
  } finally {
    rl.close();
    await mongoose.disconnect().catch(() => undefined);
  }
}

await main();
