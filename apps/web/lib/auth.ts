import "server-only";

import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@orchard/database";

loadRootEnv();

const sessionCookieName = "orchard_session";
const sessionDurationMs = 1000 * 60 * 60 * 24 * 30;
const passwordIterations = 210_000;

type LocalSessionPayload = {
  expiresAt: string;
  userId: string;
};

export type AuthenticatedUser = typeof schema.users.$inferSelect;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function hashPassword(password: string, salt = randomBytes(16).toString("base64url")) {
  const passwordHash = pbkdf2Sync(password, salt, passwordIterations, 64, "sha256").toString("base64url");
  return { passwordHash, passwordIterations, passwordSalt: salt };
}

export function verifyPassword(password: string, salt: string, iterations: number, expectedHash: string) {
  const candidate = pbkdf2Sync(password, salt, iterations, 64, "sha256").toString("base64url");
  const expectedBuffer = Buffer.from(expectedHash);
  const candidateBuffer = Buffer.from(candidate);

  return expectedBuffer.length === candidateBuffer.length && timingSafeEqual(expectedBuffer, candidateBuffer);
}

export async function getSessionUserId() {
  const cookieStore = await cookies();
  const rawCookie = cookieStore.get(sessionCookieName)?.value;

  if (!rawCookie) {
    return null;
  }

  const [encodedPayload, signature] = rawCookie.split(".");

  if (!encodedPayload || !signature || signPayload(encodedPayload) !== signature) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as LocalSessionPayload;

    if (!payload.userId || !payload.expiresAt || new Date(payload.expiresAt).getTime() <= Date.now()) {
      return null;
    }

    return payload.userId;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const userId = await getSessionUserId();

  if (!userId) {
    return null;
  }

  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  return user ?? null;
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function setSessionCookie(userId: string) {
  const expiresAt = new Date(Date.now() + sessionDurationMs);
  const payload = Buffer.from(JSON.stringify({ expiresAt: expiresAt.toISOString(), userId })).toString("base64url");
  const cookieStore = await cookies();

  cookieStore.set(sessionCookieName, `${payload}.${signPayload(payload)}`, {
    expires: expiresAt,
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookieName);
}

function signPayload(encodedPayload: string) {
  return createHmac("sha256", getSessionSecret()).update(encodedPayload).digest("base64url");
}

function getSessionSecret() {
  return process.env.LOCAL_SESSION_SECRET ?? process.env.DATABASE_URL ?? "orchard-local-development-session-secret";
}

function loadRootEnv() {
  const serviceDirectory = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    process.env.INIT_CWD,
    process.cwd(),
    path.resolve(process.cwd(), "../.."),
    path.resolve(serviceDirectory, "../../..")
  ].filter(Boolean) as string[];

  const rootDirectories = [...new Set(candidates.map((candidate) => path.resolve(candidate)))];

  for (const rootDirectory of rootDirectories) {
    loadEnvFile(path.join(rootDirectory, ".env"));
    loadEnvFile(path.join(rootDirectory, ".env.local"));
  }
}

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const file = fs.readFileSync(filePath, "utf8");

  for (const line of file.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = unquoteEnvValue(trimmed.slice(separatorIndex + 1).trim());

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function unquoteEnvValue(value: string) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  return value;
}
