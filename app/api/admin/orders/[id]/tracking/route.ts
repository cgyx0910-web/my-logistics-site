import { NextResponse } from "next/server";
import { createServerSupabaseFromRequest, toProfileId, type ServerSupabaseClient } from "@/lib/supabase/server";

async function requireAdmin(supabase: ServerSupabaseClient) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "未登录", status: 401 as const };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", toProfileId(user.id)).single();
  if ((profile as { role?: string } | null)?.role !== "admin") return { error: "需要管理员权限", status: 403 as const };
  return { user };
}

/** 管理员：添加轨迹并可选更新订单主状态 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;
  const supabase = createServerSupabaseFromRequest(request);
  const auth = await requireAdmin(supabase);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: { status_title?: string; location?: string; description?: string; order_status?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }

  const statusTitle = String(body.status_title ?? "").trim();
  if (!statusTitle) return NextResponse.json({ error: "状态标题不能为空" }, { status: 400 });

  const { data: order } = await supabase.from("shipping_orders").select("id").eq("id", orderId).single();
  if (!order) return NextResponse.json({ error: "订单不存在" }, { status: 404 });

  const { error: insertError } = await (supabase as any).from("order_tracking_logs").insert({
    order_id: orderId,
    status_title: statusTitle,
    location: body.location?.trim() || null,
    description: body.description?.trim() || null,
  });

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  if (body.order_status) {
    const allowed = ["待确认", "待付款", "已支付", "已入库", "运输中", "已完成"];
    if (allowed.includes(body.order_status)) {
      const { data: orderRowData } = await supabase
        .from("shipping_orders")
        .select("user_id, status, shipping_fee, points_awarded")
        .eq("id", orderId)
        .single();
      const orderRow = orderRowData as { user_id: string; status: string; shipping_fee: number; points_awarded: number | null } | null;

      await (supabase as any).from("shipping_orders").update({ status: body.order_status }).eq("id", orderId);

      if (body.order_status === "已完成" && orderRow && orderRow.status !== "已完成") {
        const pointsToAward = Math.floor(Number(orderRow.shipping_fee));
        const newPointsAwarded = (orderRow.points_awarded ?? 0) + pointsToAward;
        await (supabase as any)
          .from("shipping_orders")
          .update({ status: "已完成", points_awarded: newPointsAwarded })
          .eq("id", orderId);

        const { error: rpcErr } = await (supabase as any).rpc("add_user_points_with_history", {
          p_user_id: orderRow.user_id,
          p_points: pointsToAward,
          p_type: "order_settle",
          p_ref_id: orderId,
        });
        if (!rpcErr) {
          await (supabase as any).from("order_tracking_logs").insert({
            order_id: orderId,
            status_title: `订单已完成，系统已奖励 ${pointsToAward} 积分，快去积分商城看看吧！`,
            location: null,
            description: null,
          });
          await (supabase as any).from("user_notifications").insert({
            user_id: orderRow.user_id,
            title: "订单完成，积分已到账",
            body: `订单已完成，根据实付金额 ¥${orderRow.shipping_fee}（1:1）已发放 ${pointsToAward} 积分至您的账户，快去积分商城看看吧！`,
          });
        }
      }
    }
  }

  return NextResponse.json({ success: true });
}
