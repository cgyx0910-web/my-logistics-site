"use client";

import { useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { useLocale, useTranslations } from "next-intl";
import { Package, Loader2, Gift, AlertCircle } from "lucide-react";

type OrderRow = {
  id: string;
  tracking_number: string | null;
  status: string;
  shipping_fee: number;
  fixed_shipping_fee?: number | null;
  created_at: string;
  cargo_details: string | null;
  sender_name: string | null;
  sender_phone: string | null;
  sender_address: string | null;
  receiver_name: string | null;
  receiver_phone: string | null;
  receiver_address: string | null;
  order_type?: string;
};

function isWaybillComplete(o: OrderRow): boolean {
  if (o.order_type === "treasure" || o.status !== "待确认") return false;
  const v = (s: string | null) => (s ?? "").trim();
  return !!(
    v(o.cargo_details) &&
    v(o.sender_name) &&
    v(o.sender_phone) &&
    v(o.sender_address) &&
    v(o.receiver_name) &&
    v(o.receiver_phone) &&
    v(o.receiver_address)
  );
}

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const { user, profile, loading: authLoading, getAccessToken } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
      return;
    }
    if (!user) return;

    async function fetchOrders() {
      const token = await getAccessToken();
      if (!token) {
        setLoading(false);
        return;
      }
      const res = await fetch("/api/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLoading(false);
      if (res.ok) {
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : []);
      } else if (res.status !== 401) {
        setOrders([]);
      }
    }
    fetchOrders();
  }, [user, authLoading, router, getAccessToken]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-800">{t("title")}</h1>
      <div className="mt-4 flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
          <Gift className="h-6 w-6 text-amber-600" />
        </div>
        <div>
          <p className="font-medium text-slate-800">{profile?.email ?? t("user")}</p>
          <p className="text-sm text-slate-600">
            {t("points")}：<span className="font-semibold text-amber-600">{profile?.points ?? 0}</span>
          </p>
        </div>
      </div>

      <h2 className="mt-8 text-lg font-bold text-slate-800">{t("myOrders")}</h2>
      <p className="mt-1 text-sm text-slate-600">{t("ordersHint")}</p>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : orders.length === 0 ? (
          <div className="py-12 text-center text-slate-500">{t("noOrders")}</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {orders.map((o) => {
              const needWaybill = o.status === "待确认" && !isWaybillComplete(o);
              return (
                <li key={o.id}>
                  <Link
                    href={`/dashboard/orders/${o.id}`}
                    className="flex items-center justify-between px-4 py-4 transition hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <Package className="h-5 w-5 text-slate-400" />
                      <div>
                        <p className="font-mono text-slate-800">
                          {o.tracking_number || t("pendingNumber")}
                        </p>
                        <p className="text-sm text-slate-500">
                          {o.order_type === "treasure" && (
                            <span className="mr-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
                              {t("treasure")}
                            </span>
                          )}
                          {o.status} · ¥{Number(o.fixed_shipping_fee ?? o.shipping_fee).toFixed(2)}
                        </p>
                        {needWaybill && (
                          <p className="mt-1 flex items-center gap-1 text-sm font-medium text-amber-700">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {t("completeWaybill")}
                          </p>
                        )}
                        {o.status === "待确认" && isWaybillComplete(o) && (
                          <p className="mt-1 text-sm font-medium text-green-700">
                            {t("readyForConfirm")}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-sm text-slate-400">
                      {new Date(o.created_at).toLocaleDateString(locale)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
