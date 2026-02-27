"use client";

import { useState } from "react";

type Log = {
  id: string;
  status_title: string;
  location: string | null;
  description: string | null;
  created_at: string;
};

type TrackingResult = {
  found: boolean;
  order?: { id: string; tracking_number: string; status: string };
  logs?: Log[];
  error?: string;
};

export default function TrackingQuery() {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackingResult | null>(null);

  const handleQuery = async () => {
    const trimmed = trackingNumber.trim();
    if (!trimmed) {
      setResult({ found: false, error: "请输入物流单号" });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/tracking?number=${encodeURIComponent(trimmed)}`);
      const data: TrackingResult = await res.json();
      setResult(data);
    } catch {
      setResult({ found: false, error: "查询失败，请稍后重试" });
    } finally {
      setLoading(false);
    }
  };

  const logs = result?.found && result.logs ? result.logs : [];
  const order = result?.found && result.order ? result.order : null;

  return (
    <section className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <div className="rounded-2xl bg-white p-6 shadow-lg sm:p-8">
        <h2 className="text-xl font-bold text-slate-800 sm:text-2xl">
          物流单号查询
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          输入您的物流单号，实时查看包裹轨迹
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-4">
          <input
            type="text"
            value={trackingNumber}
            onChange={(e) => {
              setTrackingNumber(e.target.value);
              setResult(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleQuery()}
            placeholder="请输入您的物流单号（如：EX12345678）"
            className="w-full flex-1 rounded-lg border-2 border-slate-200 bg-slate-50/50 px-4 py-3.5 text-slate-800 placeholder:text-slate-400 transition focus:border-[#1e3a8a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 sm:py-3"
            aria-label="物流单号"
          />
          <button
            type="button"
            onClick={handleQuery}
            disabled={loading}
            className="w-full shrink-0 rounded-lg bg-[#1e3a8a] px-6 py-3.5 font-semibold text-white shadow-md transition hover:bg-[#1e40af] focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:ring-offset-2 disabled:opacity-60 sm:w-auto sm:px-8 sm:py-3"
          >
            {loading ? "查询中…" : "立即查询"}
          </button>
        </div>

        {result && !result.found && (
          <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {result.error || "暂无该单号的物流信息，请核对单号或联系客服。"}
          </p>
        )}

        {result?.found && order && (
          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3">
            <p className="text-sm text-slate-600">
              单号：<span className="font-mono font-medium text-slate-800">{order.tracking_number}</span>
              {" · "}
              状态：<span className="font-medium text-slate-800">{order.status}</span>
            </p>
          </div>
        )}

        {result?.found && logs.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-medium uppercase tracking-wide text-slate-500">
              物流轨迹
            </h3>
            <ul className="mt-6 space-y-0">
              {logs.map((item, index) => (
                <li key={item.id} className="relative flex gap-4 pb-8 last:pb-0">
                  {index < logs.length - 1 && (
                    <span
                      className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-slate-200"
                      aria-hidden
                    />
                  )}
                  <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-emerald-500 bg-emerald-500">
                    <svg
                      className="h-3.5 w-3.5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="font-medium text-slate-800">{item.status_title}</p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {new Date(item.created_at).toLocaleString("zh-CN")}
                    </p>
                    {item.location && (
                      <p className="mt-1 text-sm text-slate-600">{item.location}</p>
                    )}
                    {item.description && (
                      <p className="mt-1 text-sm text-slate-500">{item.description}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {result?.found && logs.length === 0 && order && (
          <p className="mt-6 rounded-lg bg-slate-100 px-4 py-4 text-sm text-slate-600">
            该单号暂无物流轨迹记录，请稍后再查或联系客服。
          </p>
        )}
      </div>
    </section>
  );
}
