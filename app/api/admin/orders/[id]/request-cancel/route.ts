import { NextResponse } from "next/server";
import { createServerSupabaseFromRequest, toProfileId, type ServerSupabaseClient } from "@/lib/supabase/server";

async function requireAdmin(supabase: ServerSupabaseClient) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "未登录", status: 401 as const };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", toProfileId(user.id)).single();
  if ((profile as { role?: string } | null)?.role !== "admin") return { error: "需要管理员权限", status: 403 as const };
  return { user };
}

/** 管理员申请取消。仅待确认订单可申请，需客户在订单详情页同意后订单变为已取消。 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;
  const supabase = createServerSupabaseFromRequest(_request);
  const auth = await requireAdmin(supabase);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data: order, error: fetchErr } = await supabase
    .from("shipping_orders")
    .select("id, status, cancel_requested_by")
    .eq("id", orderId)
    .single();

  if (fetchErr || !order) return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  const row = order as { status: string; cancel_requested_by: string | null };
  if (row.status !== "待确认") return NextResponse.json({ error: "仅待确认订单可申请取消" }, { status: 400 });
  if (row.cancel_requested_by === "admin") return NextResponse.json({ error: "已申请过取消，请等待客户同意" }, { status: 400 });

  const { error: updateErr } = await (supabase as any)
    .from("shipping_orders")
    .update({ cancel_requested_by: "admin", cancel_requested_at: new Date().toISOString() })
    .eq("id", orderId);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  return NextResponse.json({ success: true, message: "已申请取消，待客户在订单详情页同意后生效" });
}
