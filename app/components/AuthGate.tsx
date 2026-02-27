"use client";

import { useAuth } from "@/app/context/AuthContext";
import { Loader2 } from "lucide-react";

/**
 * 在 Auth 未完成首次初始化前，只渲染占位符，不渲染子组件。
 * 避免子页面（如 admin layout、account）在 loading 时执行 router 跳转导致死循环。
 */
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { isInitializing } = useAuth();

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-slate-400" aria-hidden />
      </div>
    );
  }

  return <>{children}</>;
}
