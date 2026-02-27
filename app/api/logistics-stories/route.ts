import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/logistics-stories
 * 返回物流故事列表，按 sort_order 排序
 */
export async function GET() {
  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from("logistics_stories")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("[api/logistics-stories]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (e) {
    console.error("[api/logistics-stories]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
