import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/shipping-rates
 * 返回 shipping_rates 表全部记录，供运费计算器使用
 */
export async function GET() {
  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from("shipping_rates")
      .select("id, country, shipping_method, unit_price, min_weight, max_weight, currency")
      .order("country")
      .order("shipping_method")
      .order("min_weight");

    if (error) {
      console.error("[api/shipping-rates]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data ?? []);
  } catch (e) {
    console.error("[api/shipping-rates]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
