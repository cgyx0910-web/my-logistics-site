"use client";

import { useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { AuctionProductRow } from "@/types/database";
import { useAuth } from "@/app/context/AuthContext";
import { useAuthModal } from "@/app/context/AuthModalContext";

const PLACEHOLDER_BGS = ["bg-amber-100", "bg-orange-100", "bg-yellow-100", "bg-amber-50"] as const;

export default function PointsShopCard({
  product,
  index,
}: {
  product: AuctionProductRow;
  index: number;
}) {
  const t = useTranslations("pointsShop");
  const router = useRouter();
  const { user, profile, getAccessToken, refreshProfile } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [bidding, setBidding] = useState(false);

  const isAuction = product.is_auction ?? (product.tag === "积分竞拍");
  const startPoints = product.points_required;
  const directPoints = product.direct_buy_points ?? product.points_required;
  const shippingFee = product.fixed_shipping_fee ?? product.shipping_fee ?? 0;
  const userPoints = profile?.points ?? 0;
  const canBid = user && userPoints >= startPoints;

  const handleBidOrExchange = async () => {
    if (!user) {
      openAuthModal();
      return;
    }
    if (isAuction) {
      if (userPoints < startPoints) {
        alert(t("insufficientPointsBid", { need: startPoints, current: userPoints }));
        return;
      }
      setBidding(true);
      try {
        const token = await getAccessToken();
        const res = await fetch("/api/auction-bids", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            product_id: product.id,
            bid_points: startPoints,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          await refreshProfile();
          alert(t("bidSuccess"));
        } else if (res.status === 401) {
          openAuthModal();
        } else {
          if (process.env.NODE_ENV !== "production") {
            console.error("[淘货出价] 接口失败:", res.status, data);
          }
          alert(data.error ?? t("bidFailed"));
        }
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[淘货出价] 请求异常:", err);
        }
        alert(t("requestFailed"));
      } finally {
        setBidding(false);
      }
    } else {
      if (userPoints < directPoints) {
        alert(t("insufficientPointsDirect", { need: directPoints, current: userPoints }));
        return;
      }
      setBidding(true);
      try {
        const token = await getAccessToken();
        const res = await fetch("/api/auction-bids", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            product_id: product.id,
            bid_points: directPoints,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          await refreshProfile();
            if (data.order_id) {
            alert(t("pleasePayShipping"));
            router.push("/dashboard");
          } else {
            alert(t("exchangeSuccess"));
          }
        } else if (res.status === 401) {
          openAuthModal();
        } else {
          if (process.env.NODE_ENV !== "production") {
            console.error("[淘货兑换] 接口失败:", res.status, data);
          }
          alert(data.error ?? t("exchangeFailed"));
        }
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[淘货兑换] 请求异常:", err);
        }
        alert(t("requestFailed"));
      } finally {
        setBidding(false);
      }
    }
  };

  const thumbUrl = product.images?.[0] ?? product.image_url;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-slate-200/60 transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:ring-amber-200/80">
      <div
        className={`relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden ${PLACEHOLDER_BGS[index % PLACEHOLDER_BGS.length]} transition-transform duration-300 group-hover:scale-105`}
      >
        {thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbUrl}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-4xl text-slate-300/80" aria-hidden>
            📦
          </span>
        )}
        {product.tag && (
          <span className="absolute left-3 top-3 rounded-md bg-red-500 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
            {product.tag}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-bold text-slate-800">{product.name}</h3>
          <Link
            href={`/points-shop/${product.id}`}
            className="shrink-0 text-sm font-medium text-amber-600 hover:text-amber-700"
          >
            {t("viewDetails")}
          </Link>
        </div>

        <div className="mt-2 space-y-1 text-sm">
          {isAuction ? (
            <>
              <p className="font-medium text-amber-700">
                {t("startBid", { start: startPoints, direct: directPoints })}
              </p>
            </>
          ) : (
            <p className="font-medium text-amber-700">
              {t("requiredPoints", { points: directPoints })}
            </p>
          )}
          <p className="text-slate-600">
            {t("fixedShipping", { fee: (Number(shippingFee)).toFixed(2) })}
          </p>
        </div>

        <div className="mt-4 flex-1" />
        <button
          type="button"
          disabled={
            bidding ||
            (user && isAuction && !canBid) ||
            (user && !isAuction && (userPoints < directPoints || (product.stock ?? 0) < 1)) ||
            (!isAuction && (product.stock ?? 0) < 1)
          }
          onClick={handleBidOrExchange}
          className="mt-3 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 font-semibold text-white shadow-md transition hover:from-amber-600 hover:to-orange-600 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {bidding
            ? t("submit")
            : !isAuction && (product.stock ?? 0) < 1
              ? t("soldOut")
              : (product.button_text ?? (isAuction ? t("bidNow") : t("exchangeNow")))}
        </button>
      </div>
    </article>
  );
}
