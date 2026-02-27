import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getAuctionProducts, getLogisticsStories, getSiteSettings } from "@/lib/data";
import FreightCalculator from "@/app/components/FreightCalculator";
import LogisticsStories from "@/app/components/LogisticsStories";
import PointsShop from "@/app/components/PointsShop";
import ShippingServices from "@/app/components/ShippingServices";
import TrackingQuery from "@/app/components/TrackingQuery";

type Props = { params: Promise<{ locale: string }> };

export default async function Home({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("home");
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
      {announcement && (
        <div className="overflow-hidden bg-amber-500 px-4 py-2 text-sm font-medium text-white">
          <span className="inline-block whitespace-nowrap animate-marquee">{announcement}</span>
        </div>
      )}
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
            {t("heroTitle")}
          </h1>
          <p className="mt-6 text-lg text-white/90 sm:text-xl md:text-2xl">
            {t("heroSubtitle")}
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/shipping-calc"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-base font-semibold text-[#1e3a8a] shadow-lg transition hover:bg-white/95"
            >
              {iconShipping ? (
                <img src={iconShipping} alt="" className="h-6 w-6 object-contain" />
              ) : null}
              {t("shippingCalc")}
            </Link>
            <Link
              href="/tracking"
              className="inline-flex items-center gap-2 rounded-lg border-2 border-white/80 bg-transparent px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10"
            >
              {iconTracking ? (
                <img src={iconTracking} alt="" className="h-6 w-6 object-contain" />
              ) : null}
              {t("tracking")}
            </Link>
            <Link
              href="/points-shop"
              className="inline-flex items-center gap-2 rounded-lg border-2 border-white/80 bg-transparent px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10"
            >
              {iconPoints ? (
                <img src={iconPoints} alt="" className="h-6 w-6 object-contain" />
              ) : null}
              {t("pointsMall")}
            </Link>
          </div>
        </div>
      </section>

      <FreightCalculator />
      <TrackingQuery />

      <section id="points-shop" aria-label={t("pointsShopAria")}>
        <PointsShop products={auctionProducts} />
      </section>

      <LogisticsStories stories={logisticsStories} />
      <ShippingServices />

      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="rounded-2xl bg-white p-8 shadow-sm sm:p-10 md:p-12">
          <h2 className="text-2xl font-bold text-slate-800 sm:text-3xl">
            {t("introTitle")}
          </h2>
          <p className="mt-4 max-w-2xl text-slate-600 leading-relaxed">
            {t("introText")}
          </p>
        </div>
      </section>
    </div>
  );
}
