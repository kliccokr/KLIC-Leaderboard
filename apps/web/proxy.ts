import { NextRequest, NextResponse } from "next/server";
import createIntlProxy from "next-intl/middleware";
import { routing } from "@/lib/i18n/routing";
import { auth } from "./auth";

const intlProxy = createIntlProxy(routing);

export function proxy(request: NextRequest) {
  const { pathname } = new URL(request.url);

  // Skip API, CLI, static files, _next
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/cli") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // If pathname already has a locale prefix, pass to auth
  const pathnameHasLocale = routing.locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (!pathnameHasLocale) {
    // No locale prefix → redirect to /ko/..., then check auth
    return intlProxy(request);
  }

  // Auth check via NextAuth authorized callback
  return auth(request as any);
}

export const config = {
  matcher: ["/((?!_vercel|.*\\..*).*)"],
};
