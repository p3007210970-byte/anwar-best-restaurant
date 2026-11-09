import { createHash } from "node:crypto";
import { getDb } from "@/lib/db";

function addressHash(address: string): string {
  const salt =
    process.env.RATE_LIMIT_SALT ??
    process.env.SESSION_SECRET ??
    "anwar-best-restaurant-local-rate-limit";
  return createHash("sha256").update(`${salt}\0${address}`).digest("hex");
}

function requestAddress(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return (
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function allowReservationAttempt(request: Request): boolean {
  const db = getDb();
  const address = addressHash(requestAddress(request));
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - 15 * 60;

  db.prepare("DELETE FROM reservation_attempts WHERE attempted_at < ?").run(windowStart);
  const count = db
    .prepare(
      "SELECT COUNT(*) AS count FROM reservation_attempts WHERE address_hash = ? AND attempted_at >= ?",
    )
    .get(address, windowStart) as { count: number };
  if (count.count >= 5) return false;

  db.prepare("INSERT INTO reservation_attempts (address_hash, attempted_at) VALUES (?, ?)").run(
    address,
    now,
  );
  return true;
}

export function isLoginRateLimited(request: Request, email: string): boolean {
  const db = getDb();
  const address = addressHash(requestAddress(request));
  const normalizedEmail = email.trim().toLowerCase();
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - 15 * 60;

  db.prepare("DELETE FROM login_attempts WHERE attempted_at < ?").run(windowStart);
  const count = db
    .prepare(
      `SELECT COUNT(*) AS count FROM login_attempts
       WHERE email = ? AND address_hash = ? AND attempted_at >= ?`,
    )
    .get(normalizedEmail, address, windowStart) as { count: number };
  return count.count >= 5;
}

export function recordFailedLogin(request: Request, email: string): void {
  const address = addressHash(requestAddress(request));
  getDb()
    .prepare(
      "INSERT INTO login_attempts (email, address_hash, attempted_at) VALUES (?, ?, ?)",
    )
    .run(email.trim().toLowerCase(), address, Math.floor(Date.now() / 1000));
}
