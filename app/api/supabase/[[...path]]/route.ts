import { type NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** 需要转发到 Supabase 的请求头（含 Auth 与 Cookie，确保身份验证不丢失） */
const FORWARD_HEADERS = [
  "authorization",
  "cookie",
  "content-type",
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

async function proxy(request: NextRequest, { path }: { path?: string[] }) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return NextResponse.json(
      { error: "Supabase proxy not configured" },
      { status: 502 }
    );
  }

  const pathSegments = path && path.length > 0 ? path.join("/") : "";
  const search = request.nextUrl.search;
  const targetUrl = `${SUPABASE_URL.replace(/\/$/, "")}/${pathSegments}${search}`;

  const headers = new Headers();
  headers.set("apikey", SUPABASE_ANON_KEY);
  headers.set("Authorization", request.headers.get("Authorization") ?? `Bearer ${SUPABASE_ANON_KEY}`);

  FORWARD_HEADERS.forEach((name) => {
    const value = request.headers.get(name);
    if (value && name !== "apikey") headers.set(name, value);
  });

  try {
    const res = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: ["GET", "HEAD", "OPTIONS"].includes(request.method) ? undefined : await request.text(),
    });

    const responseHeaders = new Headers();
    res.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") {
        (res.headers.getSetCookie?.() ?? [value]).forEach((c) => responseHeaders.append("set-cookie", c));
      } else {
        responseHeaders.set(key, value);
      }
    });

    return new NextResponse(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error("[Supabase proxy error]", err);
    return NextResponse.json(
      { error: "Supabase proxy request failed" },
      { status: 502 }
    );
  }
}
