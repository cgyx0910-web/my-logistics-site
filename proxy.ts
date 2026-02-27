import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

export function proxy(request: NextRequest) {
  return intlMiddleware(request);
}

/** 不匹配 /api、_next、_vercel、静态资源，故 /api/supabase 及 Auth 的 Set-Cookie 响应不会被中间件拦截，可完整透传回浏览器 */
export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
