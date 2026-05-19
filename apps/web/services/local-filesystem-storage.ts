import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

export type LocalMediaReference = {
  provider: "local_fs";
  root: string;
  relativePath: string;
  absolutePath: string;
};

export function getLocalMediaRoot() {
  return process.env.LOCAL_MEDIA_ROOT ?? getDefaultLocalMediaRoot();
}

export function createLocalMediaReference(relativePath: string): LocalMediaReference {
  const root = getLocalMediaRoot();
  const rootPath = path.resolve(root);
  const absolutePath = path.resolve(rootPath, relativePath);

  if (!absolutePath.startsWith(`${rootPath}${path.sep}`) && absolutePath !== rootPath) {
    throw new Error("Local media path must stay inside LOCAL_MEDIA_ROOT.");
  }

  return {
    provider: "local_fs",
    root,
    relativePath,
    absolutePath
  };
}

export type StoredLocalMedia = LocalMediaReference & {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  publicUrl: string;
};

export async function storeLocalMediaFile(file: File, relativeDirectory: string): Promise<StoredLocalMedia> {
  if (file.size === 0) {
    throw new Error("Media file is empty.");
  }

  const safeName = createSafeFilename(file.name || "media");
  const relativePath = path.posix.join(normalizeRelativeDirectory(relativeDirectory), `${crypto.randomUUID()}-${safeName}`);
  const reference = createLocalMediaReference(relativePath);

  await mkdir(path.dirname(reference.absolutePath), { recursive: true });
  await writeFile(reference.absolutePath, Buffer.from(await file.arrayBuffer()));

  return {
    ...reference,
    filename: safeName,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    publicUrl: `/local-media/${reference.relativePath.split("/").map(encodeURIComponent).join("/")}`
  };
}

export function getMediaTypeFromMime(mimeType: string) {
  if (mimeType.startsWith("image/")) {
    return "image";
  }

  if (mimeType.startsWith("video/")) {
    return "video";
  }

  if (mimeType === "application/pdf" || mimeType.startsWith("text/")) {
    return "document";
  }

  return "other";
}

function normalizeRelativeDirectory(value: string) {
  return value
    .split(/[\\/]+/)
    .map((segment) => createSafeFilename(segment))
    .filter(Boolean)
    .join("/");
}

function createSafeFilename(value: string) {
  const safe = value
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return safe || "media";
}

function getDefaultLocalMediaRoot() {
  const cwd = process.cwd();
  const parent = path.basename(path.dirname(cwd));
  const current = path.basename(cwd);

  if (parent === "apps" && current === "web") {
    return path.resolve(cwd, "..", "..", ".local-media");
  }

  return path.resolve(cwd, ".local-media");
}
