import { NextResponse } from "next/server";
import { createServerSupabaseFromRequest, toProfileId } from "@/lib/supabase/server";
import { getSiteSettings } from "@/lib/data";

export async function POST(request: Request) {
  const supabase = createServerSupabaseFromRequest(request);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const { data: existing } = await supabase
    .from("sign_ins")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("sign_in_date", today)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "今日已签到" }, { status: 400 });
  }

  let pointsToAdd = 5;
  try {
    const settings = await getSiteSettings();
    const v = settings.sign_in_points;
    if (v != null) pointsToAdd = parseInt(v, 10) || 5;
  } catch {
    // 使用默认 5
  }

  const { error: insertError } = await (supabase as any).from("sign_ins").insert({
    user_id: user.id,
    sign_in_date: today,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const { error: rpcError } = await (supabase as any).rpc("add_user_points_with_history", {
    p_user_id: user.id,
    p_points: pointsToAdd,
    p_type: "sign_in",
    p_ref_id: null,
  });

  if (rpcError) {
    return NextResponse.json({ error: "积分更新失败" }, { status: 500 });
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("points")
    .eq("id", toProfileId(user.id))
    .single();
  const profile = profileData as { points?: number } | null;

  return NextResponse.json({
    success: true,
    points_added: pointsToAdd,
    points: profile?.points ?? pointsToAdd,
  });
}
