import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getAuctionProduct } from "@/lib/data";
import ProductDetailClient from "@/app/points-shop/[id]/ProductDetailClient";
import { ChevronLeft } from "lucide-react";

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function PointsShopProductPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pointsShop");
  const product = await getAuctionProduct(id);
  if (!product) notFound();

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <Link
          href="/#points-shop"
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-800"
        >
          <ChevronLeft className="h-4 w-4" />
          {t("backToShop")}
        </Link>
        <ProductDetailClient product={product} />
      </div>
    </main>
  );
}
