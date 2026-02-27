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

/** 浏览器端检测代理是否可达（GET /api/supabase），用于登录失败时给出更明确提示 */
export async function checkProxyReachable(): Promise<{ ok: boolean; message: string }> {
  if (typeof window === "undefined") return { ok: false, message: "仅支持浏览器端" };
  try {
    const url = `${window.location.origin}/api/supabase`;
    const res = await fetch(url, { method: "GET", signal: AbortSignal.timeout(8000) });
    const data = (await res.json()) as { ok?: boolean; message?: string; error?: string; details?: string };
    if (res.ok && data.ok) return { ok: true, message: "代理可达" };
    return { ok: false, message: data.details ?? data.error ?? data.message ?? `HTTP ${res.status}` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}

const CLIENT_FETCH_TIMEOUT_MS = 15_000;

/** 自定义 fetch：延长等待时间以收到代理 502，并记录 502/5xx 及未响应错误 */
async function customFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CLIENT_FETCH_TIMEOUT_MS);
  const userSignal = init?.signal;
  const onAbort = () => controller.abort();
  userSignal?.addEventListener?.("abort", onAbort);
  const merged: RequestInit = { ...init, signal: controller.signal };
  try {
    const res = await fetch(input, merged);
    clearTimeout(timeoutId);
    userSignal?.removeEventListener?.("abort", onAbort);
    const url = String(typeof input === "object" && "href" in input ? input.href : input);
    if (url.includes("/auth/")) {
      console.info("[Supabase 代理] Auth 请求响应", res.status, url.slice(-60));
    }
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
    clearTimeout(timeoutId);
    userSignal?.removeEventListener?.("abort", onAbort);
    const msg = e instanceof Error ? e.message : String(e);
    const isTimeout = e instanceof Error && e.name === "AbortError";
    lastProxyErrorDetail = isTimeout
      ? `请求超时（${CLIENT_FETCH_TIMEOUT_MS / 1000} 秒内未收到响应）。请将 Vercel 项目 Region 改为 Singapore 或 Hong Kong 后重试。`
      : `请求未完成：${msg}（可能断网或被拦截，请检查 Network 面板）`;
    console.error("[Supabase 代理] 请求未完成", msg, e);
    throw e;
  }
}

export function createBrowserSupabase() {
  if (typeof window === "undefined") {
    throw new Error("createBrowserSupabase 仅用于浏览器端，服务端请使用 lib/supabase/server 的 createServerSupabase / createServerSupabaseFromRequest");
  }
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) {
    throw new Error(
      "缺少 NEXT_PUBLIC_SUPABASE_URL。若在 Vercel 部署，请在 Project Settings → Environment Variables 中配置并重新部署。"
    );
  }
  return createClient<Database>(supabaseUrl, supabaseAnonKey!, {
    global: { fetch: customFetch },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      lock: noOpLock,
    },
  });
}
