import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

/** 公开：按物流单号查询订单与轨迹（无需登录） */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const number = searchParams.get("number")?.trim() || searchParams.get("q")?.trim() || "";

  if (!number) {
    return NextResponse.json({ found: false, error: "请提供物流单号" }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const { data, error } = await (supabase as any).rpc("get_tracking_by_number", {
    p_tracking_number: number,
  });

  if (error) {
    return NextResponse.json({ found: false, error: error.message }, { status: 500 });
  }

  const result = data as unknown as { found: boolean; order?: { id: string; tracking_number: string; status: string }; logs?: unknown[] };
  if (!result?.found) {
    return NextResponse.json({ found: false });
  }

  return NextResponse.json({
    found: true,
    order: result.order,
    logs: result.logs ?? [],
  });
}
