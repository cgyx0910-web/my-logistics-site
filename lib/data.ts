import { createServerSupabase } from "@/lib/supabase/server";
import type { AuctionProductRow, LogisticsStoryRow, ShippingRateRow } from "@/types/database";

/** 站点配置 key-value 映射 */
export type SiteSettingsMap = Record<string, string>;

/**
 * 服务端获取站点配置（体积重系数、各国运费、签到积分等）
 * 可在 Server Component 或 Server Action 中调用
 */
export async function getSiteSettings(): Promise<SiteSettingsMap> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("site_settings")
    .select("key, value")
    .order("key");

  if (error) throw error;
  const map: SiteSettingsMap = {};
  for (const row of (data ?? []) as { key: string; value: string }[]) {
    map[row.key] = row.value;
  }
  return map;
}

/**
 * 服务端获取积分淘货商品列表（仅上架）
 */
export async function getAuctionProducts(): Promise<AuctionProductRow[]> {
  const supabase = createServerSupabase();
  const { data, error } = await (supabase as any)
    .from("auction_products")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as AuctionProductRow[];
}

/**
 * 服务端获取单个积分淘货商品（仅上架时返回）
 */
export async function getAuctionProduct(id: string): Promise<AuctionProductRow | null> {
  const supabase = createServerSupabase();
  const { data, error } = await (supabase as any)
    .from("auction_products")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .single();

  if (error || !data) return null;
  return data as AuctionProductRow | null;
}

/**
 * 服务端获取物流故事列表
 */
export async function getLogisticsStories(): Promise<LogisticsStoryRow[]> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("logistics_stories")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as LogisticsStoryRow[];
}

/**
 * 服务端获取单条物流故事（详情页）
 */
export async function getLogisticsStory(id: string): Promise<LogisticsStoryRow | null> {
  const supabase = createServerSupabase();
  const { data, error } = await (supabase as any)
    .from("logistics_stories")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as LogisticsStoryRow | null;
}

/**
 * 服务端获取运费单价表（按国家 + 运输方式）
 */
export async function getShippingRates(): Promise<ShippingRateRow[]> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("shipping_rates")
    .select("id, country, shipping_method, unit_price, min_weight, currency")
    .order("country")
    .order("shipping_method");

  if (error) throw error;
  return (data ?? []) as unknown as ShippingRateRow[];
}
