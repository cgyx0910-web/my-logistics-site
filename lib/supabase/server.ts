import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/** API Route 中使用的服务端 Supabase 客户端类型，用于 requireAdmin 等参数；显式指定 schema 为 "public" 以正确推断 RPC 参数 */
export type ServerSupabaseClient = SupabaseClient<Database, "public">;

/** 将 auth user.id 转为 profiles 表 .eq("id", ...) 可接受的类型（满足 Postgrest 严格推断） */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toProfileId(id: string): any {
  return id;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "缺少 Supabase 环境变量：请设置 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY（参见 .env.example）"
  );
}

export function createServerSupabase() {
  return createClient<Database>(supabaseUrl!, supabaseAnonKey!);
}

/** 在 API Route 中根据请求头 Authorization: Bearer <token> 创建带用户身份的客户端 */
export function createServerSupabaseFromRequest(request: Request): ServerSupabaseClient {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "") ?? null;
  return createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  }) as ServerSupabaseClient;
}
