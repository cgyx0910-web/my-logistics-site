import { NextResponse } from "next/server";
import { createServerSupabaseFromRequest } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** 用户端：获取自己某订单的轨迹（按时间倒序，最新在前） */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;
  const supabase = createServerSupabaseFromRequest(request);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { data: orderData } = await supabase
    .from("shipping_orders")
    .select("id, tracking_number, status, shipping_fee, fixed_shipping_fee, payment_proof_url, domestic_tracking_number, cargo_details, sender_name, sender_phone, sender_address, receiver_name, receiver_phone, receiver_address, order_type, auction_product_id, cancel_requested_by")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .single();
  type OrderRow = { id: string; tracking_number: string | null; status: string; shipping_fee: number; fixed_shipping_fee: number | null; payment_proof_url: string | null; domestic_tracking_number: string | null; cargo_details: string | null; sender_name: string | null; sender_phone: string | null; sender_address: string | null; receiver_name: string | null; receiver_phone: string | null; receiver_address: string | null; order_type: string; auction_product_id: string | null; cancel_requested_by: string | null };
  const order = orderData as OrderRow | null;

  if (!order) return NextResponse.json({ error: "订单不存在或无权查看" }, { status: 404 });

  let product_summary: { name: string; image_url: string | null } | null = null;
  if (order.auction_product_id) {
    const { data: productData } = await supabase
      .from("auction_products")
      .select("name, image_url, images")
      .eq("id", order.auction_product_id)
      .single();
    const product = productData as { name: string; image_url: string | null; images: string[] | null } | null;
    if (product) {
      const imageUrl = Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : product.image_url ?? null;
      product_summary = { name: product.name, image_url: imageUrl };
    }
  }

  const { data: logs, error } = await supabase
    .from("order_tracking_logs")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const fee = order.fixed_shipping_fee ?? order.shipping_fee;
  return NextResponse.json({
    order: {
      id: order.id,
      tracking_number: order.tracking_number,
      status: order.status,
      shipping_fee: fee,
      fixed_shipping_fee: order.fixed_shipping_fee ?? null,
      payment_proof_url: order.payment_proof_url ?? null,
      domestic_tracking_number: order.domestic_tracking_number ?? null,
      cargo_details: order.cargo_details ?? null,
      sender_name: order.sender_name ?? null,
      sender_phone: order.sender_phone ?? null,
      sender_address: order.sender_address ?? null,
      receiver_name: order.receiver_name ?? null,
      receiver_phone: order.receiver_phone ?? null,
      receiver_address: order.receiver_address ?? null,
      order_type: order.order_type ?? "logistics",
      auction_product_id: order.auction_product_id ?? null,
      cancel_requested_by: order.cancel_requested_by ?? null,
      product_summary: product_summary,
    },
    logs: logs ?? [],
  });
}
