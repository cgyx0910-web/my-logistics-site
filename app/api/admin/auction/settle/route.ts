import { NextResponse } from "next/server";
import { createServerSupabaseFromRequest, toProfileId, type ServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

async function requireAdmin(supabase: ServerSupabaseClient) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "未登录", status: 401 as const };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", toProfileId(user.id)).single();
  if ((profile as { role?: string } | null)?.role !== "admin") return { error: "需要管理员权限", status: 403 as const };
  return { user };
}

/** 管理员：竞拍结拍。确定最高出价者、退还未中标者积分、为中标者生成物流订单 */
export async function POST(request: Request) {
  const supabase = createServerSupabaseFromRequest(request);
  const auth = await requireAdmin(supabase);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: { product_id?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }
  const productId = body.product_id;
  if (!productId) {
    return NextResponse.json({ error: "缺少 product_id" }, { status: 400 });
  }

  type SettleArgs = Database["public"]["Functions"]["settle_auction_product"]["Args"];
  const rpc = supabase.rpc as unknown as (
    fn: "settle_auction_product",
    args: SettleArgs
  ) => ReturnType<ServerSupabaseClient["rpc"]>;
  const { data: orderId, error } = await rpc("settle_auction_product", { p_product_id: productId });

  if (error) {
    const msg = error.message || "";
    if (msg.includes("not found")) return NextResponse.json({ error: "商品不存在" }, { status: 404 });
    if (msg.includes("not an auction")) return NextResponse.json({ error: "非竞拍商品" }, { status: 400 });
    if (msg.includes("already settled")) return NextResponse.json({ error: "该商品已结拍" }, { status: 400 });
    if (msg.includes("no bids")) return NextResponse.json({ error: "无有效出价" }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, order_id: orderId });
}
