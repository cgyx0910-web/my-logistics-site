import { type NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** 需要转发到 Supabase 的请求头（含 Auth 与 Cookie，确保身份验证不丢失） */
const FORWARD_HEADERS = [
  "authorization",
  "cookie",
  "content-type",
  "accept",
  "x-requested-with",
  "apikey",
  "x-client-info",
  "prefer",
];

export async function GET(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  return proxy(request, await params);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  return proxy(request, await params);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  return proxy(request, await params);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  return proxy(request, await params);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  return proxy(request, await params);
}

export async function OPTIONS(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  return proxy(request, await params);
}

function getConfigError(): string | null {
  if (!SUPABASE_URL && !SUPABASE_ANON_KEY) return "NEXT_PUBLIC_SUPABASE_URL 与 NEXT_PUBLIC_SUPABASE_ANON_KEY 未在 Vercel 环境变量中配置";
  if (!SUPABASE_URL) return "NEXT_PUBLIC_SUPABASE_URL 未在 Vercel 环境变量中配置";
  if (!SUPABASE_ANON_KEY) return "NEXT_PUBLIC_SUPABASE_ANON_KEY 未在 Vercel 环境变量中配置";
  return null;
}

async function proxy(request: NextRequest, { path }: { path?: string[] }) {
  const configError = getConfigError();
  const noPath = !path || path.length === 0 || path.every((p) => !p);

  if (request.method === "OPTIONS") {
    const origin = request.headers.get("Origin") ?? request.nextUrl.origin;
    const reqHeaders = request.headers.get("Access-Control-Request-Headers");
    const res = new NextResponse(null, { status: 204 });
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", reqHeaders ?? "authorization, apikey, content-type, accept, x-client-info, prefer");
    res.headers.set("Access-Control-Max-Age", "86400");
    return res;
  }

  if (request.method === "GET" && noPath) {
    if (configError) {
      const missing: string[] = [];
      if (!SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
      if (!SUPABASE_ANON_KEY) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
      return NextResponse.json(
        { ok: false, message: "缺少环境变量", missing, details: configError },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true, message: "Supabase 代理环境变量已配置" });
  }

  if (configError) {
    return NextResponse.json(
      { error: "Supabase proxy not configured", details: configError },
      { status: 502 }
    );
  }

  const pathSegments = (noPath ? "" : path!.join("/")).replace(/^\/+|\/+$/g, "").replace(/\/+/g, "/");
  const search = request.nextUrl.search;
  if (!pathSegments) {
    if (request.method === "GET") {
      return NextResponse.json({ ok: true, message: "Supabase 代理环境变量已配置" });
    }
    return NextResponse.json(
      { error: "requested path is invalid", details: "请请求 /api/supabase/<path>，例如 /api/supabase/auth/v1/token" },
      { status: 400 }
    );
  }
  const base = SUPABASE_URL!.replace(/\/+$/, "");
  const targetUrl = `${base}/${pathSegments}${search}`;

  const supabaseHost = new URL(base).host;
  const headers = new Headers();
  headers.set("Host", supabaseHost);
  headers.set("apikey", SUPABASE_ANON_KEY!);
  headers.set("Authorization", request.headers.get("Authorization") ?? `Bearer ${SUPABASE_ANON_KEY}`);

  FORWARD_HEADERS.forEach((name) => {
    if (name === "apikey") return;
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  });

  const PROXY_TIMEOUT_MS = 9_000;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);
    const body = ["GET", "HEAD", "OPTIONS"].includes(request.method) ? undefined : await request.text();
    const res = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const responseHeaders = new Headers();
    res.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") {
        const cookies = res.headers.getSetCookie?.() ?? [value];
        cookies.forEach((c) => {
          const rewritten = c.replace(/\s*Domain=[^;]+/gi, "");
          responseHeaders.append("set-cookie", rewritten);
        });
        /* Auth 的 Set-Cookie 已去掉 Domain，使 Cookie 绑定当前站点，middleware 不匹配 /api 故不会拦截 */
      } else {
        responseHeaders.set(key, value);
      }
    });
    const origin = request.headers.get("Origin");
    if (origin) responseHeaders.set("Access-Control-Allow-Origin", origin);

    return new NextResponse(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    const message = isAbort
      ? `请求 Supabase 超时（${PROXY_TIMEOUT_MS / 1000} 秒）。Vercel 免费版函数约 10 秒限制，建议：项目 Settings → General → Region 改为 Singapore 或 Hong Kong 后重试。`
      : err instanceof Error
        ? err.message
        : "Supabase proxy request failed";
    console.error("[Supabase proxy error]", message, err);
    const out = NextResponse.json(
      { error: "Supabase proxy request failed", details: message },
      { status: 502 }
    );
    const origin = request.headers.get("Origin");
    if (origin) out.headers.set("Access-Control-Allow-Origin", origin);
    return out;
  }
}
