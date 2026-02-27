"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";
import LoginRegisterModal from "./LoginRegisterModal";
import { LogIn, LogOut, User, Gift } from "lucide-react";

const navItems = [
  { label: "首页", href: "/" },
  { label: "运费计算", href: "/shipping-calc" },
  { label: "物流查询", href: "/tracking" },
  { label: "积分淘货", href: "/points-shop" },
  { label: "物流故事", href: "/stories" },
  { label: "关于我们", href: "/about" },
];

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [adminPendingCount, setAdminPendingCount] = useState<number>(0);
  const { user, profile, loading, signOut, refreshProfile, getAccessToken } = useAuth();

  useEffect(() => {
    if (!user || profile?.role !== "admin") {
      setAdminPendingCount(0);
      return;
    }
    let cancelled = false;
    getAccessToken().then((token) => {
      if (cancelled || !token) return;
      fetch("/api/admin/orders-count", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : { pendingCount: 0 }))
        .then((data) => {
          if (!cancelled) setAdminPendingCount(data.pendingCount ?? 0);
        })
        .catch(() => {
          if (!cancelled) setAdminPendingCount(0);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [user, profile?.role, getAccessToken]);

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/sign-in", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok) {
        await refreshProfile();
      } else {
        alert(data.error ?? "签到失败");
      }
    } catch {
      alert("签到请求失败");
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[#1e3a8a] text-white shadow-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-xl font-bold tracking-tight text-white transition-opacity hover:opacity-90 sm:text-2xl"
        >
          小太羊国际物流
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-white/95 transition-colors hover:text-white"
            >
              {item.label}
            </Link>
          ))}
          {!loading && profile?.role === "admin" && (
            <Link
              href="/admin-control"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-300 hover:text-amber-200"
            >
              <span>后台管理</span>
              {adminPendingCount > 0 && (
                <span
                  className="flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white"
                  aria-label={`${adminPendingCount} 笔待确认订单`}
                >
                  {adminPendingCount > 99 ? "99+" : adminPendingCount}
                </span>
              )}
            </Link>
          )}
          {!loading && (
            <>
              {user ? (
                <div className="flex items-center gap-3">
                  <Link
                    href="/dashboard"
                    className="text-sm font-medium text-white/90 hover:text-white"
                  >
                    个人中心
                  </Link>
                  <span className="flex items-center gap-1.5 text-sm text-white/90">
                    <Gift className="h-4 w-4" />
                    {profile?.points ?? 0} 积分
                  </span>
                  <button
                    type="button"
                    onClick={handleSignIn}
                    disabled={signingIn}
                    className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-60"
                  >
                    {signingIn ? "签到中…" : "签到"}
                  </button>
                  <button
                    type="button"
                    onClick={() => signOut()}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white/90 hover:bg-white/10"
                    aria-label="退出登录"
                  >
                    <LogOut className="h-4 w-4" />
                    退出
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAuthModalOpen(true)}
                  className="flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2 text-sm font-medium text-white hover:bg-white/25"
                >
                  <LogIn className="h-4 w-4" />
                  登录 / 注册
                </button>
              )}
            </>
          )}
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md p-2 text-white hover:bg-white/10 md:hidden"
          aria-expanded={mobileMenuOpen}
          aria-label="打开菜单"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </nav>

      {mobileMenuOpen && (
        <div className="border-t border-white/20 bg-[#1e3a8a] px-4 py-4 md:hidden">
          <ul className="flex flex-col gap-2">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-md px-3 py-2 text-base font-medium text-white hover:bg-white/10"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            {!loading && profile?.role === "admin" && (
              <li>
                <Link
                  href="/admin-control"
                  className="flex items-center justify-between rounded-md px-3 py-2 text-base font-medium text-amber-300 hover:bg-white/10"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span>后台管理</span>
                  {adminPendingCount > 0 && (
                    <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                      {adminPendingCount > 99 ? "99+" : adminPendingCount}
                    </span>
                  )}
                </Link>
              </li>
            )}
            {!loading && (
              <li className="border-t border-white/20 pt-2">
                {user ? (
                  <div className="flex flex-col gap-2">
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2 px-3 py-2 text-white/90 hover:bg-white/10 rounded-lg"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <User className="h-4 w-4" />
                      个人中心
                    </Link>
                    <span className="px-3 py-2 text-amber-300">
                      {profile?.points ?? 0} 积分
                    </span>
                    <button
                      type="button"
                      onClick={() => { handleSignIn(); setMobileMenuOpen(false); }}
                      disabled={signingIn}
                      className="rounded-lg bg-amber-500 px-3 py-2 text-left text-sm font-medium text-white"
                    >
                      {signingIn ? "签到中…" : "签到"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { signOut(); setMobileMenuOpen(false); }}
                      className="rounded-lg px-3 py-2 text-left text-sm text-white/90 hover:bg-white/10"
                    >
                      退出登录
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setAuthModalOpen(true); setMobileMenuOpen(false); }}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-base font-medium text-white hover:bg-white/10"
                  >
                    <LogIn className="h-4 w-4" />
                    登录 / 注册
                  </button>
                )}
              </li>
            )}
          </ul>
        </div>
      )}

      <LoginRegisterModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </header>
  );
}
