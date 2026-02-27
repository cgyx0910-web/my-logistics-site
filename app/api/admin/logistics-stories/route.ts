import { NextResponse } from "next/server";
import { createServerSupabaseFromRequest, toProfileId, type ServerSupabaseClient } from "@/lib/supabase/server";

async function requireAdmin(supabase: ServerSupabaseClient) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "未登录", status: 401 as const };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", toProfileId(user.id)).single();
  if ((profile as { role?: string } | null)?.role !== "admin") return { error: "需要管理员权限", status: 403 as const };
  return { user };
}

export async function GET(request: Request) {
  const supabase = createServerSupabaseFromRequest(request);
  const auth = await requireAdmin(supabase);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { data, error } = await supabase
    .from("logistics_stories")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = createServerSupabaseFromRequest(request);
  const auth = await requireAdmin(supabase);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  let body: { title?: string; description?: string; content?: string | null; tags?: string[]; image_url?: string | null; sort_order?: number } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }
  const title = String(body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "标题必填" }, { status: 400 });
  const row = {
    title,
    description: String(body.description ?? "").trim() || "",
    content: body.content != null ? String(body.content).trim() || null : null,
    tags: Array.isArray(body.tags) ? body.tags : [],
    image_url: body.image_url != null ? String(body.image_url).trim() || null : null,
    sort_order: typeof body.sort_order === "number" ? body.sort_order : 0,
  };
  const { data, error } = await (supabase as any).from("logistics_stories").insert(row).select("id, title, created_at").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
