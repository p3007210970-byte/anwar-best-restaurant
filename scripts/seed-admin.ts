import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import bcrypt from "bcryptjs";
import { getDb } from "../src/lib/db";

loadEnvConfig(process.cwd());

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const secret = process.env.SESSION_SECRET;

async function main() {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Set a valid ADMIN_EMAIL in .env.local before creating the owner account.");
  }
  if (!password || password.length < 12 || password.toLowerCase().includes("replace")) {
    throw new Error("Set a unique ADMIN_PASSWORD of at least 12 characters in .env.local.");
  }
  if (!secret || secret.length < 32) {
    throw new Error("Set SESSION_SECRET to a random value of at least 32 characters in .env.local.");
  }

  const db = getDb();
  const existing = db.prepare("SELECT id FROM admins LIMIT 1").get();
  if (existing) {
    throw new Error("An owner account already exists. This setup command will not overwrite it.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  db.prepare("INSERT INTO admins (id, email, password_hash) VALUES (?, ?, ?)").run(
    randomUUID(),
    email,
    passwordHash,
  );

  console.log(`Owner account created for ${email}.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
