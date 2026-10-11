import { NextRequest, NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { exchangeCode, saveCanvaTokens } from "@/lib/canva";

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const userId = await currentUserId();
  if (!userId) return NextResponse.redirect(new URL("/admin/login", origin));

  const back = (q: string) => {
    const res = NextResponse.redirect(`${origin}/admin/canva?${q}`);
    res.cookies.delete("canva_oauth_state");
    res.cookies.delete("canva_code_verifier");
    return res;
  };

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const verifier = req.cookies.get("canva_code_verifier")?.value;
  if (!code || !state || state !== req.cookies.get("canva_oauth_state")?.value || !verifier) {
    return back("canva=error&reason=invalid_state");
  }

  try {
    await saveCanvaTokens(userId, await exchangeCode(code, `${origin}/api/canva/callback`, verifier));
  } catch {
    return back("canva=error&reason=token_exchange");
  }
  return back("canva=connected");
}
