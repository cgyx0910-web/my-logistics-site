import Link from "next/link";
import { getAuctionProducts, getLogisticsStories, getSiteSettings } from "@/lib/data";
import FreightCalculator from "./components/FreightCalculator";
import LogisticsStories from "./components/LogisticsStories";
import PointsShop from "./components/PointsShop";
import ShippingServices from "./components/ShippingServices";
import TrackingQuery from "./components/TrackingQuery";

export default async function Home() {
  const [auctionProducts, logisticsStories, siteSettings] = await Promise.all([
    getAuctionProducts(),
    getLogisticsStories(),
    getSiteSettings(),
  ]);

  const bannerUrl = (siteSettings.home_banner || siteSettings.home_banner_1)?.trim() || undefined;
  const iconShipping = siteSettings.home_icon_shipping?.trim() || undefined;
  const iconTracking = siteSettings.home_icon_tracking?.trim() || undefined;
  const iconPoints = siteSettings.home_icon_points_shop?.trim() || undefined;
  const announcement = siteSettings.site_announcement?.trim() || undefined;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 滚动公告（site_announcement） */}
      {announcement && (
        <div className="overflow-hidden bg-amber-500 px-4 py-2 text-sm font-medium text-white">
          <span className="inline-block whitespace-nowrap animate-marquee">{announcement}</span>
        </div>
      )}
      {/* Hero 区域（可选 Banner 图与功能图标来自 site_settings） */}
      <section
        className="relative overflow-hidden px-4 py-20 sm:py-28 md:py-36"
        style={
          bannerUrl
            ? { backgroundImage: `url(${bannerUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
            : { background: "linear-gradient(to bottom right, #1e3a8a, #2563eb, #1e40af)" }
        }
      >
        {!bannerUrl && (
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.03%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-80" />
        )}
        <div className="relative mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-sm sm:text-5xl md:text-6xl lg:text-7xl">
            东南亚跨境物流专家
          </h1>
          <p className="mt-6 text-lg text-white/90 sm:text-xl md:text-2xl">
            专注台湾、泰国、柬埔寨、马、印集运服务
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/shipping-calc"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-base font-semibold text-[#1e3a8a] shadow-lg transition hover:bg-white/95"
            >
              {iconShipping ? (
                <img src={iconShipping} alt="" className="h-6 w-6 object-contain" />
              ) : null}
              运费计算
            </Link>
            <Link
              href="/tracking"
              className="inline-flex items-center gap-2 rounded-lg border-2 border-white/80 bg-transparent px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10"
            >
              {iconTracking ? (
                <img src={iconTracking} alt="" className="h-6 w-6 object-contain" />
              ) : null}
              物流查询
            </Link>
            <Link
              href="/points-shop"
              className="inline-flex items-center gap-2 rounded-lg border-2 border-white/80 bg-transparent px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10"
            >
              {iconPoints ? (
                <img src={iconPoints} alt="" className="h-6 w-6 object-contain" />
              ) : null}
              积分商城
            </Link>
          </div>
        </div>
      </section>

      {/* 运费试算 */}
      <FreightCalculator />

      {/* 物流单号查询 */}
      <TrackingQuery />

      {/* 积分淘货 */}
      <section id="points-shop" aria-label="积分淘货">
        <PointsShop products={auctionProducts} />
      </section>

      {/* 物流故事 (Logistics Stories) */}
      <LogisticsStories stories={logisticsStories} />

      {/* 运输服务介绍 */}
      <ShippingServices />

      {/* 简要介绍区域 */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="rounded-2xl bg-white p-8 shadow-sm sm:p-10 md:p-12">
          <h2 className="text-2xl font-bold text-slate-800 sm:text-3xl">
            专业、可靠、省心
          </h2>
          <p className="mt-4 max-w-2xl text-slate-600 leading-relaxed">
            小太羊国际物流致力于为跨境卖家与个人用户提供一站式集运与物流解决方案，
            覆盖台湾、泰国、柬埔寨、马来西亚、印尼等市场，让您的货物安全、高效送达。
          </p>
        </div>
      </section>
    </div>
  );
}
