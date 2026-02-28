import { NextResponse } from "next/server";
import { createServerSupabaseFromRequest, toProfileId, type ServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function requireAdmin(supabase: ServerSupabaseClient) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "未登录", status: 401 as const };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", toProfileId(user.id)).single();
  if ((profile as { role?: string } | null)?.role !== "admin") return { error: "需要管理员权限", status: 403 as const };
  return { user };
}

/** 获取订单详情 + 轨迹列表（管理员） */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerSupabaseFromRequest(request);
  const auth = await requireAdmin(supabase);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data: order, error: orderError } = await supabase
    .from("shipping_orders")
    .select("*")
    .eq("id", id)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  }

  const { data: logs } = await supabase
    .from("order_tracking_logs")
    .select("*")
    .eq("order_id", id)
    .order("created_at", { ascending: false });

  const row = order as Record<string, unknown>;
  return NextResponse.json({
    order: {
      ...row,
      cancel_requested_by: row.cancel_requested_by ?? null,
      cancel_requested_at: row.cancel_requested_at ?? null,
    },
    logs: logs ?? [],
  });
}

/** 积分公式：发放积分 = floor(shipping_fee × 1)，1:1 向下取整 */
function calcPoints(shippingFee: number): number {
  return Math.floor(Number(shippingFee));
}

/** 管理员：更新订单状态；改为「已完成」时按 1:1 结算积分（RPC 原子加）、轨迹、站内通知 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;
  const supabase = createServerSupabaseFromRequest(request);
  const auth = await requireAdmin(supabase);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: { status?: string; tracking_number?: string | null } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }

  const { data: orderData, error: orderErr } = await supabase
    .from("shipping_orders")
    .select("id, user_id, status, shipping_fee, points_awarded")
    .eq("id", orderId)
    .single();
  const order = orderData as { id: string; user_id: string; status: string; shipping_fee: number; points_awarded: number | null } | null;

  if (orderErr || !order) return NextResponse.json({ error: "订单不存在" }, { status: 404 });

  const updates: { status?: string; tracking_number?: string | null } = {};
  if (body.tracking_number !== undefined) updates.tracking_number = body.tracking_number === "" ? null : body.tracking_number?.trim() || null;

  const newStatus = body.status?.trim();
  if (newStatus) {
    const allowed = ["待确认", "待付款", "已支付", "已入库", "运输中", "已完成", "已取消"];
    if (!allowed.includes(newStatus)) return NextResponse.json({ error: "无效状态" }, { status: 400 });
    updates.status = newStatus;
  }

  if (Object.keys(updates).length === 0) return NextResponse.json({ error: "缺少 status 或 tracking_number" }, { status: 400 });

  const { error: updateOrderErr } = await (supabase as any)
    .from("shipping_orders")
    .update(updates)
    .eq("id", orderId);

  if (updateOrderErr) return NextResponse.json({ error: updateOrderErr.message }, { status: 500 });

  if (newStatus && order.status !== "已完成" && newStatus === "已完成") {
    const pointsToAward = calcPoints(order.shipping_fee);
    const newPointsAwarded = (order.points_awarded ?? 0) + pointsToAward;

    await (supabase as any).from("shipping_orders").update({ points_awarded: newPointsAwarded }).eq("id", orderId);

    const { error: rpcErr } = await (supabase as any).rpc("add_user_points_with_history", {
      p_user_id: order.user_id,
      p_points: pointsToAward,
      p_type: "order_settle",
      p_ref_id: orderId,
    });
    if (rpcErr) return NextResponse.json({ error: "积分发放失败" }, { status: 500 });

    await (supabase as any).from("order_tracking_logs").insert({
      order_id: orderId,
      status_title: `订单已完成，系统已奖励 ${pointsToAward} 积分，快去积分商城看看吧！`,
      location: null,
      description: null,
    });

    await (supabase as any).from("user_notifications").insert({
      user_id: order.user_id,
      title: "订单完成，积分已到账",
      body: `订单已完成，根据实付金额 ¥${order.shipping_fee}（1:1）已发放 ${pointsToAward} 积分至您的账户，快去积分商城看看吧！`,
    });
  }

  return NextResponse.json({ success: true, status: newStatus });
}
