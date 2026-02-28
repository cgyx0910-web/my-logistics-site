"use client";

import { useState, useEffect } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/app/context/AuthContext";
import { useAuthModal } from "@/app/context/AuthModalContext";
import LanguageSwitcher from "./LanguageSwitcher";
import { LogIn, LogOut, User, Gift } from "lucide-react";

const navKeys = [
  { key: "home", href: "/" },
  { key: "shippingCalc", href: "/shipping-calc" },
  { key: "tracking", href: "/tracking" },
  { key: "pointsShop", href: "/points-shop" },
  { key: "stories", href: "/stories" },
  { key: "about", href: "/about" },
] as const;

export default function Navbar() {
  const t = useTranslations("nav");
  const tAlerts = useTranslations("alerts");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [adminPendingCount, setAdminPendingCount] = useState<number>(0);
  const [adminCancelRequestCount, setAdminCancelRequestCount] = useState<number>(0);
  const { user, profile, loading, signOut, refreshProfile, getAccessToken } = useAuth();
  const { openAuthModal } = useAuthModal();

  useEffect(() => {
    if (!user || profile?.role !== "admin") {
      setAdminPendingCount(0);
      setAdminCancelRequestCount(0);
      return;
    }
    let cancelled = false;
    getAccessToken().then((token) => {
      if (cancelled || !token) return;
      fetch("/api/admin/orders-count", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : { pendingCount: 0, cancelRequestCount: 0 }))
        .then((data) => {
          if (!cancelled) {
            setAdminPendingCount(data.pendingCount ?? 0);
            setAdminCancelRequestCount(data.cancelRequestCount ?? 0);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setAdminPendingCount(0);
            setAdminCancelRequestCount(0);
          }
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
        alert(data.error ?? tAlerts("checkInFailed"));
      }
    } catch {
      alert(tAlerts("checkInRequestFailed"));
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
          {t("brand")}
        </Link>

        <div className="hidden items-center gap-4 md:flex">
          <LanguageSwitcher />
          {navKeys.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-white/95 transition-colors hover:text-white"
            >
              {t(item.key)}
            </Link>
          ))}
          {!loading && profile?.role === "admin" && (
            <Link
              href="/admin-control"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-300 hover:text-amber-200"
            >
              <span>{t("adminControl")}</span>
              {adminPendingCount > 0 && (
                <span
                  className="flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white"
                  aria-label={t("pendingOrders", { count: adminPendingCount })}
                >
                  {adminPendingCount > 99 ? "99+" : adminPendingCount}
                </span>
              )}
              {adminCancelRequestCount > 0 && (
                <span
                  className="flex min-w-[1.25rem] items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-xs font-bold text-white"
                  title="客户申请取消订单数"
                >
                  {adminCancelRequestCount > 99 ? "99+" : adminCancelRequestCount} 取消
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
                    {t("dashboard")}
                  </Link>
                  <span className="flex items-center gap-1.5 text-sm text-white/90">
                    <Gift className="h-4 w-4" />
                    {profile?.points ?? 0} {t("points")}
                  </span>
                  <button
                    type="button"
                    onClick={handleSignIn}
                    disabled={signingIn}
                    className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-60"
                  >
                    {signingIn ? t("checkingIn") : t("checkIn")}
                  </button>
                  <button
                    type="button"
                    onClick={() => signOut()}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white/90 hover:bg-white/10"
                    aria-label={t("signOutLabel")}
                  >
                    <LogOut className="h-4 w-4" />
                    {t("signOut")}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => openAuthModal()}
                  className="flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2 text-sm font-medium text-white hover:bg-white/25"
                >
                  <LogIn className="h-4 w-4" />
                  {t("loginRegister")}
                </button>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <LanguageSwitcher />
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md p-2 text-white hover:bg-white/10"
            aria-expanded={mobileMenuOpen}
            aria-label={t("openMenu")}
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
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="border-t border-white/20 bg-[#1e3a8a] px-4 py-4 md:hidden">
          <ul className="flex flex-col gap-2">
            {navKeys.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-md px-3 py-2 text-base font-medium text-white hover:bg-white/10"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t(item.key)}
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
                  <span>{t("adminControl")}</span>
                  <span className="flex items-center gap-1.5">
                    {adminPendingCount > 0 && (
                      <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                        {adminPendingCount > 99 ? "99+" : adminPendingCount}
                      </span>
                    )}
                    {adminCancelRequestCount > 0 && (
                      <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
                        {adminCancelRequestCount > 99 ? "99+" : adminCancelRequestCount} 取消
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            )}
            {!loading && (
              <li className="border-t border-white/20 pt-2">
                {user ? (
                  <div className="flex flex-col gap-2">
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-white/90 hover:bg-white/10"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <User className="h-4 w-4" />
                      {t("dashboard")}
                    </Link>
                    <span className="px-3 py-2 text-amber-300">
                      {profile?.points ?? 0} {t("points")}
                    </span>
                    <button
                      type="button"
                      onClick={() => { handleSignIn(); setMobileMenuOpen(false); }}
                      disabled={signingIn}
                      className="rounded-lg bg-amber-500 px-3 py-2 text-left text-sm font-medium text-white"
                    >
                      {signingIn ? t("checkingIn") : t("checkIn")}
                    </button>
                    <button
                      type="button"
                      onClick={() => { signOut(); setMobileMenuOpen(false); }}
                      className="rounded-lg px-3 py-2 text-left text-sm text-white/90 hover:bg-white/10"
                    >
                      {t("signOut")}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => { openAuthModal(); setMobileMenuOpen(false); }}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-base font-medium text-white hover:bg-white/10"
                  >
                    <LogIn className="h-4 w-4" />
                    {t("loginRegister")}
                  </button>
                )}
              </li>
            )}
          </ul>
        </div>
      )}

    </header>
  );
}
