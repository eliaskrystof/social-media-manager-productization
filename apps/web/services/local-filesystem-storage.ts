import path from "node:path";

export type LocalMediaReference = {
  provider: "local_fs";
  root: string;
  relativePath: string;
  absolutePath: string;
};

export function getLocalMediaRoot() {
  return process.env.LOCAL_MEDIA_ROOT ?? ".local-media";
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
