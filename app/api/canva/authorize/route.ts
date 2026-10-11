import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { currentUserId } from "@/lib/auth";
import { CANVA_SCOPES, canvaConfigured } from "@/lib/canva";

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  if (!(await currentUserId())) return NextResponse.redirect(new URL("/admin/login", origin));
  if (!canvaConfigured()) return NextResponse.redirect(`${origin}/admin/canva?canva=error&reason=missing_config`);

  const state = crypto.randomBytes(16).toString("hex");
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.CANVA_CLIENT_ID as string,
    // Must match the redirect URL registered in the Canva developer portal.
    redirect_uri: `${origin}/api/canva/callback`,
    scope: CANVA_SCOPES,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  const res = NextResponse.redirect(`https://www.canva.com/api/oauth/authorize?${params}`);
  const cookie = { httpOnly: true, secure: true, sameSite: "lax" as const, maxAge: 600, path: "/" };
  res.cookies.set("canva_oauth_state", state, cookie);
  res.cookies.set("canva_code_verifier", codeVerifier, cookie);
  return res;
}
