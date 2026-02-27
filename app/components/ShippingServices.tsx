"use client";

import { Plane, Ship, Package } from "lucide-react";
import { useTranslations } from "next-intl";

const SERVICES = [
  { id: "air", key: "air", descKey: "airDesc", icon: Plane, iconBg: "bg-blue-100 text-blue-600" },
  { id: "sea-bulk", key: "seaBulk", descKey: "seaBulkDesc", icon: Ship, iconBg: "bg-emerald-100 text-emerald-600" },
  { id: "sea-parcel", key: "seaParcel", descKey: "seaParcelDesc", icon: Package, iconBg: "bg-amber-100 text-amber-600" },
] as const;

export default function ShippingServices() {
  const t = useTranslations("shippingServices");
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <h2 className="text-center text-2xl font-bold text-slate-800 sm:text-3xl">
        {t("title")}
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-center text-slate-600">
        {t("subtitle")}
      </p>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className="flex flex-col rounded-2xl bg-white p-6 shadow-md transition hover:shadow-lg sm:p-8"
            >
              <div
                className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${item.iconBg}`}
                aria-hidden
              >
                <Icon className="h-6 w-6" strokeWidth={2} />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-800">
                {t(item.key)}
              </h3>
              <p className="mt-2 flex-1 text-slate-600 leading-relaxed">
                {t(item.descKey)}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
