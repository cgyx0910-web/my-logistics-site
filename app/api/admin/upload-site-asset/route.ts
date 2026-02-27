import { NextResponse } from "next/server";
import { createServerSupabaseFromRequest, toProfileId, type ServerSupabaseClient } from "@/lib/supabase/server";

const BUCKET = "site-assets";
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

async function requireAdmin(supabase: ServerSupabaseClient) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "未登录", status: 401 as const };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", toProfileId(user.id)).single();
  if ((profile as { role?: string } | null)?.role !== "admin") return { error: "需要管理员权限", status: 403 as const };
  return { user };
}

/**
 * POST /api/admin/upload-site-asset
 * FormData: file (图片，用于物流故事封面等)
 * 上传至 site-assets 桶，路径 stories/{timestamp}_{random}.{ext}
 * 返回 { url: string }
 */
export async function POST(request: Request) {
  const supabase = createServerSupabaseFromRequest(request);
  const auth = await requireAdmin(supabase);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

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
      { error: "图片大小不能超过 2MB" },
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
  const safeExt = ["jpg", "png", "webp", "gif"].includes(ext) ? ext : "webp";
  const path = `stories/${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${safeExt}`;

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadErr) {
    if (uploadErr.message?.includes("Bucket not found")) {
      return NextResponse.json(
        { error: "请在 Supabase 控制台创建 site-assets 桶并设为公开" },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: uploadErr.message || "上传失败" },
      { status: 500 }
    );
  }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ success: true, url: publicUrl });
}
