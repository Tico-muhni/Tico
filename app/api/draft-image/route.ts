import { NextRequest, NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";

// Streams a stored post image back as a file download, so saving it never depends on
// the storage host's CORS settings. Only our own Blob hosts are allowed (no open proxy).
export async function GET(req: NextRequest) {
  if (!(await currentUserId())) return new NextResponse("Unauthorized", { status: 401 });

  const raw = req.nextUrl.searchParams.get("url") ?? "";
  const name = (req.nextUrl.searchParams.get("name") ?? "post.png").replace(/[^\w.-]/g, "_");
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return new NextResponse("Bad url", { status: 400 });
  }
  if (url.protocol !== "https:" || !url.hostname.endsWith(".public.blob.vercel-storage.com")) {
    return new NextResponse("Forbidden host", { status: 403 });
  }

  const upstream = await fetch(url).catch(() => null);
  if (!upstream || !upstream.ok || !upstream.body) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/png",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
