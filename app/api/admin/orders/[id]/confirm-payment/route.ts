import { NextResponse } from "next/server";
import { createServerSupabaseFromRequest, toProfileId, type ServerSupabaseClient } from "@/lib/supabase/server";

async function requireAdmin(supabase: ServerSupabaseClient) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "未登录", status: 401 as const };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", toProfileId(user.id)).single();
  if ((profile as { role?: string } | null)?.role !== "admin") return { error: "需要管理员权限", status: 403 as const };
  return { user };
}

/** 管理员：确认收款 — 插入轨迹「支付已确认，准备安排出库」并可选更新订单状态 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;
  const supabase = createServerSupabaseFromRequest(request);
  const auth = await requireAdmin(supabase);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data: orderData } = await supabase
    .from("shipping_orders")
    .select("id, order_type")
    .eq("id", orderId)
    .single();
  const order = orderData as { id: string; order_type: string } | null;
  if (!order) return NextResponse.json({ error: "订单不存在" }, { status: 404 });

  const isTreasure = order.order_type === "treasure";
  const nextStatus = isTreasure ? "待出库" : "已支付";
  const logTitle = isTreasure
    ? "财务已确认收款，订单待出库"
    : "财务已确认收款，仓库正在安排出库";

  const { error: insertError } = await (supabase as any).from("order_tracking_logs").insert({
    order_id: orderId,
    status_title: logTitle,
    location: null,
    description: null,
  });

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  const { error: updateError } = await (supabase as any).from("shipping_orders").update({ status: nextStatus }).eq("id", orderId);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
