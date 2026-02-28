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
 * PATCH /api/admin/shipping-rates/[id]
 * Body: { unit_price?: number, delivery_days?: string | null }
 * 行内编辑：仅更新价格或时效
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createServerSupabaseFromRequest(request);
  const auth = await requireAdmin(supabase);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });

  let body: { unit_price?: number; delivery_days?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const update: { unit_price?: number; delivery_days?: string | null } = {};
  if (typeof body.unit_price === "number" && !Number.isNaN(body.unit_price) && body.unit_price > 0) {
    update.unit_price = body.unit_price;
  }
  if (body.delivery_days !== undefined) {
    update.delivery_days = typeof body.delivery_days === "string" ? body.delivery_days.trim() || null : null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "无有效更新字段" }, { status: 400 });
  }

  const { data, error } = await (supabase as any)
    .from("shipping_rates")
    .update(update)
    .eq("id", id)
    .select("id, unit_price, delivery_days")
    .single();

  if (error) {
    console.error("[admin/shipping-rates PATCH]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

/**
 * DELETE /api/admin/shipping-rates/[id]
 * 删除单条运费，数据库与前台运费试算共用同一表，删除后自动同步。
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createServerSupabaseFromRequest(_request);
  const auth = await requireAdmin(supabase);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });

  const { error } = await (supabase as { from: (t: string) => { delete: () => { eq: (col: string, val: string) => Promise<{ error: { message?: string } | null }> } } })
    .from("shipping_rates")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[admin/shipping-rates DELETE]", error);
    return NextResponse.json({ error: error?.message ?? "删除失败" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
