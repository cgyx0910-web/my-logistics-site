import { NextResponse } from "next/server";

/**
 * 用于快速排查「Failed to fetch」：访问 /api/supabase-proxy-health 可确认
 * Vercel 上 NEXT_PUBLIC_SUPABASE_URL 与 NEXT_PUBLIC_SUPABASE_ANON_KEY 是否已配置。
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    return NextResponse.json({ ok: true, message: "Supabase 代理环境变量已配置" });
  }
  const missing: string[] = [];
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!key) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return NextResponse.json(
    { ok: false, message: "缺少环境变量", missing },
    { status: 502 }
  );
}
