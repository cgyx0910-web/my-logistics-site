import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "缺少 Supabase 环境变量：请设置 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY（参见 .env.example）"
  );
}

/** 无锁实现，避免 Navigator LockManager 超时（多标签/Strict Mode 下 getSession 竞争） */
function noOpLock<R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> {
  return fn();
}

export function createBrowserSupabase() {
  return createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      lock: noOpLock,
    },
  });
}
