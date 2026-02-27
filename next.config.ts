import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/**
 * Supabase 代理：由 app/api/supabase/[[...path]]/route.ts 实现（未使用 rewrites）。
 * 若将来改用 rewrites，destination 必须避免双斜杠（如 NEXT_PUBLIC_SUPABASE_URL 去尾斜杠后再拼接 path）。
 * 环境变量仅在 API 路由中读取，不在此 config 中引用。
 */
const nextConfig: NextConfig = {
  /* config options here */
};

export default withNextIntl(nextConfig);
