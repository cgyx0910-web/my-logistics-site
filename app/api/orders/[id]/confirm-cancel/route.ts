import { NextResponse } from "next/server";
import { createServerSupabaseFromRequest } from "@/lib/supabase/server";

/** 客户同意取消（当管理员已申请取消时）。仅待确认且 cancel_requested_by=admin 时可操作。 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;
  const supabase = createServerSupabaseFromRequest(_request);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const { data: order, error: fetchErr } = await supabase
    .from("shipping_orders")
    .select("id, user_id, status, cancel_requested_by")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .single();

  if (fetchErr || !order) return NextResponse.json({ error: "订单不存在或无权操作" }, { status: 404 });
  const row = order as { status: string; cancel_requested_by: string | null };
  if (row.status !== "待确认") return NextResponse.json({ error: "仅待确认订单可取消" }, { status: 400 });
  if (row.cancel_requested_by !== "admin") return NextResponse.json({ error: "当前无管理员发起的取消申请" }, { status: 400 });

  const { error: updateErr } = await (supabase as any)
    .from("shipping_orders")
    .update({ status: "已取消", cancel_requested_by: null, cancel_requested_at: null })
    .eq("id", orderId)
    .eq("user_id", user.id);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  return NextResponse.json({ success: true, message: "订单已取消" });
}
