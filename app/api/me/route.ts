import { NextResponse } from "next/server";
import { createServerSupabaseFromRequest, toProfileId } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = createServerSupabaseFromRequest(request);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, points, full_name, avatar_url, role")
    .eq("id", toProfileId(user.id))
    .single();

  if (profileError) {
    return NextResponse.json({ error: "获取用户信息失败" }, { status: 500 });
  }

  return NextResponse.json(profile);
}
