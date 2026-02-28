import { NextResponse } from "next/server";
import { createServerSupabaseFromRequest, toProfileId, type ServerSupabaseClient } from "@/lib/supabase/server";
import {
  validateRow,
  compareWithExisting,
  type ParsedRateRow,
  type DryRunResult,
} from "@/lib/shipping-rates-admin";

async function requireAdmin(supabase: ServerSupabaseClient) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "未登录", status: 401 as const };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", toProfileId(user.id)).single();
  if ((profile as { role?: string } | null)?.role !== "admin") return { error: "需要管理员权限", status: 403 as const };
  return { user };
}

/**
 * GET /api/admin/shipping-rates?logs=1
 * 无 logs：返回当前运费表（含 max_weight）
 * logs=1：返回 shipping_rate_logs 最近记录
 */
export async function GET(request: Request) {
  const supabase = createServerSupabaseFromRequest(request);
  const auth = await requireAdmin(supabase);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const logs = searchParams.get("logs") === "1";

  if (logs) {
    const { data, error } = await supabase
      .from("shipping_rate_logs")
      .select("id, operator_id, operated_at, action, countries, summary, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  }

  const { data, error } = await supabase
    .from("shipping_rates")
    .select("id, country, shipping_method, unit_price, min_weight, max_weight, currency, delivery_days")
    .order("country")
    .order("shipping_method")
    .order("min_weight");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

const DEFAULT_CURRENCY = "CNY";

/**
 * POST /api/admin/shipping-rates
 * Body: { dry_run?: boolean, rows: ParsedRateRow[], file_backup?: string }
 * - dry_run=true: 仅返回对比结果（即将新增/修改/异常），不写库
 * - dry_run=false: 执行 upsert 并写入 shipping_rate_logs
 */
export async function POST(request: Request) {
  const supabase = createServerSupabaseFromRequest(request);
  const auth = await requireAdmin(supabase);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user } = auth;

  let body: { dry_run?: boolean; rows?: unknown[]; file_backup?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const dryRun = body.dry_run === true;
  const rawRows = Array.isArray(body.rows) ? body.rows : [];
  const fileBackup = typeof body.file_backup === "string" ? body.file_backup : undefined;

  const parsedWithIndex: (ParsedRateRow & { rowIndex: number })[] = [];
  const allErrors: { rowIndex: number; reason: string }[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i] as Record<string, unknown>;
    const rowIndex = (raw?.rowIndex != null ? Number(raw.rowIndex) : i + 1) as number;

    const country = String(raw?.country ?? "").trim().toLowerCase();
    const shipping_method = String(raw?.shipping_method ?? "").trim();
    const unit_price = Number(raw?.unit_price);
    const min_weight = raw?.min_weight != null ? Number(raw.min_weight) : 0;
    const max_weight =
      raw?.max_weight != null && raw?.max_weight !== ""
        ? Number(raw.max_weight)
        : null;
    const currency = String(raw?.currency ?? DEFAULT_CURRENCY).trim() || DEFAULT_CURRENCY;
    const delivery_days = raw?.delivery_days != null ? String(raw.delivery_days).trim() || null : null;

    const row: ParsedRateRow = {
      country,
      shipping_method,
      unit_price,
      min_weight: Number.isNaN(min_weight) ? 0 : min_weight,
      max_weight: max_weight != null && !Number.isNaN(max_weight) ? max_weight : null,
      currency,
      delivery_days: delivery_days || undefined,
    };

    const errs = validateRow(row, rowIndex);
    allErrors.push(...errs);
    parsedWithIndex.push({ ...row, rowIndex });
  }

  const { data: existingRows } = await supabase
    .from("shipping_rates")
    .select("id, country, shipping_method, unit_price, min_weight, max_weight, currency, delivery_days");

  const existing = (existingRows ?? []) as {
    id: string;
    country: string;
    shipping_method: string;
    unit_price: number;
    min_weight: number;
    max_weight: number | null;
    currency: string;
    delivery_days: string | null;
  }[];

  const { toAdd, toUpdate, abnormal } = compareWithExisting(
    parsedWithIndex,
    allErrors,
    existing
  );

  const result: DryRunResult = {
    errors: allErrors,
    toAdd,
    toUpdate,
    abnormal,
  };

  if (dryRun) {
    return NextResponse.json(result);
  }

  if (allErrors.length > 0) {
    return NextResponse.json(
      {
        error: "存在校验错误，已拦截提交。请修正 CSV 后重新上传。",
        errors: allErrors,
      },
      { status: 400 }
    );
  }

  const toUpsertRaw = [
    ...toAdd.map((r) => ({
      country: r.country,
      shipping_method: r.shipping_method,
      unit_price: r.unit_price,
      min_weight: r.min_weight,
      max_weight: r.max_weight,
      currency: r.currency,
      delivery_days: r.delivery_days ?? null,
    })),
    ...toUpdate.map((r) => ({
      country: r.country,
      shipping_method: r.shipping_method,
      unit_price: r.new_unit_price,
      min_weight: r.min_weight,
      max_weight: r.max_weight,
      currency: r.currency,
      delivery_days: r.new_row.delivery_days ?? null,
    })),
  ];

  const conflictKey = (r: { country: string; shipping_method: string; min_weight: number }) =>
    `${r.country}|${r.shipping_method}|${r.min_weight}`;
  const byKey = new Map<string, (typeof toUpsertRaw)[0]>();
  for (const r of toUpsertRaw) {
    byKey.set(conflictKey(r), r);
  }
  const toUpsert = Array.from(byKey.values());

  if (toUpsert.length === 0) {
    return NextResponse.json({
      success: true,
      message: "无变更需要写入",
      dry_run_result: result,
    });
  }

  const { error: upsertError } = await (supabase as any)
    .from("shipping_rates")
    .upsert(toUpsert, {
      onConflict: "country,shipping_method,min_weight",
      ignoreDuplicates: false,
    });

  if (upsertError) {
    console.error("[admin/shipping-rates] upsert error", upsertError);
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  const countries = Array.from(
    new Set([
      ...toAdd.map((r) => r.country),
      ...toUpdate.map((r) => r.country),
    ])
  ).sort();

  const { error: logError } = await (supabase as any).from("shipping_rate_logs").insert({
    operator_id: user.id,
    action: "bulk_upload",
    countries,
    file_backup: fileBackup ?? null,
    summary: {
      added: toAdd.length,
      updated: toUpdate.length,
      abnormal: abnormal.length,
      countries,
    },
  });

  if (logError) {
    console.error("[admin/shipping-rates] log insert error", logError);
  }

  return NextResponse.json({
    success: true,
    added: toAdd.length,
    updated: toUpdate.length,
    dry_run_result: result,
  });
}
