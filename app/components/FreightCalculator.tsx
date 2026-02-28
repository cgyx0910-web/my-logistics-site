"use client";

import { useState, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/app/context/AuthContext";
import { useAuthModal } from "@/app/context/AuthModalContext";
import OrderSuccessModal from "./OrderSuccessModal";

const VOLUME_DIVISOR = 6000;
const COUNTRY_KEYS = ["tw", "th", "kh", "my", "id"] as const;

type ShippingRateItem = {
  id: string;
  country: string;
  shipping_method: string;
  unit_price: number;
  min_weight: number;
  max_weight: number | null;
  currency: string;
};

export default function FreightCalculator() {
  const t = useTranslations("shippingCalc");
  const tCountries = useTranslations("countries");
  const [rates, setRates] = useState<ShippingRateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [destination, setDestination] = useState("");
  const [shippingMethod, setShippingMethod] = useState("");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [result, setResult] = useState<
    | {
        chargeableWeight: number;
        totalFreight: number;
        unitPrice: number;
      }
    | { noRate: true }
    | null
  >(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [successModal, setSuccessModal] = useState<{
    orderId: string;
    trackingNumber: string | null;
    shippingFee: number;
  } | null>(null);
  const { getAccessToken } = useAuth();
  const { openAuthModal } = useAuthModal();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/shipping-rates")
      .then((res) => res.json())
      .then((data: ShippingRateItem[]) => {
        if (!cancelled && Array.isArray(data)) setRates(data);
      })
      .catch(() => {
        if (!cancelled) setRates([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const countries = useMemo(() => {
    const set = new Set(rates.map((r) => r.country));
    return Array.from(set).sort();
  }, [rates]);

  const methodsByCountry = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const r of rates) {
      if (!map[r.country]) map[r.country] = [];
      if (!map[r.country].includes(r.shipping_method)) {
        map[r.country].push(r.shipping_method);
      }
    }
    return map;
  }, [rates]);

  /** 多阶梯：按 (country, shipping_method) 去重展示；计算时按计费重选对应阶梯 */
  const uniqueRatesByCountryMethod = useMemo(() => {
    const seen = new Set<string>();
    return rates.filter((r) => {
      const k = `${r.country}|${r.shipping_method}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [rates]);

  const availableMethods = destination ? methodsByCountry[destination] ?? [] : [];
  const currentMethodValid =
    !!destination && !!shippingMethod && availableMethods.includes(shippingMethod);

  useEffect(() => {
    if (!destination) {
      setShippingMethod("");
      return;
    }
    const methods = methodsByCountry[destination] ?? [];
    if (!methods.includes(shippingMethod)) {
      setShippingMethod(methods[0] ?? "");
    }
  }, [destination, methodsByCountry, shippingMethod]);

  const handleDestinationChange = (country: string) => {
    setDestination(country);
    const methods = methodsByCountry[country] ?? [];
    setShippingMethod(methods[0] ?? "");
    setResult(null);
  };

  const handleCalculate = () => {
    const l = parseFloat(length) || 0;
    const w = parseFloat(width) || 0;
    const h = parseFloat(height) || 0;
    const actualWeight = parseFloat(weight) || 0;

    const volumetricWeight = (l * w * h) / VOLUME_DIVISOR;
    const chargeableWeight = Math.max(volumetricWeight, actualWeight);

    const candidates = rates.filter(
      (r) =>
        r.country === destination &&
        r.shipping_method === shippingMethod &&
        Number(r.min_weight) <= chargeableWeight &&
        (r.max_weight == null || chargeableWeight <= Number(r.max_weight))
    );
    const rate = candidates.length > 0
      ? candidates.sort((a, b) => Number(b.min_weight) - Number(a.min_weight))[0]
      : null;

    if (!rate) {
      setResult({ noRate: true });
      return;
    }

    const unitPrice = Number(rate.unit_price);
    const totalFreight = chargeableWeight * unitPrice;

    setResult({
      chargeableWeight: Math.ceil(chargeableWeight * 100) / 100,
      totalFreight: Math.ceil(totalFreight * 100) / 100,
      unitPrice,
    });
  };

  if (loading) {
    return (
      <section id="freight-calculator" className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
        <div className="rounded-2xl bg-white p-6 shadow-lg sm:p-8">
          <p className="text-slate-500">{t("loadingRates")}</p>
        </div>
      </section>
    );
  }

  return (
    <section id="freight-calculator" className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <div className="rounded-2xl bg-white p-6 shadow-lg sm:p-8">
        <h2 className="text-xl font-bold text-slate-800 sm:text-2xl">
          {t("sectionTitle")}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {t("sectionDesc")}
        </p>

        <div className="mt-6 space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              {t("destination")}
            </label>
            <select
              value={destination}
              onChange={(e) => handleDestinationChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-800 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20"
            >
              <option value="">{t("selectDestination")}</option>
              {countries.map((code) => (
                <option key={code} value={code}>
                  {(code === "tw" || code === "th" || code === "kh" || code === "my" || code === "id") ? tCountries(code) : code}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              {t("shippingMethod")}
            </label>
            <select
              value={shippingMethod}
              onChange={(e) => {
                setShippingMethod(e.target.value);
                setResult(null);
              }}
              disabled={!destination}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-800 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
            >
              <option value="">
                {destination ? t("selectMethod") : t("selectDestinationFirst")}
              </option>
              {availableMethods.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                {t("length")}
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={length}
                onChange={(e) => setLength(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 placeholder:text-slate-400 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                {t("width")}
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 placeholder:text-slate-400 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                {t("height")}
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 placeholder:text-slate-400 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              {t("weight")}
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="0"
              className="w-full max-w-xs rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 placeholder:text-slate-400 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20"
            />
          </div>

          <button
            type="button"
            onClick={handleCalculate}
            disabled={!currentMethodValid}
            className="w-full rounded-lg bg-[#2563eb] px-6 py-3 font-semibold text-white shadow-md transition hover:bg-[#1d4ed8] focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-8"
          >
            {t("calculate")}
          </button>
        </div>

        {result !== null && "noRate" in result && result.noRate && (
          <div className="mt-8 rounded-xl border-2 border-amber-200 bg-amber-50 p-6 text-amber-800">
            <p className="font-medium">{t("noRate")}</p>
          </div>
        )}

        {result !== null && !("noRate" in result) && (
          <div className="mt-8 rounded-xl bg-slate-50 p-6 ring-2 ring-[#2563eb]/30">
            <h3 className="text-sm font-medium uppercase tracking-wide text-slate-500">
              {t("resultTitle")}
            </h3>
            <p className="mt-3 text-sm font-medium text-slate-700">
              {t("unitPrice", { price: result.unitPrice })}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {t("chargeableWeight", { weight: result.chargeableWeight })}
            </p>
            <div className="mt-4 flex flex-wrap gap-8">
              <div>
                <p className="text-sm text-slate-600">{t("estimatedWeight")}</p>
                <p className="mt-0.5 text-2xl font-bold text-[#1e3a8a] sm:text-3xl">
                  {result.chargeableWeight} kg
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600">{t("estimatedFreight")}</p>
                <p className="mt-0.5 text-2xl font-bold text-[#1e3a8a] sm:text-3xl">
                  ¥{result.totalFreight.toFixed(2)}
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={savingOrder}
                onClick={async () => {
                  const token = await getAccessToken();
                  if (!token) {
                    openAuthModal();
                    return;
                  }
                  setSavingOrder(true);
                  setSuccessModal(null);
                  try {
                    const res = await fetch("/api/orders", {
                      method: "POST",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                      body: JSON.stringify({
                        shipping_fee: result.totalFreight,
                      }),
                    });
                    const data = await res.json();
                    if (res.ok && data?.id) {
                      setSuccessModal({
                        orderId: data.id,
                        trackingNumber: data.tracking_number ?? null,
                        shippingFee: result.totalFreight,
                      });
                    } else if (res.status === 401) {
                      openAuthModal();
                    } else {
                      alert(data?.error ?? t("saveOrderFailed"));
                    }
                  } catch {
                    alert(t("saveOrderRequestFailed"));
                  } finally {
                    setSavingOrder(false);
                  }
                }}
                className="rounded-lg bg-[#1e3a8a] px-5 py-2.5 font-semibold text-white shadow transition hover:bg-[#1e40af] disabled:opacity-60"
              >
                {savingOrder ? t("savingOrder") : t("saveOrder")}
              </button>
            </div>
          </div>
        )}

        {successModal && (
          <OrderSuccessModal
            open={!!successModal}
            onClose={() => setSuccessModal(null)}
            orderId={successModal.orderId}
            trackingNumber={successModal.trackingNumber}
            shippingFee={successModal.shippingFee}
          />
        )}
      </div>
    </section>
  );
}
