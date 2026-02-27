import { getAuctionProducts } from "@/lib/data";
import PointsShop from "@/app/components/PointsShop";
import Link from "next/link";

export default async function PointsShopPage() {
  const products = await getAuctionProducts();

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">积分淘货</h1>
            <p className="mt-1 text-slate-600">货品 0 元领，仅需支付跨境运费</p>
          </div>
          <Link
            href="/"
            className="text-sm font-medium text-[#1e3a8a] hover:underline"
          >
            返回首页
          </Link>
        </div>
        <PointsShop products={products} />
      </div>
    </main>
  );
}
