import { NextResponse } from "next/server";
import { createServerSupabaseFromRequest, toProfileId, type ServerSupabaseClient } from "@/lib/supabase/server";

async function requireAdmin(supabase: ServerSupabaseClient) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "未登录", status: 401 as const };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", toProfileId(user.id)).single();
  if ((profile as { role?: string } | null)?.role !== "admin") return { error: "需要管理员权限", status: 403 as const };
  return { user };
}

/**
 * GET /api/admin/logistics-stories/[id]
 * 管理员：获取单条故事（编辑回填）
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerSupabaseFromRequest(request);
  const auth = await requireAdmin(supabase);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { data, error } = await supabase
    .from("logistics_stories")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return NextResponse.json({ error: "未找到" }, { status: 404 });
  return NextResponse.json(data);
}

/**
 * PATCH /api/admin/logistics-stories/[id]
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerSupabaseFromRequest(request);
  const auth = await requireAdmin(supabase);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: {
    title?: string;
    description?: string;
    content?: string | null;
    tags?: string[];
    image_url?: string | null;
    sort_order?: number;
  } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (body.title !== undefined) update.title = String(body.title).trim();
  if (body.description !== undefined) update.description = String(body.description).trim();
  if (body.content !== undefined) update.content = body.content != null ? String(body.content).trim() || null : null;
  if (body.tags !== undefined) update.tags = Array.isArray(body.tags) ? body.tags : [];
  if (body.image_url !== undefined) update.image_url = body.image_url != null ? String(body.image_url).trim() || null : null;
  if (body.sort_order !== undefined) update.sort_order = Number(body.sort_order);

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "无有效更新字段" }, { status: 400 });
  }

  // ServerSupabaseClient 断言导致 .update() 参数被推断为 never，此处用 any 绕过
  const { data, error } = await (supabase as any)
    .from("logistics_stories")
    .update(update)
    .eq("id", id)
    .select("id, title, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

/**
 * DELETE /api/admin/logistics-stories/[id]
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerSupabaseFromRequest(_request);
  const auth = await requireAdmin(supabase);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { error } = await supabase.from("logistics_stories").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
