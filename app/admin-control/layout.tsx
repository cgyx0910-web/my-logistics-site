"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { Loader2 } from "lucide-react";

const REDIRECT_DELAY_MS = 3000;

/** 与 FlashMessageBanner 一致的权限提示条样式，用于本页展示 3 秒后跳转 */
function PermissionBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-4 bg-amber-600 px-4 py-3 text-white shadow-md"
    >
      <span className="font-medium">{message}</span>
      <span className="text-sm opacity-90">3 秒后跳转至首页</span>
    </div>
  );
}

export default function AdminControlLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, loading, isInitializing, refreshProfile } = useAuth();
  const router = useRouter();
  const [verified, setVerified] = useState<boolean | null>(null);
  /** 已确定无权限时展示的提示（仅用项目内统一风格，不展示原始 API 错误） */
  const [permissionMessage, setPermissionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isInitializing || loading) return;
    if (!user) {
      setPermissionMessage("请先登录");
      return;
    }
    // 已明确为 admin 则放行
    if (profile?.role === "admin") {
      setVerified(true);
      return;
    }
    // 已登录但 profile 已加载且非 admin：直接提示权限不足，不请求 API
    if (profile !== null && profile !== undefined && profile.role !== "admin") {
      setPermissionMessage("权限不足：该页面仅限管理员访问");
      setVerified(false);
      return;
    }
    let cancelled = false;
    const timeoutId = setTimeout(() => {
      if (cancelled) return;
      setVerified(false);
      setPermissionMessage("请求超时，请刷新重试");
    }, 10000);
    refreshProfile().then((fresh) => {
      if (cancelled) return;
      clearTimeout(timeoutId);
      const isAdmin = fresh?.role === "admin";
      setVerified(isAdmin);
      if (!isAdmin) {
        setPermissionMessage("权限不足：该页面仅限管理员访问");
      }
    });
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [user, profile, loading, isInitializing, refreshProfile]);

  // 无权限：用统一提示组件展示，3 秒后跳转首页
  useEffect(() => {
    if (permissionMessage == null) return;
    const t = setTimeout(() => {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("flashMessage", permissionMessage);
      }
      router.replace("/");
    }, REDIRECT_DELAY_MS);
    return () => clearTimeout(t);
  }, [permissionMessage, router]);

  if (permissionMessage != null) {
    return (
      <div className="min-h-[50vh] flex flex-col">
        <PermissionBanner message={permissionMessage} />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  if (isInitializing || loading || !user || verified === null || verified === false) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return <>{children}</>;
}
