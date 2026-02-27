import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  throw new Error(
    "缺少 Supabase 环境变量：请设置 NEXT_PUBLIC_SUPABASE_ANON_KEY（参见 .env.example）"
  );
}

/**
 * 仅用于浏览器端：使用相对路径 /api/supabase，经 Vercel 代理到 Supabase。
 * 服务端请使用 lib/supabase/server（直连 NEXT_PUBLIC_SUPABASE_URL），勿在此使用相对路径。
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

/** 供登录等流程在「Failed to fetch」时展示更具体的代理错误（由 customFetch 写入） */
let lastProxyErrorDetail: string | null = null;

export function getLastProxyErrorDetail(): string | null {
  return lastProxyErrorDetail;
}

export function clearLastProxyErrorDetail(): void {
  lastProxyErrorDetail = null;
}

/** 自定义 fetch：记录 502/5xx 及未收到响应时的错误，便于登录页展示 */
async function customFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    const res = await fetch(input, init);
    if (res.status >= 500) {
      lastProxyErrorDetail = null;
      try {
        const text = await res.text();
        const j = JSON.parse(text) as { details?: string; error?: string };
        const msg = (j.details ?? j.error ?? text) || `HTTP ${res.status}`;
        lastProxyErrorDetail = msg;
        console.error("[Supabase 代理]", res.status, msg);
      } catch {
        lastProxyErrorDetail = `代理返回 ${res.status}`;
        console.error("[Supabase 代理]", res.status, "无法解析响应");
      }
    }
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    lastProxyErrorDetail = msg;
    console.error("[Supabase 代理] 请求未完成", msg);
    throw e;
  }
}

export function createBrowserSupabase() {
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) {
    throw new Error(
      "缺少 NEXT_PUBLIC_SUPABASE_URL。若在 Vercel 部署，请在 Project Settings → Environment Variables 中配置并重新部署。"
    );
  }
  return createClient<Database>(supabaseUrl, supabaseAnonKey!, {
    global: { fetch: customFetch },
    auth: {
      lock: noOpLock,
    },
  });
}
