import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createServerSupabaseFromRequest, toProfileId, type ServerSupabaseClient } from "@/lib/supabase/server";

async function requireAdmin(supabase: ServerSupabaseClient) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "未登录", status: 401 as const };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", toProfileId(user.id)).single();
  if ((profile as { role?: string } | null)?.role !== "admin") return { error: "需要管理员权限", status: 403 as const };
  return { user };
}

/**
 * GET /api/admin/site-settings
 * 管理员读取站点配置（与公开 GET 相同，需鉴权）
 */
export async function GET(request: Request) {
  const supabase = createServerSupabaseFromRequest(request);
  const auth = await requireAdmin(supabase);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data, error } = await supabase
    .from("site_settings")
    .select("key, value")
    .order("key");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const map: Record<string, string> = {};
  for (const row of (data ?? []) as { key: string; value: string }[]) {
    map[row.key] = row.value;
  }
  return NextResponse.json(map);
}

/**
 * PATCH /api/admin/site-settings
 * Body: { settings: Record<string, string> } 批量 upsert key-value
 */
export async function PATCH(request: Request) {
  const supabase = createServerSupabaseFromRequest(request);
  const auth = await requireAdmin(supabase);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: { settings?: Record<string, string> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const settings = body.settings && typeof body.settings === "object" ? body.settings : {};
  const rows = Object.entries(settings).map(([key, value]) => ({
    key: String(key).trim(),
    value: String(value ?? "").trim(),
  })).filter((r) => r.key.length > 0);

  if (rows.length === 0) {
    return NextResponse.json({ success: true, updated: 0 });
  }

  const { error: upsertError } = await (supabase as any)
    .from("site_settings")
    .upsert(rows, { onConflict: "key", ignoreDuplicates: false });

  if (upsertError) {
    console.error("[admin/site-settings]", upsertError);
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  revalidatePath("/");
  revalidatePath("/about");
  return NextResponse.json({ success: true, updated: rows.length });
}
