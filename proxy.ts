import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// This is the Next.js "Proxy" (formerly Middleware). It sits in front of every
// request, so it must stay lightweight and must NOT import the full NextAuth
// setup (which pulls in bcryptjs and the credentials provider) - importing that
// here crashes the proxy at load on the server runtime and 500s the whole site.
//
// Instead we do a lightweight gate: check for the presence of the Auth.js
// session cookie to decide redirects. Real authentication is still enforced by
// `auth()` inside the admin pages and server actions (Node runtime), so this is
// only a first-pass redirect, not the security boundary.
const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

export default function proxy(req: NextRequest) {
  const isLoggedIn = SESSION_COOKIES.some((name) => req.cookies.has(name));
  const isLoginPage = req.nextUrl.pathname === "/admin/login";

  if (!isLoggedIn && !isLoginPage) {
    const loginUrl = new URL("/admin/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/admin/rtm", req.nextUrl.origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
