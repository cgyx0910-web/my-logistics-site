import { NextResponse } from "next/server";
import { createServerSupabaseFromRequest, toProfileId, type ServerSupabaseClient } from "@/lib/supabase/server";

async function requireAdmin(supabase: ServerSupabaseClient) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "未登录", status: 401 as const };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", toProfileId(user.id)).single();
  if ((profile as { role?: string } | null)?.role !== "admin") return { error: "需要管理员权限", status: 403 as const };
  return { user };
}

/** 积分公式：发放积分 = floor(订单实付金额 shipping_fee × 1)，即 1:1 向下取整 */
function calcPoints(shippingFee: number): number {
  return Math.floor(Number(shippingFee));
}

/** 管理员：确认结算。防重复（已已完成则 400）；更新状态、原子加积分、轨迹、站内通知 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;
  const supabase = createServerSupabaseFromRequest(request);
  const auth = await requireAdmin(supabase);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data: orderData, error: orderErr } = await supabase
    .from("shipping_orders")
    .select("id, user_id, status, shipping_fee, points_awarded")
    .eq("id", orderId)
    .single();
  const order = orderData as { id: string; user_id: string; status: string; shipping_fee: number; points_awarded: number | null } | null;

  if (orderErr || !order) return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  if (order.status === "已完成") {
    return NextResponse.json({ error: "该订单已结算，请勿重复操作" }, { status: 400 });
  }

  const pointsToAward = calcPoints(order.shipping_fee);
  const newPointsAwarded = (order.points_awarded ?? 0) + pointsToAward;

  const { error: updateOrderErr } = await (supabase as any)
    .from("shipping_orders")
    .update({ status: "已完成", points_awarded: newPointsAwarded })
    .eq("id", orderId);

  if (updateOrderErr) return NextResponse.json({ error: updateOrderErr.message }, { status: 500 });

  const { error: rpcErr } = await (supabase as any).rpc("add_user_points_with_history", {
    p_user_id: order.user_id,
    p_points: pointsToAward,
    p_type: "order_settle",
    p_ref_id: orderId,
  });

  if (rpcErr) {
    return NextResponse.json(
      { error: "积分发放失败：" + (rpcErr.message ?? "请确保已执行 013 迁移") },
      { status: 500 }
    );
  }

  const { error: logErr } = await (supabase as any).from("order_tracking_logs").insert({
    order_id: orderId,
    status_title: "订单已完成，系统已奖励 X 积分，快去积分商城看看吧！".replace("X", String(pointsToAward)),
    location: null,
    description: null,
  });

  if (logErr) return NextResponse.json({ error: logErr.message }, { status: 500 });

  await (supabase as any).from("user_notifications").insert({
    user_id: order.user_id,
    title: "订单完成，积分已到账",
    body: `订单已完成，根据实付金额 ¥${order.shipping_fee}（1:1）已发放 ${pointsToAward} 积分至您的账户，快去积分商城看看吧！`,
  });

  return NextResponse.json({ success: true, points_awarded: pointsToAward });
}
