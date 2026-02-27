import { NextResponse } from "next/server";
import { createServerSupabaseFromRequest, toProfileId } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = createServerSupabaseFromRequest(request);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  let body: { product_id?: string; bid_points?: number } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }

  const productId = body.product_id;
  const bidPoints = Number(body.bid_points);
  if (!productId || Number.isNaN(bidPoints) || bidPoints <= 0) {
    return NextResponse.json({ error: "商品或出价无效" }, { status: 400 });
  }

  const { data: productData, error: productError } = await supabase
    .from("auction_products")
    .select("id, name, is_auction, stock, shipping_fee, fixed_shipping_fee, direct_buy_points")
    .eq("id", productId)
    .single();
  const product = productData as { id: string; name: string; is_auction: boolean; stock: number; shipping_fee: number | null; fixed_shipping_fee: number | null; direct_buy_points: number | null } | null;

  if (productError || !product) {
    if (productError) {
      console.error("[auction-bids] 商品查询失败 Supabase Error:", JSON.stringify({
        message: productError.message,
        code: productError.code,
        details: productError.details,
        hint: productError.hint,
      }));
    }
    return NextResponse.json({ error: "商品不存在" }, { status: 404 });
  }

  const shippingFee = Number(product.fixed_shipping_fee ?? product.shipping_fee ?? 0);

  if (product.is_auction) {
    // 竞拍：原子扣积分 + 写入历史，再插入出价记录
    const { error: deductError } = await (supabase as any).rpc("deduct_user_points", {
      p_user_id: user.id,
      p_points: bidPoints,
      p_type: "auction_bid",
      p_ref_id: productId,
    });

    if (deductError) {
      const msg = deductError.message || "";
      if (msg.includes("insufficient") || msg.includes("积分")) {
        const { data: profileRowData } = await supabase.from("profiles").select("points").eq("id", toProfileId(user.id)).single();
        const profileRow = profileRowData as { points?: number } | null;
        const current = Number(profileRow?.points ?? 0);
        const shortfall = Math.max(0, bidPoints - current);
        return NextResponse.json(
          { error: `积分不足，还差 ${shortfall} 积分`, required: bidPoints, current },
          { status: 400 }
        );
      }
      console.error("[auction-bids] 竞拍扣积分失败 Supabase Error:", JSON.stringify(deductError));
      return NextResponse.json({ error: "扣减积分失败" }, { status: 500 });
    }

    const { data: bid, error: insertError } = await (supabase as any)
      .from("auction_bids")
      .insert({
        product_id: productId,
        user_id: user.id,
        bid_points: bidPoints,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[auction-bids] 写入出价记录失败 Supabase Error:", JSON.stringify(insertError));
      await (supabase as any).rpc("add_user_points_with_history", {
        p_user_id: user.id,
        p_points: bidPoints,
        p_type: "auction_refund",
        p_ref_id: productId,
      });
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("points")
      .eq("id", toProfileId(user.id))
      .single();
    const profile = profileData as { points?: number } | null;

    return NextResponse.json({
      success: true,
      points_after: profile?.points ?? 0,
      bid_id: bid?.id,
    });
  }

  // 直拍/兑换：扣积分 + 扣库存 + 自动生成物流订单
  if (product.stock < 1) {
    return NextResponse.json({ error: "商品已兑完" }, { status: 400 });
  }

  const { error: deductError } = await (supabase as any).rpc("deduct_user_points", {
    p_user_id: user.id,
    p_points: bidPoints,
    p_type: "auction_exchange",
    p_ref_id: productId,
  });

  if (deductError) {
    const msg = deductError.message || "";
    if (msg.includes("insufficient") || msg.includes("积分")) {
      const { data: profileRowData } = await supabase.from("profiles").select("points").eq("id", toProfileId(user.id)).single();
      const profileRow = profileRowData as { points?: number } | null;
      const current = Number(profileRow?.points ?? 0);
      const shortfall = Math.max(0, bidPoints - current);
      return NextResponse.json(
        { error: `积分不足，还差 ${shortfall} 积分`, required: bidPoints, current },
        { status: 400 }
      );
    }
    console.error("[auction-bids] 兑换扣积分失败 Supabase Error:", JSON.stringify(deductError));
    return NextResponse.json({ error: "扣减积分失败" }, { status: 500 });
  }

  const { data: decrementedId, error: stockError } = await (supabase as any).rpc("decrement_auction_product_stock", {
    p_product_id: productId,
  });

  if (stockError || !decrementedId) {
    if (stockError) console.error("[auction-bids] 库存扣减失败 Supabase Error:", JSON.stringify(stockError));
    await (supabase as any).rpc("add_user_points_with_history", {
      p_user_id: user.id,
      p_points: bidPoints,
      p_type: "auction_refund",
      p_ref_id: productId,
    });
    return NextResponse.json({ error: "库存扣减失败" }, { status: 500 });
  }

  const { data: order, error: orderError } = await (supabase as any)
    .from("shipping_orders")
    .insert({
      user_id: user.id,
      status: "待支付运费",
      shipping_fee: shippingFee,
      fixed_shipping_fee: shippingFee,
      points_awarded: 0,
      order_type: "treasure",
      source_type: "auction_exchange",
      auction_product_id: productId,
      cargo_details: `积分兑换：${product.name}`,
    })
    .select("id, status, shipping_fee, created_at")
    .single();

  if (orderError) {
    console.error("[auction-bids] 创建物流订单失败 Supabase Error:", JSON.stringify(orderError));
    await (supabase as any).rpc("increment_auction_product_stock", { p_product_id: productId });
    await (supabase as any).rpc("add_user_points_with_history", {
      p_user_id: user.id,
      p_points: bidPoints,
      p_type: "auction_refund",
      p_ref_id: productId,
    });
    return NextResponse.json({ error: "创建订单失败" }, { status: 500 });
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("points")
    .eq("id", toProfileId(user.id))
    .single();
  const profile = profileData as { points?: number } | null;

  const orderRow = order as { id?: string; shipping_fee?: number } | null;
  return NextResponse.json({
    success: true,
    points_after: profile?.points ?? 0,
    order_id: orderRow?.id,
    shipping_fee: orderRow?.shipping_fee,
  });
}
