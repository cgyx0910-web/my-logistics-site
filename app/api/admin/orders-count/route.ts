import { NextResponse } from "next/server";
import { createServerSupabaseFromRequest, toProfileId, type ServerSupabaseClient } from "@/lib/supabase/server";

async function requireAdmin(supabase: ServerSupabaseClient) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "未登录", status: 401 as const };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", toProfileId(user.id)).single();
  if ((profile as { role?: string } | null)?.role !== "admin") return { error: "需要管理员权限", status: 403 as const };
  return { user };
}

/** 返回待确认订单数、客户申请取消数，用于后台管理角标与提示 */
export async function GET(request: Request) {
  const supabase = createServerSupabaseFromRequest(request);
  const auth = await requireAdmin(supabase);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const [pendingRes, cancelRes] = await Promise.all([
    supabase.from("shipping_orders").select("id", { count: "exact", head: true }).eq("status", "待确认"),
    supabase
      .from("shipping_orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "待确认")
      .eq("cancel_requested_by", "customer"),
  ]);

  return NextResponse.json({
    pendingCount: pendingRes.count ?? 0,
    cancelRequestCount: cancelRes.count ?? 0,
  });
}
