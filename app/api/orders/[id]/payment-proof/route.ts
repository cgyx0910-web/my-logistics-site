import { NextResponse } from "next/server";
import { createServerSupabaseFromRequest } from "@/lib/supabase/server";

const BUCKET = "payment-proofs";
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;
  const supabase = createServerSupabaseFromRequest(request);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { data: order, error: orderErr } = await supabase
    .from("shipping_orders")
    .select("id, user_id")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .single();

  if (orderErr || !order) {
    return NextResponse.json({ error: "订单不存在或无权操作" }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "请选择一张图片" }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "图片大小不能超过 5MB" },
      { status: 400 }
    );
  }

  const type = file.type?.toLowerCase();
  if (!type || !ALLOWED_TYPES.includes(type)) {
    return NextResponse.json(
      { error: "仅支持 JPG、PNG、WebP、GIF 格式" },
      { status: 400 }
    );
  }

  const ext = type.replace("image/", "") === "jpeg" ? "jpg" : type.replace("image/", "");
  const safeExt = ["jpg", "png", "webp", "gif"].includes(ext) ? ext : "jpg";
  const path = `${user.id}/${orderId}/${crypto.randomUUID()}.${safeExt}`;

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadErr) {
    if (uploadErr.message?.includes("Bucket not found")) {
      return NextResponse.json(
        { error: "存储服务未就绪，请联系管理员创建 payment-proofs 桶" },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: uploadErr.message || "上传失败" },
      { status: 500 }
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const { error: updateErr } = await (supabase as any)
    .from("shipping_orders")
    .update({ payment_proof_url: publicUrl })
    .eq("id", orderId)
    .eq("user_id", user.id);

  if (updateErr) {
    return NextResponse.json(
      { error: updateErr.message || "保存凭证地址失败" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    url: publicUrl,
    message: "上传成功",
  });
}
