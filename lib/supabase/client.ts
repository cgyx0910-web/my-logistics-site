import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  throw new Error(
    "缺少 Supabase 环境变量：请设置 NEXT_PUBLIC_SUPABASE_ANON_KEY（参见 .env.example）"
  );
}

/**
 * 浏览器端使用当前域名下的 /api/supabase 代理，由 Vercel 中转请求到新加坡 Supabase，
 * 便于大陆用户访问；服务端（若有）仍用直连 URL。
 */
function getSupabaseUrl(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/supabase`;
  }
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
}

/** 无锁实现，避免 Navigator LockManager 超时（多标签/Strict Mode 下 getSession 竞争） */
function noOpLock<R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> {
  return fn();
}

export function createBrowserSupabase() {
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) {
    throw new Error("缺少 NEXT_PUBLIC_SUPABASE_URL（服务端或代理未配置时使用）");
  }
  return createClient<Database>(supabaseUrl, supabaseAnonKey!, {
    auth: {
      lock: noOpLock,
    },
  });
}
