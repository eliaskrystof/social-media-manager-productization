import "server-only";

import { createCipheriv, createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

loadRootEnv();

export function encryptLocalCredential(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getCredentialKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `v1:${iv.toString("base64url")}:${authTag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

export function hasExplicitCredentialEncryptionKey() {
  return Boolean(process.env.LOCAL_CREDENTIAL_ENCRYPTION_KEY?.trim());
}

export function createSecretRef(platform: string, externalAccountId: string) {
  return `local:${platform}:${externalAccountId || "manual"}:${Date.now().toString(36)}`;
}

function getCredentialKey() {
  const secret =
    process.env.LOCAL_CREDENTIAL_ENCRYPTION_KEY ??
    process.env.LOCAL_SESSION_SECRET ??
    process.env.DATABASE_URL ??
    "orchard-local-development-credential-secret";

  return createHash("sha256").update(secret).digest();
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
