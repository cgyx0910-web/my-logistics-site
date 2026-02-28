import { NextResponse } from "next/server";
import { createServerSupabaseFromRequest, toProfileId, type ServerSupabaseClient } from "@/lib/supabase/server";

async function requireAdmin(supabase: ServerSupabaseClient) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "未登录", status: 401 as const };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", toProfileId(user.id)).single();
  if ((profile as { role?: string } | null)?.role !== "admin") return { error: "需要管理员权限", status: 403 as const };
  return { user };
}

/** 管理员不同意客户的取消申请，订单继续正常流程。 */
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
    .select("id, cancel_requested_by")
    .eq("id", orderId)
    .single();

  if (fetchErr || !order) return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  const row = order as { cancel_requested_by: string | null };
  if (row.cancel_requested_by !== "customer") return NextResponse.json({ error: "当前无客户发起的取消申请" }, { status: 400 });

  const { error: updateErr } = await (supabase as any)
    .from("shipping_orders")
    .update({ cancel_requested_by: null, cancel_requested_at: null })
    .eq("id", orderId);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  return NextResponse.json({ success: true, message: "已不同意取消" });
}
