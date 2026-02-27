"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { AuctionProductRow } from "@/types/database";
import { useAuth } from "@/app/context/AuthContext";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function ProductDetailClient({ product }: { product: AuctionProductRow }) {
  const router = useRouter();
  const { user, profile, getAccessToken, refreshProfile } = useAuth();
  const [bidding, setBidding] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const galleryRef = useRef<HTMLDivElement>(null);

  const isAuction = product.is_auction ?? (product.tag === "积分竞拍");
  const startPoints = product.points_required;
  const directPoints = product.direct_buy_points ?? product.points_required;
  const shippingFee = Number(product.fixed_shipping_fee ?? product.shipping_fee ?? 0);
  const userPoints = profile?.points ?? 0;
  const images = product.images?.length ? product.images : (product.image_url ? [product.image_url] : []);

  const goPrev = useCallback(() => {
    setGalleryIndex((i) => (i <= 0 ? images.length - 1 : i - 1));
  }, [images.length]);
  const goNext = useCallback(() => {
    setGalleryIndex((i) => (i >= images.length - 1 ? 0 : i + 1));
  }, [images.length]);

  useEffect(() => {
    if (images.length <= 0 || !galleryRef.current) return;
    const el = galleryRef.current;
    const w = el.offsetWidth;
    el.scrollTo({ left: galleryIndex * w, behavior: "smooth" });
  }, [galleryIndex, images.length]);

  useEffect(() => {
    if (images.length <= 1) return;
    const t = setInterval(goNext, 4000);
    return () => clearInterval(t);
  }, [images.length, goNext]);

  const onGalleryScroll = useCallback(() => {
    const el = galleryRef.current;
    if (!el || images.length <= 0) return;
    const w = el.offsetWidth;
    const i = Math.round(el.scrollLeft / w);
    setGalleryIndex(Math.max(0, Math.min(i, images.length - 1)));
  }, [images.length]);

  const handleBidOrExchange = async () => {
    if (!user) {
      router.push("/login");
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
          body: JSON.stringify({ product_id: product.id, bid_points: startPoints }),
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
          body: JSON.stringify({ product_id: product.id, bid_points: directPoints }),
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

  return (
    <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-slate-200/60">
      {/* 图片画廊：多图滑动或单图 */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        {images.length > 0 ? (
          <>
            <div
              ref={galleryRef}
              onScroll={onGalleryScroll}
              className="flex h-full w-full snap-x snap-mandatory overflow-x-auto scroll-smooth"
              style={{ scrollSnapType: "x mandatory" }}
            >
              {images.map((url, i) => (
                <div
                  key={url}
                  className="h-full w-full shrink-0 snap-center snap-always"
                  style={{ scrollSnapAlign: "center" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`${product.name} - ${i + 1}`}
                    className="h-full w-full object-contain"
                  />
                </div>
              ))}
            </div>
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-black/60"
                  aria-label="上一张"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-black/60"
                  aria-label="下一张"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setGalleryIndex(i)}
                      className={`h-2 w-2 rounded-full transition ${i === galleryIndex ? "bg-white" : "bg-white/50"}`}
                      aria-label={`第 ${i + 1} 张`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl text-slate-300">📦</div>
        )}
        {product.tag && (
          <span className="absolute left-3 top-3 rounded-md bg-red-500 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
            {product.tag}
          </span>
        )}
      </div>

      <div className="p-5 sm:p-6">
        <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">{product.name}</h1>
        {product.description && (
          <p className="mt-3 whitespace-pre-wrap text-slate-600">{product.description}</p>
        )}

        <div className="mt-5 space-y-2 rounded-xl bg-amber-50/80 p-4">
          {isAuction ? (
            <p className="font-medium text-amber-800">
              起拍积分：{startPoints} / 直拍积分：{directPoints}
            </p>
          ) : (
            <p className="font-medium text-amber-800">所需积分：{directPoints}</p>
          )}
          <p className="text-slate-700">
            固定运费（Shipping Fee）：¥{shippingFee.toFixed(2)}
          </p>
          <p className="text-sm text-slate-600">库存：{product.stock}</p>
        </div>

        <button
          type="button"
          disabled={
            bidding ||
            (user && isAuction && userPoints < startPoints) ||
            (user && !isAuction && (userPoints < directPoints || product.stock < 1)) ||
            (!isAuction && product.stock < 1)
          }
          onClick={handleBidOrExchange}
          className="mt-6 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 font-semibold text-white shadow-md transition hover:from-amber-600 hover:to-orange-600 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {!user
            ? "登录后兑换/出价"
            : !isAuction && product.stock < 1
              ? "已售罄"
              : bidding
                ? "提交中…"
                : product.button_text ?? (isAuction ? "立即出价" : "立即兑换")}
        </button>
      </div>
    </div>
  );
}
