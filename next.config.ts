import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/**
 * Supabase 代理：由 app/api/supabase/[[...path]]/route.ts 实现，
 * 将 /api/supabase/* 转发到 NEXT_PUBLIC_SUPABASE_URL，并转发 Cookie、Authorization 等头信息，
 * 便于大陆用户经 Vercel 域名访问新加坡 Supabase。
 */
const nextConfig: NextConfig = {
  /* config options here */
};

export default withNextIntl(nextConfig);
