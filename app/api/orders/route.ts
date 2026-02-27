import { NextResponse } from "next/server";
import { createServerSupabaseFromRequest } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = createServerSupabaseFromRequest(request);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  const { data: orders, error } = await supabase
    .from("shipping_orders")
    .select("id, tracking_number, status, shipping_fee, fixed_shipping_fee, points_awarded, payment_proof_url, created_at, cargo_details, sender_name, sender_phone, sender_address, receiver_name, receiver_phone, receiver_address, order_type")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(orders ?? []);
}

export async function POST(request: Request) {
  const supabase = createServerSupabaseFromRequest(request);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  let body: { shipping_fee?: number; destination?: string; method?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }

  const shippingFee = Number(body.shipping_fee);
  if (Number.isNaN(shippingFee) || shippingFee < 0) {
    return NextResponse.json({ error: "运费无效" }, { status: 400 });
  }

  const { data: order, error } = await (supabase as any)
    .from("shipping_orders")
    .insert({
      user_id: user.id,
      status: "待确认",
      shipping_fee: shippingFee,
      points_awarded: 0,
    })
    .select("id, tracking_number, status, shipping_fee, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(order);
}
