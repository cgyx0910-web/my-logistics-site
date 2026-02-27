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
 * PATCH /api/auction-products/[id]
 * 管理员：更新淘货商品，含预设运费 fixed_shipping_fee
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
    name?: string;
    description?: string | null;
    points_required?: number;
    direct_buy_points?: number | null;
    shipping_fee?: number | null;
    fixed_shipping_fee?: number | null;
    stock?: number;
    tag?: string | null;
    button_text?: string | null;
    sort_order?: number;
    is_auction?: boolean;
    end_time?: string | null;
    image_url?: string | null;
    images?: string[] | null;
    is_active?: boolean;
  } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }

  const presetFee = body.fixed_shipping_fee != null
    ? Number(body.fixed_shipping_fee)
    : (body.shipping_fee != null ? Number(body.shipping_fee) : undefined);
  const shippingFee = presetFee != null && !Number.isNaN(presetFee) ? presetFee : undefined;
  const images = body.images !== undefined
    ? (Array.isArray(body.images) ? body.images.filter((u): u is string => typeof u === "string") : null)
    : undefined;
  const imageUrlFromImages = images?.length ? images[0] : undefined;
  const imageUrl = imageUrlFromImages ?? (body.image_url !== undefined ? body.image_url?.trim() || null : undefined);

  const update: Record<string, unknown> = {};
  if (body.name !== undefined) update.name = String(body.name).trim();
  if (body.description !== undefined) update.description = body.description?.trim() || null;
  if (body.points_required !== undefined) update.points_required = Number(body.points_required);
  if (body.direct_buy_points !== undefined) update.direct_buy_points = body.direct_buy_points != null ? Number(body.direct_buy_points) : null;
  if (body.stock !== undefined) update.stock = Number(body.stock);
  if (body.tag !== undefined) update.tag = body.tag?.trim() || null;
  if (body.button_text !== undefined) update.button_text = body.button_text?.trim() || null;
  if (body.sort_order !== undefined) update.sort_order = Number(body.sort_order);
  if (body.is_auction !== undefined) update.is_auction = Boolean(body.is_auction);
  if (body.end_time !== undefined) update.end_time = body.end_time || null;
  if (imageUrl !== undefined) update.image_url = imageUrl;
  if (images !== undefined) update.images = images?.length ? images : null;
  if (body.is_active !== undefined) update.is_active = Boolean(body.is_active);
  if (shippingFee !== undefined) {
    update.shipping_fee = shippingFee;
    update.fixed_shipping_fee = shippingFee;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "无有效更新字段" }, { status: 400 });
  }

  const { data, error } = await (supabase as any)
    .from("auction_products")
    .update(update)
    .eq("id", id)
    .select("id, name, fixed_shipping_fee, shipping_fee")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

/**
 * DELETE /api/auction-products/[id]
 * 管理员：删除淘货商品
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerSupabaseFromRequest(_request);
  const auth = await requireAdmin(supabase);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { error } = await supabase.from("auction_products").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
