import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { createLocalMediaReference } from "@/services/local-filesystem-storage";

export const dynamic = "force-dynamic";

type LocalMediaRouteProps = {
  params: Promise<{
    path: string[];
  }>;
};

export async function GET(_request: Request, { params }: LocalMediaRouteProps) {
  const { path } = await params;
  const reference = createLocalMediaReference(path.map(decodeURIComponent).join("/"));

  try {
    const body = await readFile(reference.absolutePath);
    return new NextResponse(body, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": inferContentType(reference.relativePath)
      }
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}

function inferContentType(pathname: string) {
  const extension = pathname.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "svg":
      return "image/svg+xml";
    case "mp4":
      return "video/mp4";
    case "webm":
      return "video/webm";
    case "pdf":
      return "application/pdf";
    default:
      return "application/octet-stream";
  }
}
