"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AuctionProductRow } from "@/types/database";
import { useAuth } from "@/app/context/AuthContext";

const PLACEHOLDER_BGS = ["bg-amber-100", "bg-orange-100", "bg-yellow-100", "bg-amber-50"] as const;

export default function PointsShopCard({
  product,
  index,
}: {
  product: AuctionProductRow;
  index: number;
}) {
  const router = useRouter();
  const { user, profile, getAccessToken, refreshProfile } = useAuth();
  const [bidding, setBidding] = useState(false);

  const isAuction = product.is_auction ?? (product.tag === "积分竞拍");
  const startPoints = product.points_required;
  const directPoints = product.direct_buy_points ?? product.points_required;
  const shippingFee = product.fixed_shipping_fee ?? product.shipping_fee ?? 0;
  const userPoints = profile?.points ?? 0;
  const canBid = user && userPoints >= startPoints;

  const handleBidOrExchange = async () => {
    if (!user) {
      alert("请先登录");
      return;
    }
    if (isAuction) {
      if (userPoints < startPoints) {
        alert(`积分余额不足，起拍需 ${startPoints} 积分，当前 ${userPoints} 积分`);
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
          alert("出价成功");
        } else {
          if (process.env.NODE_ENV !== "production") {
            console.error("[淘货出价] 接口失败:", res.status, data);
          }
          alert(data.error ?? "出价失败");
        }
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[淘货出价] 请求异常:", err);
        }
        alert("请求失败");
      } finally {
        setBidding(false);
      }
    } else {
      if (userPoints < directPoints) {
        alert(`积分余额不足，直拍需 ${directPoints} 积分，当前 ${userPoints} 积分`);
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
            alert("请支付预设运费");
            router.push("/dashboard");
          } else {
            alert("兑换成功");
          }
        } else {
          if (process.env.NODE_ENV !== "production") {
            console.error("[淘货兑换] 接口失败:", res.status, data);
          }
          alert(data.error ?? "兑换失败");
        }
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[淘货兑换] 请求异常:", err);
        }
        alert("请求失败");
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
            查看详情
          </Link>
        </div>

        <div className="mt-2 space-y-1 text-sm">
          {isAuction ? (
            <>
              <p className="font-medium text-amber-700">
                起拍积分：{startPoints} / 直拍积分：{directPoints}
              </p>
            </>
          ) : (
            <p className="font-medium text-amber-700">
              所需积分：{directPoints}
            </p>
          )}
          <p className="text-slate-600">
            固定运费（Shipping Fee）：¥{(Number(shippingFee)).toFixed(2)}
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
            ? "提交中…"
            : !isAuction && (product.stock ?? 0) < 1
              ? "已售罄"
              : (product.button_text ?? (isAuction ? "立即出价" : "立即兑换"))}
        </button>
      </div>
    </article>
  );
}
