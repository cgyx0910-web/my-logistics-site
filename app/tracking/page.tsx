import TrackingQuery from "@/app/components/TrackingQuery";

export default function TrackingPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
        <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">物流查询</h1>
        <p className="mt-2 text-slate-600">输入物流单号查询包裹轨迹</p>
        <TrackingQuery />
      </div>
    </main>
  );
}
