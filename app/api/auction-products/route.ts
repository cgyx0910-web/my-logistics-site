import { NextResponse } from "next/server";
import { createServerSupabase, createServerSupabaseFromRequest, toProfileId, type ServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/auction-products
 * 无鉴权或非管理员：仅返回 is_active = true 的上架商品
 * 管理员鉴权：返回全部（含已下架）
 */
export async function GET(request: Request) {
  try {
    const supabase = createServerSupabase();
    const supabaseWithAuth = createServerSupabaseFromRequest(request);
    const { data: { user } } = await supabaseWithAuth.auth.getUser();
    let query = supabase.from("auction_products").select("*").order("sort_order", { ascending: true });

    if (user) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", toProfileId(user.id)).single();
      if ((profile as { role?: string } | null)?.role !== "admin") {
        query = (query as any).eq("is_active", true);
      }
    } else {
      query = (query as any).eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[api/auction-products]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (e) {
    console.error("[api/auction-products]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

async function requireAdmin(supabase: ServerSupabaseClient) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "未登录", status: 401 as const };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", toProfileId(user.id)).single();
  if ((profile as { role?: string } | null)?.role !== "admin") return { error: "需要管理员权限", status: 403 as const };
  return { user };
}

/**
 * POST /api/auction-products
 * 管理员：新增淘货商品（上架），含预设运费 fixed_shipping_fee
 */
export async function POST(request: Request) {
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
  } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }

  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "商品名称必填" }, { status: 400 });
  }

  const presetFee = body.fixed_shipping_fee != null ? Number(body.fixed_shipping_fee) : (body.shipping_fee != null ? Number(body.shipping_fee) : 0);
  const shippingFee = Number.isNaN(presetFee) ? 0 : presetFee;
  const images = Array.isArray(body.images) ? body.images.filter((u): u is string => typeof u === "string") : null;
  const imageUrl = (images?.length ? images[0] : body.image_url?.trim()) || null;

  const row = {
    name: body.name.trim(),
    description: body.description?.trim() || null,
    points_required: typeof body.points_required === "number" ? body.points_required : 0,
    direct_buy_points: body.direct_buy_points != null ? Number(body.direct_buy_points) : null,
    shipping_fee: shippingFee,
    fixed_shipping_fee: shippingFee,
    stock: typeof body.stock === "number" ? body.stock : 0,
    tag: body.tag?.trim() || null,
    button_text: body.button_text?.trim() || null,
    sort_order: typeof body.sort_order === "number" ? body.sort_order : 0,
    is_auction: Boolean(body.is_auction),
    end_time: body.end_time || null,
    image_url: imageUrl,
    images: images?.length ? images : null,
    is_active: true,
  };

  const { data, error } = await (supabase as any).from("auction_products").insert(row).select("id, name, fixed_shipping_fee, created_at").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
