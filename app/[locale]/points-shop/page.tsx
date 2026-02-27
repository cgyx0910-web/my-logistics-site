import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { getAuctionProducts } from "@/lib/data";
import PointsShop from "@/app/components/PointsShop";
import { Link } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

export default async function PointsShopPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pointsShop");
  const tAbout = await getTranslations("about");
  const products = await getAuctionProducts();

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">{t("title")}</h1>
            <p className="mt-1 text-slate-600">{t("subtitle")}</p>
          </div>
          <Link
            href="/"
            className="text-sm font-medium text-[#1e3a8a] hover:underline"
          >
            {tAbout("backHome")}
          </Link>
        </div>
        <PointsShop products={products} />
      </div>
    </main>
  );
}
