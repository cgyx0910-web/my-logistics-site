import { NextResponse } from "next/server";
import { createServerSupabaseFromRequest, toProfileId, type ServerSupabaseClient } from "@/lib/supabase/server";

async function requireAdmin(supabase: ServerSupabaseClient) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "未登录", status: 401 as const };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", toProfileId(user.id)).single();
  if ((profile as { role?: string } | null)?.role !== "admin") return { error: "需要管理员权限", status: 403 as const };
  return { user };
}

/** 管理员：淘货订单一键发货 — 写入轨迹「平台已打包，正在安排出库」并更新状态为运输中 */
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
    .select("id, order_type, status")
    .eq("id", orderId)
    .single();
  const order = orderData as { id: string; order_type: string; status: string } | null;

  if (orderErr || !order) return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  if (order.order_type !== "treasure") {
    return NextResponse.json({ error: "仅支持淘货（自营）订单一键发货" }, { status: 400 });
  }
  if (order.status !== "待出库") {
    return NextResponse.json({ error: "当前状态不可发货，请确认已审核支付凭证且状态为待出库" }, { status: 400 });
  }

  const { error: logErr } = await (supabase as any).from("order_tracking_logs").insert({
    order_id: orderId,
    status_title: "平台已打包，正在安排出库",
    location: null,
    description: null,
  });
  if (logErr) return NextResponse.json({ error: logErr.message }, { status: 500 });

  const { error: updateErr } = await (supabase as any)
    .from("shipping_orders")
    .update({ status: "运输中" })
    .eq("id", orderId);
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ success: true, status: "运输中" });
}
