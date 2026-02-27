import FreightCalculator from "@/app/components/FreightCalculator";

export default function ShippingCalcPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
        <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">运费计算</h1>
        <p className="mt-2 text-slate-600">输入货物信息，快速预估计费重与总运费（仅供参考）</p>
        <FreightCalculator />
      </div>
    </main>
  );
}
