import { NextResponse } from "next/server";
import { createServerSupabaseFromRequest, toProfileId } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerSupabaseFromRequest(request);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  type WaybillBody = {
    cargo_details?: string;
    sender_name?: string;
    sender_phone?: string;
    sender_address?: string;
    receiver_name?: string;
    receiver_phone?: string;
    receiver_address?: string;
    domestic_tracking_number?: string;
  };
  let body: { status?: string } & WaybillBody = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }

  const { data: orderData, error: fetchError } = await supabase
    .from("shipping_orders")
    .select("id, user_id, status, points_awarded, order_type")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  const order = orderData as { id: string; user_id: string; status: string; points_awarded: number | null; order_type: string } | null;

  if (fetchError || !order) {
    return NextResponse.json({ error: "订单不存在或无权操作" }, { status: 404 });
  }

  const orderType = order.order_type ?? "logistics";
  const hasWaybill = [
    "cargo_details",
    "sender_name",
    "sender_phone",
    "sender_address",
    "receiver_name",
    "receiver_phone",
    "receiver_address",
    "domestic_tracking_number",
  ].some((k) => body[k as keyof WaybillBody] !== undefined);

  if (hasWaybill) {
    const update: WaybillBody = {};
    if (body.cargo_details !== undefined) update.cargo_details = body.cargo_details;
    if (body.sender_name !== undefined) update.sender_name = body.sender_name;
    if (body.sender_phone !== undefined) update.sender_phone = body.sender_phone;
    if (body.sender_address !== undefined) update.sender_address = body.sender_address;
    if (body.receiver_name !== undefined) update.receiver_name = body.receiver_name;
    if (body.receiver_phone !== undefined) update.receiver_phone = body.receiver_phone;
    if (body.receiver_address !== undefined) update.receiver_address = body.receiver_address;
    if (body.domestic_tracking_number !== undefined) update.domestic_tracking_number = body.domestic_tracking_number;
    const onlyReceiver = Object.keys(update).every((k) => ["receiver_name", "receiver_phone", "receiver_address"].includes(k));
    const canUpdateTreasureReceiver = orderType === "treasure" && onlyReceiver;
    const canUpdateWaybill = order.status === "待确认" || canUpdateTreasureReceiver;
    if (!canUpdateWaybill && Object.keys(update).some((k) => k !== "domestic_tracking_number")) {
      return NextResponse.json({ error: "仅待确认订单可补全物流信息；淘货订单可随时维护收货人信息" }, { status: 400 });
    }
    const { error: updateError } = await (supabase as any)
      .from("shipping_orders")
      .update(update)
      .eq("id", id)
      .eq("user_id", user.id);
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, message: "信息已更新" });
  }

  if (!body.status) {
    return NextResponse.json({ error: "缺少 status 或面单字段" }, { status: 400 });
  }

  const oldStatus = order.status;
  const newStatus = body.status;

  const { error: updateError } = await (supabase as any)
    .from("shipping_orders")
    .update({ status: newStatus })
    .eq("id", id)
    .eq("user_id", user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (oldStatus !== "已完成" && newStatus === "已完成" && (order.points_awarded ?? 0) > 0) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("points")
      .eq("id", toProfileId(user.id))
      .single();
    const profile = profileData as { points?: number } | null;
    const newPoints = (profile?.points ?? 0) + (order.points_awarded ?? 0);
    await (supabase as any).from("profiles").update({ points: newPoints }).eq("id", toProfileId(user.id));
  }

  return NextResponse.json({ success: true, status: newStatus });
}
