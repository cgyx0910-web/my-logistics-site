import { NextResponse } from "next/server";
import { createServerSupabaseFromRequest, toProfileId, type ServerSupabaseClient } from "@/lib/supabase/server";

async function requireAdmin(supabase: ServerSupabaseClient) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "未登录", status: 401 as const };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", toProfileId(user.id)).single();
  if ((profile as { role?: string } | null)?.role !== "admin") return { error: "需要管理员权限", status: 403 as const };
  return { user };
}

/**
 * POST /api/admin/shipping-rates/adjust
 * Body: { percent: number, dry_run?: boolean, country?: string, shipping_method?: string, rate_ids?: string[] }
 * percent: 如 5 表示 +5%，-2 表示 -2%
 * 可选筛选：country / shipping_method / rate_ids；都不传则全路线调价
 * dry_run=true 只返回预览，不写库
 */
export async function POST(request: Request) {
  const supabase = createServerSupabaseFromRequest(request);
  const auth = await requireAdmin(supabase);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;

  let body: {
    percent?: number;
    dry_run?: boolean;
    country?: string;
    shipping_method?: string;
    rate_ids?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const percent = Number(body.percent);
  if (Number.isNaN(percent) || percent === 0) {
    return NextResponse.json({ error: "请填写非零的涨跌幅百分比，如 5 或 -2" }, { status: 400 });
  }

  const dryRun = body.dry_run === true;
  const country = typeof body.country === "string" ? body.country.trim().toLowerCase() : undefined;
  const shipping_method = typeof body.shipping_method === "string" ? body.shipping_method.trim() : undefined;
  const rate_ids = Array.isArray(body.rate_ids) ? body.rate_ids : undefined;

  let query = supabase
    .from("shipping_rates")
    .select("id, country, shipping_method, unit_price, min_weight, max_weight, currency");
  if (country) query = query.eq("country", country);
  if (shipping_method) query = query.eq("shipping_method", shipping_method);
  if (rate_ids?.length) query = query.in("id", rate_ids);

  const { data: rates, error: fetchError } = await query;
  if (fetchError) {
    console.error("[admin/shipping-rates/adjust] fetch error", fetchError);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!rates?.length) {
    return NextResponse.json({ error: "没有匹配的运费记录" }, { status: 400 });
  }

  const multiplier = 1 + percent / 100;
  const preview = rates.map((r: { id: string; unit_price: number; country: string; shipping_method: string }) => ({
    id: r.id,
    country: r.country,
    shipping_method: r.shipping_method,
    old_price: r.unit_price,
    new_price: Math.round(r.unit_price * multiplier * 100) / 100,
  }));

  if (dryRun) {
    return NextResponse.json({
      dry_run: true,
      percent,
      count: preview.length,
      preview,
    });
  }

  for (const p of preview) {
    const { error: updateError } = await (supabase as any)
      .from("shipping_rates")
      .update({ unit_price: p.new_price })
      .eq("id", p.id);
    if (updateError) {
      console.error("[admin/shipping-rates/adjust] update error", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  const countries = Array.from(new Set(preview.map((p: { country: string }) => p.country))).sort();
  await (supabase as any).from("shipping_rate_logs").insert({
    operator_id: user.id,
    action: "percent_adjust",
    countries,
    file_backup: null,
    summary: {
      percent,
      count: preview.length,
      countries,
      preview: preview.slice(0, 50),
    },
  });

  return NextResponse.json({
    success: true,
    updated: preview.length,
    percent,
    countries,
  });
}
