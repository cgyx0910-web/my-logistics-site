import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/**
 * Supabase 代理：由 app/api/supabase/[[...path]]/route.ts 实现（未使用 rewrites），
 * 将 /api/supabase/* 转发到 NEXT_PUBLIC_SUPABASE_URL，并转发 Cookie、Authorization 等头信息。
 * 环境变量 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 仅在 API 路由中读取，不在此 config 中引用。
 */
const nextConfig: NextConfig = {
  /* config options here */
};

export default withNextIntl(nextConfig);
