import { NextResponse } from "next/server";
import { createServerSupabaseFromRequest, toProfileId, type ServerSupabaseClient } from "@/lib/supabase/server";

async function requireAdmin(supabase: ServerSupabaseClient) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "未登录", status: 401 as const };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", toProfileId(user.id)).single();
  if ((profile as { role?: string } | null)?.role !== "admin") return { error: "需要管理员权限", status: 403 as const };
  return { user };
}

export async function GET(request: Request) {
  const supabase = createServerSupabaseFromRequest(request);
  const auth = await requireAdmin(supabase);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const tracking = searchParams.get("tracking")?.trim() || "";
  const status = searchParams.get("status")?.trim() || "";
  const email = searchParams.get("email")?.trim() || "";
  const cargo = searchParams.get("cargo")?.trim() || "";

  let query = supabase
    .from("shipping_orders")
    .select("id, user_id, tracking_number, status, shipping_fee, points_awarded, payment_proof_url, created_at, cargo_details, order_type")
    .order("created_at", { ascending: false });

  if (tracking) query = query.ilike("tracking_number", `%${tracking}%`);
  if (status) query = query.eq("status", status);
  if (cargo) query = query.ilike("cargo_details", `%${cargo}%`);

  if (email) {
    const { data: profiles } = await supabase.from("profiles").select("id").ilike("email", `%${email}%`);
    const userIds = ((profiles ?? []) as { id: string }[]).map((p) => p.id);
    if (userIds.length) query = query.in("user_id", userIds);
    else return NextResponse.json([]);
  }

  const { data: ordersData, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  type OrderRow = { id: string; user_id: string; tracking_number: string | null; status: string; shipping_fee: number; points_awarded: number | null; payment_proof_url: string | null; created_at: string; cargo_details: string | null; order_type: string };
  const orders = (ordersData ?? []) as OrderRow[];

  const userIds = [...new Set(orders.map((o) => o.user_id).filter(Boolean))];
  const { data: profilesData } = await supabase.from("profiles").select("id, email").in("id", userIds);
  const emailByUserId = new Map(((profilesData ?? []) as { id: string; email: string | null }[]).map((p) => [p.id, p.email ?? ""]));

  const list = orders.map((o) => ({
    id: o.id,
    user_id: o.user_id,
    tracking_number: o.tracking_number ?? null,
    status: o.status,
    shipping_fee: o.shipping_fee,
    points_awarded: o.points_awarded,
    payment_proof_url: o.payment_proof_url ?? null,
    created_at: o.created_at,
    cargo_details: o.cargo_details ?? null,
    order_type: o.order_type ?? "logistics",
    user_email: emailByUserId.get(o.user_id) ?? "",
  }));
  return NextResponse.json(list);
}
