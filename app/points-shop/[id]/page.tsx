import { notFound } from "next/navigation";
import Link from "next/link";
import { getAuctionProduct } from "@/lib/data";
import ProductDetailClient from "./ProductDetailClient";
import { ChevronLeft } from "lucide-react";

export default async function PointsShopProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
          返回积分淘货
        </Link>
        <ProductDetailClient product={product} />
      </div>
    </main>
  );
}
