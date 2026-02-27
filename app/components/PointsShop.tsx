"use client";

import { useTranslations } from "next-intl";
import type { AuctionProductRow } from "@/types/database";
import PointsShopCard from "./PointsShopCard";

export interface PointsShopProps {
  products: AuctionProductRow[];
}

export default function PointsShop({ products }: PointsShopProps) {
  const t = useTranslations("pointsShop");
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-amber-50/80 to-orange-50/60 px-4 py-14 sm:py-16 md:py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(251,191,36,0.15),transparent)]" />
      <div className="relative mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl md:text-4xl">
            {t("title")}{" "}
            <span className="bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent">
              - {t("pointsAsMoney")}
            </span>
          </h2>
          <p className="mt-3 text-base text-slate-600 sm:text-lg">
            {t("zeroYuan")}
          </p>
        </div>

        {products.length === 0 ? (
          <div className="mt-10 flex flex-col items-center justify-center rounded-2xl bg-white/80 py-16 shadow-sm ring-1 ring-slate-200/60">
            <p className="text-lg font-medium text-slate-600">
              {t("comingSoon")}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {t("moreComing")}
            </p>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product, index) => (
              <PointsShopCard key={product.id} product={product} index={index} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
