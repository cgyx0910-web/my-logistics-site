import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/site-settings
 * 返回所有站点配置，格式为 { key: value } 对象
 */
export async function GET() {
  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from("site_settings")
      .select("key, value")
      .order("key");

    if (error) {
      console.error("[api/site-settings]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const map: Record<string, string> = {};
    for (const row of (data ?? []) as { key: string; value: string }[]) {
      map[row.key] = row.value;
    }
    return NextResponse.json(map);
  } catch (e) {
    console.error("[api/site-settings]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
