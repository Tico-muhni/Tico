import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { canvaConnections } from "@/drizzle/schema";

// CANVA_API_BASE only exists so tests can point at a fake server.
const CANVA_BASE = process.env.CANVA_API_BASE ?? "https://api.canva.com/rest/v1";
export const CANVA_SCOPES = "design:content:read design:meta:read asset:read folder:read";

export type Thumb = { url: string; width: number; height: number };

const basicAuth = () => {
  const id = process.env.CANVA_CLIENT_ID;
  const secret = process.env.CANVA_CLIENT_SECRET;
  if (!id || !secret) throw new Error("חסרים CANVA_CLIENT_ID ו-CANVA_CLIENT_SECRET");
  return `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`;
};

export const canvaConfigured = () =>
  Boolean(process.env.CANVA_CLIENT_ID && process.env.CANVA_CLIENT_SECRET);

export async function isCanvaConnected(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: canvaConnections.userId })
    .from(canvaConnections)
    .where(eq(canvaConnections.userId, userId))
    .limit(1);
  return Boolean(row);
}

export async function saveCanvaTokens(
  userId: string,
  t: { access_token: string; refresh_token?: string | null; expires_in?: number },
) {
  const expiresAt = new Date(Date.now() + (t.expires_in ?? 3600) * 1000);
  await db
    .insert(canvaConnections)
    .values({ userId, accessToken: t.access_token, refreshToken: t.refresh_token ?? null, expiresAt })
    .onConflictDoUpdate({
      target: canvaConnections.userId,
      set: {
        accessToken: t.access_token,
        // Canva rotates refresh tokens; keep the old one only if none was returned.
        ...(t.refresh_token ? { refreshToken: t.refresh_token } : {}),
        expiresAt,
        updatedAt: new Date(),
      },
    });
}

export async function exchangeCode(code: string, redirectUri: string, codeVerifier: string) {
  const res = await fetch(`${CANVA_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: basicAuth() },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });
  const json = await res.json();
  if (!res.ok || !json.access_token) throw new Error("token_exchange");
  return json as { access_token: string; refresh_token?: string; expires_in?: number };
}

async function getToken(userId: string): Promise<string> {
  const [conn] = await db
    .select()
    .from(canvaConnections)
    .where(eq(canvaConnections.userId, userId))
    .limit(1);
  if (!conn) throw new Error("Canva לא מחובר. יש ללחוץ על \"חבר קנבה\".");

  // Refresh a minute early so a token never expires mid-request.
  if (conn.expiresAt && conn.expiresAt.getTime() - 60_000 < Date.now()) {
    if (!conn.refreshToken) throw new Error("החיבור לקנבה פג תוקף. יש להתחבר מחדש.");
    const res = await fetch(`${CANVA_BASE}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: basicAuth() },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: conn.refreshToken }),
    });
    const json = await res.json();
    if (!res.ok || !json.access_token) throw new Error("לא ניתן לחדש את החיבור לקנבה. יש להתחבר מחדש.");
    await saveCanvaTokens(userId, json);
    return json.access_token as string;
  }
  return conn.accessToken;
}

async function canva(userId: string, path: string, init?: RequestInit) {
  const token = await getToken(userId);
  const res = await fetch(`${CANVA_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || `שגיאת Canva (${res.status})`);
  return json;
}

export type CanvaItem = { type: "folder" | "design"; id: string; name: string; thumbnail?: Thumb };

export async function listFolderItems(userId: string, folderId = "root", continuation?: string) {
  const params = new URLSearchParams({ item_types: "folder,design" });
  if (continuation) params.set("continuation", continuation);
  const json = await canva(userId, `/folders/${encodeURIComponent(folderId)}/items?${params}`);
  const items: CanvaItem[] = (json.items ?? []).map((item: Record<string, unknown>) => {
    const type = item.type as CanvaItem["type"];
    const inner = ((item as Record<string, Record<string, unknown>>)[type] ?? {}) as Record<string, unknown>;
    return {
      type,
      id: inner.id as string,
      name: (inner.name ?? inner.title ?? "ללא שם") as string,
      thumbnail: inner.thumbnail as Thumb | undefined,
    };
  });
  return { items, continuation: json.continuation as string | undefined };
}

export async function searchDesigns(userId: string, query: string, continuation?: string) {
  const params = new URLSearchParams({ query, ownership: "owned" });
  if (continuation) params.set("continuation", continuation);
  const json = await canva(userId, `/designs?${params}`);
  const items: CanvaItem[] = (json.items ?? []).map((d: Record<string, unknown>) => ({
    type: "design" as const,
    id: d.id as string,
    name: (d.title ?? "ללא שם") as string,
    thumbnail: d.thumbnail as Thumb | undefined,
  }));
  return { items, continuation: json.continuation as string | undefined };
}

export type CanvaPage = { index: number; thumbnail?: Thumb };

export async function getDesignPages(userId: string, designId: string): Promise<CanvaPage[]> {
  const json = await canva(userId, `/designs/${encodeURIComponent(designId)}/pages`).catch(() => null);
  const pages = (json?.items ?? []) as Record<string, unknown>[];
  if (pages.length) {
    return pages.map((p, i) => ({
      index: (p.index as number) ?? i + 1,
      thumbnail: p.thumbnail as Thumb | undefined,
    }));
  }
  // Fall back to a single page (the design's own thumbnail).
  const d = await canva(userId, `/designs/${encodeURIComponent(designId)}`);
  return [{ index: 1, thumbnail: d.design?.thumbnail as Thumb | undefined }];
}

/** Exports one page of a design as PNG and returns the (short-lived) download URL. */
export async function exportDesignPage(userId: string, designId: string, page: number): Promise<string> {
  const json = await canva(userId, "/exports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ design_id: designId, format: { type: "png", pages: [page] } }),
  });
  const exportId = json.job?.id as string | undefined;
  if (!exportId) throw new Error("Canva לא החזיר מזהה ייצוא");

  for (let i = 0; i < 25; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const poll = await canva(userId, `/exports/${exportId}`);
    if (poll.job?.status === "success" && poll.job.urls?.length) {
      const urls = poll.job.urls as string[];
      // Normally one URL for the one requested page; if all pages came back, pick ours.
      return urls.length > 1 ? (urls[page - 1] ?? urls[0]) : urls[0];
    }
    if (poll.job?.status === "failed") throw new Error("הייצוא מקנבה נכשל");
  }
  throw new Error("הייצוא מקנבה לקח יותר מדי זמן");
}
