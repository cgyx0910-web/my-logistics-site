"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import Papa from "papaparse";
import { useAuth } from "@/app/context/AuthContext";
import { useToast } from "@/app/context/ToastContext";
import {
  Upload,
  Loader2,
  FileSpreadsheet,
  CheckCircle,
  Percent,
  X,
  Download,
} from "lucide-react";

/** 标准表头：country, method, price_per_kg, min_weight, estimated_days（表头百分之百准确） */
const CSV_HEADERS = ["country", "method", "price_per_kg", "min_weight", "estimated_days"] as const;

/** 下载空白模板（仅表头，无数据行） */
function downloadBlankTemplate() {
  const rows = [[...CSV_HEADERS]];
  const csv = Papa.unparse(rows, { header: false });
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "shipping_rates_blank.csv";
  a.click();
  URL.revokeObjectURL(url);
}

/** 下载带示例行的模板 */
function downloadExampleTemplate() {
  const exampleRow = ["tw", "空运特快", "25", "0", "3-5天"];
  const rows = [[...CSV_HEADERS], exampleRow];
  const csv = Papa.unparse(rows, { header: false });
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "shipping_rates_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

const SYSTEM_FIELDS = [
  { key: "", label: "不映射" },
  { key: "country", label: "国家 (country)" },
  { key: "shipping_method", label: "运输方式 (method)" },
  { key: "unit_price", label: "单价 (price_per_kg)" },
  { key: "min_weight", label: "起运重 (min_weight)" },
  { key: "max_weight", label: "重量上限 (max_weight)" },
  { key: "currency", label: "币种 (currency)" },
  { key: "delivery_days", label: "时效 (estimated_days)" },
] as const;

type DryRunResult = {
  errors: { rowIndex: number; reason: string }[];
  toAdd: { rowIndex: number; country: string; shipping_method: string; unit_price: number; min_weight: number; max_weight: number | null; currency: string }[];
  toUpdate: {
    rowIndex: number;
    id: string;
    country: string;
    shipping_method: string;
    min_weight: number;
    max_weight: number | null;
    currency: string;
    old_unit_price: number;
    new_unit_price: number;
  }[];
  abnormal: { rowIndex: number; reason: string }[];
};

/** 使用 papaparse 解析 CSV，返回 { data: string[][], errors: { row: number, message: string }[] } */
function parseCSVWithPapa(text: string): { data: string[][]; errors: { row: number; message: string }[] } {
  const errors: { row: number; message: string }[] = [];
  const result = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: false,
  });
  const rows = (result.data ?? []) as string[][];
  result.errors?.forEach((e: { row?: number; message?: string }) => {
    if (e.row != null) errors.push({ row: e.row + 1, message: e.message ?? "解析错误" });
  });
  return { data: rows, errors };
}

export default function ShippingRatesAdmin() {
  const { getAccessToken } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<"list" | "upload" | "adjust" | "logs">("list");
  const [dropzoneActive, setDropzoneActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  type RateRow = {
    id: string;
    country: string;
    shipping_method: string;
    unit_price: number;
    min_weight: number;
    max_weight: number | null;
    currency: string;
    delivery_days: string | null;
  };
  const [rates, setRates] = useState<RateRow[]>([]);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [editingCell, setEditingCell] = useState<{ id: string; field: "unit_price" | "delivery_days"; value: string } | null>(null);
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchRates = useCallback(async () => {
    const token = await getAccessToken();
    const res = await fetch(`${typeof window !== "undefined" ? window.location.origin : ""}/api/admin/shipping-rates`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const data = await res.json();
      setRates(Array.isArray(data) ? data : []);
    }
  }, [getAccessToken]);

  useEffect(() => {
    if (tab !== "list") return;
    setRatesLoading(true);
    fetchRates().finally(() => setRatesLoading(false));
  }, [tab, fetchRates]);

  useEffect(() => {
    if (editingCell) inputRef.current?.focus();
  }, [editingCell]);

  const handleCellSave = async () => {
    if (!editingCell) return;
    const { id, field, value } = editingCell;
    setSavingCell(id);
    const token = await getAccessToken();
    try {
      const body = field === "unit_price" ? { unit_price: parseFloat(value) || 0 } : { delivery_days: value.trim() || null };
      const res = await fetch(`${window.location.origin}/api/admin/shipping-rates/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setRates((prev) =>
          prev.map((r) =>
            r.id === id
              ? { ...r, [field]: field === "unit_price" ? parseFloat(value) || 0 : (value.trim() || null) }
              : r
          )
        );
      } else {
        const data = await res.json();
        alert(data.error ?? "保存失败");
      }
    } finally {
      setSavingCell(null);
      setEditingCell(null);
    }
  };

  const [errorRowsModal, setErrorRowsModal] = useState<{ rowIndex: number; reason: string }[] | null>(null);
  const [fileParseErrors, setFileParseErrors] = useState<{ rowIndex: number; reason: string }[]>([]);

  const [file, setFile] = useState<File | null>(null);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMap, setColumnMap] = useState<Record<number, string>>({});
  const [parseProgress, setParseProgress] = useState(0);
  const [dryRunResult, setDryRunResult] = useState<DryRunResult | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const [percentValue, setPercentValue] = useState("");
  const [percentFilterCountry, setPercentFilterCountry] = useState("");
  const [percentFilterMethod, setPercentFilterMethod] = useState("");
  const [percentPreview, setPercentPreview] = useState<{ count: number; preview: { id: string; country: string; shipping_method: string; old_price: number; new_price: number }[] } | null>(null);
  const [adjustLoading, setAdjustLoading] = useState(false);

  const [logs, setLogs] = useState<{ id: string; operated_at: string; action: string; countries: string[] | null; summary: unknown }[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const [singleCountry, setSingleCountry] = useState("");
  const [singleMethod, setSingleMethod] = useState("");
  const [singleUnitPrice, setSingleUnitPrice] = useState("");
  const [singleMinWeight, setSingleMinWeight] = useState("0");
  const [singleMaxWeight, setSingleMaxWeight] = useState("");
  const [singleDeliveryDays, setSingleDeliveryDays] = useState("");
  const [singleCurrency, setSingleCurrency] = useState("CNY");
  const [singleSaving, setSingleSaving] = useState(false);

  const fetchLogs = useCallback(async () => {
    const token = await getAccessToken();
    const res = await fetch(`${typeof window !== "undefined" ? window.location.origin : ""}/api/admin/shipping-rates?logs=1`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    }
  }, [getAccessToken]);

  useEffect(() => {
    if (tab !== "logs") return;
    setLogsLoading(true);
    fetchLogs().finally(() => setLogsLoading(false));
  }, [tab, fetchLogs]);

  const processFile = useCallback((f: File) => {
    setFile(f);
    setDryRunResult(null);
    setUploadSuccess(null);
    setErrorRowsModal(null);
    setParseProgress(0);
    const reader = new FileReader();
    reader.onprogress = () => setParseProgress(30);
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const { data: rows, errors: parseErrors } = parseCSVWithPapa(text);
      setParseProgress(70);
      if (rows.length > 0) {
        const headerRow = Array.isArray(rows[0]) ? rows[0] : [];
        const headerStrings = headerRow.map((c: unknown) => String(c ?? "").trim());
        setHeaders(headerStrings);
        const dataRows = rows.slice(1).map((r: unknown) => (Array.isArray(r) ? r : []).map((c: unknown) => String(c ?? "")));
        setRawRows(dataRows);
        const map: Record<number, string> = {};
        headerStrings.forEach((h, i) => {
          const lower = h.toLowerCase().trim();
          if (lower === "country" || /国家|目的地|country_code/i.test(h)) map[i] = "country";
          else if (lower === "method" || /运输|方式|渠道/i.test(h)) map[i] = "shipping_method";
          else if (lower === "price_per_kg" || /单价|价格|unit_price/i.test(h)) map[i] = "unit_price";
          else if (lower === "min_weight" || /起运|min|起始/i.test(h)) map[i] = "min_weight";
          else if (lower === "max_weight" || /上限|max|结束/i.test(h)) map[i] = "max_weight";
          else if (lower === "currency" || /币种/i.test(h)) map[i] = "currency";
          else if (lower === "estimated_days" || /时效|delivery|days/i.test(h)) map[i] = "delivery_days";
        });
        setColumnMap(map);
        const emptyRowErrors = dataRows
          .map((row, i) => (row.every((c) => !c.trim()) ? { rowIndex: i + 2, reason: "空行" } : null))
          .filter((x): x is { rowIndex: number; reason: string } => x != null);
        setFileParseErrors([
          ...parseErrors.map((e) => ({ rowIndex: e.row, reason: e.message })),
          ...emptyRowErrors,
        ]);
      } else {
        setFileParseErrors([]);
        setHeaders([]);
        setRawRows([]);
        setColumnMap({});
      }
      setParseProgress(100);
    };
    reader.readAsText(f, "UTF-8");
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && (f.name.endsWith(".csv") || f.name.endsWith(".txt") || f.type === "text/csv")) processFile(f);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDropzoneActive(false);
    const f = e.dataTransfer?.files?.[0];
    if (f && (f.name.endsWith(".csv") || f.name.endsWith(".txt") || f.type === "text/csv")) processFile(f);
  };

  const buildMappedRows = useCallback((): Record<string, unknown>[] => {
    const requiredKeys = ["country", "shipping_method", "unit_price"];
    return rawRows.map((row, i) => {
      const obj: Record<string, unknown> = { rowIndex: i + 2 };
      SYSTEM_FIELDS.filter((f) => f.key).forEach((f) => {
        const colIndex = Object.entries(columnMap).find(([, v]) => v === f.key)?.[0];
        if (colIndex !== undefined) {
          const val = row[Number(colIndex)]?.trim();
          if (f.key === "unit_price" || f.key === "min_weight" || f.key === "max_weight") {
            obj[f.key] = val === "" ? (f.key === "unit_price" ? undefined : 0) : Number(val);
          } else if (f.key === "delivery_days") {
            obj[f.key] = val ?? "";
          } else {
            obj[f.key] = val ?? "";
          }
        }
      });
      if (!obj.min_weight && obj.min_weight !== 0) obj.min_weight = 0;
      if (!obj.currency) obj.currency = "CNY";
      return obj;
    }).filter((r) => requiredKeys.every((k) => r[k] != null && String(r[k]).trim() !== ""));
  }, [rawRows, columnMap]);

  const handleDryRun = async () => {
    const rows = buildMappedRows();
    if (rows.length === 0) {
      alert("请先选择文件并完成表头映射，且至少有一行有效数据（国家、运输方式、单价必填）");
      return;
    }
    setParseProgress(0);
    setDryRunResult(null);
    const token = await getAccessToken();
    setParseProgress(30);
    try {
      const res = await fetch(`${window.location.origin}/api/admin/shipping-rates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ dry_run: true, rows }),
      });
      setParseProgress(100);
      const data = await res.json();
      if (res.ok && data.errors !== undefined) {
        setDryRunResult(data as DryRunResult);
      } else {
        alert(data.error ?? "预览失败");
      }
    } catch (e) {
      setParseProgress(100);
      alert("请求失败");
    }
  };

  const handleConfirmExecute = async () => {
    const rows = buildMappedRows();
    if (rows.length === 0) return;
    setConfirmLoading(true);
    const token = await getAccessToken();
    try {
      const fileBackup = file ? await file.text() : undefined;
      const res = await fetch(`${window.location.origin}/api/admin/shipping-rates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ dry_run: false, rows, file_backup: fileBackup }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const added = data.added ?? 0;
        const updated = data.updated ?? 0;
        setUploadSuccess(`已新增 ${added} 条，修改 ${updated} 条`);
        setDryRunResult(null);
        setFile(null);
        setRawRows([]);
        setHeaders([]);
        const serverErrors = data.dry_run_result?.errors ?? [];
        const allErrors = [...serverErrors, ...fileParseErrors];
        if (allErrors.length > 0) setErrorRowsModal(allErrors);
        setFileParseErrors([]);
        await fetchRates();
        setTab("list");
        toast.success(`已更新：新增 ${added} 条，修改 ${updated} 条`);
      } else {
        toast.error(data.error ?? "执行失败");
      }
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleAdjustPreview = async () => {
    const pct = Number(percentValue);
    if (Number.isNaN(pct) || pct === 0) {
      alert("请输入非零百分比，如 5 或 -2");
      return;
    }
    setAdjustLoading(true);
    setPercentPreview(null);
    const token = await getAccessToken();
    try {
      const body: { percent: number; dry_run: boolean; country?: string; shipping_method?: string } = {
        percent: pct,
        dry_run: true,
      };
      if (percentFilterCountry) body.country = percentFilterCountry;
      if (percentFilterMethod) body.shipping_method = percentFilterMethod;
      const res = await fetch(`${window.location.origin}/api/admin/shipping-rates/adjust`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.preview) {
        setPercentPreview({ count: data.count ?? 0, preview: data.preview ?? [] });
      } else {
        alert(data.error ?? "预览失败");
      }
    } finally {
      setAdjustLoading(false);
    }
  };

  const handleAdjustConfirm = async () => {
    const pct = Number(percentValue);
    if (Number.isNaN(pct) || pct === 0) return;
    setAdjustLoading(true);
    const token = await getAccessToken();
    try {
      const body: { percent: number; country?: string; shipping_method?: string } = { percent: pct };
      if (percentFilterCountry) body.country = percentFilterCountry;
      if (percentFilterMethod) body.shipping_method = percentFilterMethod;
      const res = await fetch(`${window.location.origin}/api/admin/shipping-rates/adjust`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`已调价 ${data.updated ?? 0} 条路线，涨跌幅 ${pct}%`);
        setPercentValue("");
        setPercentPreview(null);
      } else {
        alert(data.error ?? "调价失败");
      }
    } finally {
      setAdjustLoading(false);
    }
  };

  const handleExportCurrentRates = useCallback(async () => {
    const token = await getAccessToken();
    const res = await fetch(`${typeof window !== "undefined" ? window.location.origin : ""}/api/admin/shipping-rates`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      alert("获取运费表失败");
      return;
    }
    const data = await res.json();
    const list = Array.isArray(data) ? data : [];
    const rows = list.map(
      (r: { country: string; shipping_method: string; unit_price: number; min_weight: number; delivery_days?: string | null }) => [
        r.country,
        r.shipping_method,
        String(r.unit_price),
        String(r.min_weight ?? 0),
        r.delivery_days ?? "",
      ]
    );
    const csv = Papa.unparse({ fields: [...CSV_HEADERS], data: rows });
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "shipping_rates_export.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("已导出当前运费表");
  }, [getAccessToken, toast]);

  const handleSingleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const country = singleCountry.trim().toLowerCase();
    const shipping_method = singleMethod.trim();
    const unit_price = parseFloat(singleUnitPrice);
    const min_weight = parseFloat(singleMinWeight) || 0;
    const max_weight = singleMaxWeight.trim() === "" ? null : parseFloat(singleMaxWeight);
    const delivery_days = singleDeliveryDays.trim() || null;
    const currency = singleCurrency.trim() || "CNY";
    if (!country || !shipping_method) {
      toast.error("请填写国家和运输方式");
      return;
    }
    if (Number.isNaN(unit_price) || unit_price <= 0) {
      toast.error("请填写有效单价（正数）");
      return;
    }
    if (Number.isNaN(min_weight) || min_weight < 0) {
      toast.error("起运重不能为负数");
      return;
    }
    setSingleSaving(true);
    const token = await getAccessToken();
    try {
      const res = await fetch(`${window.location.origin}/api/admin/shipping-rates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          dry_run: false,
          rows: [
            {
              rowIndex: 1,
              country,
              shipping_method,
              unit_price,
              min_weight,
              max_weight: max_weight ?? "",
              currency,
              delivery_days,
            },
          ],
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchRates();
        setSingleCountry("");
        setSingleMethod("");
        setSingleUnitPrice("");
        setSingleMinWeight("0");
        setSingleMaxWeight("");
        setSingleDeliveryDays("");
        toast.success("已保存，试算页已更新");
      } else {
        toast.error(data.error ?? "保存失败");
      }
    } finally {
      setSingleSaving(false);
    }
  };

  return (
    <section className="mt-12">
      <h2 className="flex items-center gap-2 text-xl font-bold text-slate-800">
        <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
        全球运费管理
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        此处维护的数据与前台「运费试算」实时同步。支持单条录入、表格内改价、CSV 批量上传、全路线调价。
      </p>

      <div className="mt-3 flex gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setTab("list")}
          className={`border-b-2 px-3 py-2 text-sm font-medium ${tab === "list" ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-600 hover:text-slate-800"}`}
        >
          价格表
        </button>
        <button
          type="button"
          onClick={() => setTab("upload")}
          className={`border-b-2 px-3 py-2 text-sm font-medium ${tab === "upload" ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-600 hover:text-slate-800"}`}
        >
          CSV 上传
        </button>
        <button
          type="button"
          onClick={() => setTab("adjust")}
          className={`border-b-2 px-3 py-2 text-sm font-medium ${tab === "adjust" ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-600 hover:text-slate-800"}`}
        >
          全路线调价
        </button>
        <button
          type="button"
          onClick={() => setTab("logs")}
          className={`border-b-2 px-3 py-2 text-sm font-medium ${tab === "logs" ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-600 hover:text-slate-800"}`}
        >
          操作历史
        </button>
      </div>

      {tab === "list" && (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
            <h3 className="text-sm font-semibold text-slate-800">单条录入</h3>
            <p className="mt-1 text-xs text-slate-600">新增或覆盖同国家+渠道+起运重的路线，保存后试算页即时生效。</p>
            <form onSubmit={handleSingleSave} className="mt-3 flex flex-wrap items-end gap-3">
              <div className="min-w-[80px]">
                <label className="mb-1 block text-xs font-medium text-slate-700">国家</label>
                <input
                  type="text"
                  value={singleCountry}
                  onChange={(e) => setSingleCountry(e.target.value)}
                  placeholder="如 tw, th"
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-800"
                />
              </div>
              <div className="min-w-[100px]">
                <label className="mb-1 block text-xs font-medium text-slate-700">运输方式</label>
                <input
                  type="text"
                  value={singleMethod}
                  onChange={(e) => setSingleMethod(e.target.value)}
                  placeholder="如 空运特快"
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-800"
                />
              </div>
              <div className="min-w-[80px]">
                <label className="mb-1 block text-xs font-medium text-slate-700">单价(元/kg)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={singleUnitPrice}
                  onChange={(e) => setSingleUnitPrice(e.target.value)}
                  placeholder="25"
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-800"
                />
              </div>
              <div className="min-w-[70px]">
                <label className="mb-1 block text-xs font-medium text-slate-700">起运重(kg)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={singleMinWeight}
                  onChange={(e) => setSingleMinWeight(e.target.value)}
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-800"
                />
              </div>
              <div className="min-w-[80px]">
                <label className="mb-1 block text-xs font-medium text-slate-700">重量上限(kg)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={singleMaxWeight}
                  onChange={(e) => setSingleMaxWeight(e.target.value)}
                  placeholder="留空不限"
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-800"
                />
              </div>
              <div className="min-w-[80px]">
                <label className="mb-1 block text-xs font-medium text-slate-700">时效</label>
                <input
                  type="text"
                  value={singleDeliveryDays}
                  onChange={(e) => setSingleDeliveryDays(e.target.value)}
                  placeholder="3-5天"
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-800"
                />
              </div>
              <div className="min-w-[60px]">
                <label className="mb-1 block text-xs font-medium text-slate-700">币种</label>
                <input
                  type="text"
                  value={singleCurrency}
                  onChange={(e) => setSingleCurrency(e.target.value)}
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-800"
                />
              </div>
              <button
                type="submit"
                disabled={singleSaving}
                className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {singleSaving ? "保存中…" : "保存"}
              </button>
            </form>
          </div>
          <p className="text-sm text-slate-600">
            表格内：双击「价格」或「时效」可改并保存；国家/渠道/起运重需用下方 CSV 或单条录入。
          </p>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleExportCurrentRates}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
            >
              <Download className="h-4 w-4" />
              导出当前运费表
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            {ratesLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : rates.length === 0 ? (
              <div className="py-10 text-center text-slate-500">暂无运费数据</div>
            ) : (
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-3 py-3 font-medium text-slate-700">国家</th>
                    <th className="px-3 py-3 font-medium text-slate-700">渠道</th>
                    <th className="px-3 py-3 font-medium text-slate-700">价格(元/kg)</th>
                    <th className="px-3 py-3 font-medium text-slate-700">时效</th>
                    <th className="px-3 py-3 font-medium text-slate-700">起运重</th>
                    <th className="px-3 py-3 font-medium text-slate-700">重量上限</th>
                  </tr>
                </thead>
                <tbody>
                  {rates.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="px-3 py-2 text-slate-700">{r.country}</td>
                      <td className="px-3 py-2 text-slate-700">{r.shipping_method}</td>
                      <td className="px-3 py-2">
                        {editingCell?.id === r.id && editingCell?.field === "unit_price" ? (
                          <input
                            ref={editingCell.field === "unit_price" ? inputRef : undefined}
                            type="number"
                            step="0.01"
                            min="0"
                            value={editingCell.value}
                            onChange={(e) => setEditingCell((c) => (c ? { ...c, value: e.target.value } : null))}
                            onBlur={handleCellSave}
                            onKeyDown={(e) => { if (e.key === "Enter") handleCellSave(); }}
                            className="w-20 rounded border border-slate-300 px-2 py-1 text-slate-800"
                          />
                        ) : (
                          <span
                            className="cursor-pointer rounded px-1 py-0.5 hover:bg-slate-200"
                            onDoubleClick={() => setEditingCell({ id: r.id, field: "unit_price", value: String(r.unit_price) })}
                            title="双击编辑"
                          >
                            {savingCell === r.id ? <Loader2 className="inline h-4 w-4 animate-spin" /> : `¥${Number(r.unit_price).toFixed(2)}`}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {editingCell?.id === r.id && editingCell?.field === "delivery_days" ? (
                          <input
                            ref={editingCell.field === "delivery_days" ? inputRef : undefined}
                            type="text"
                            value={editingCell.value}
                            onChange={(e) => setEditingCell((c) => (c ? { ...c, value: e.target.value } : null))}
                            onBlur={handleCellSave}
                            onKeyDown={(e) => { if (e.key === "Enter") handleCellSave(); }}
                            placeholder="如 3-5天"
                            className="w-24 rounded border border-slate-300 px-2 py-1 text-slate-800"
                          />
                        ) : (
                          <span
                            className="cursor-pointer rounded px-1 py-0.5 hover:bg-slate-200"
                            onDoubleClick={() => setEditingCell({ id: r.id, field: "delivery_days", value: r.delivery_days ?? "" })}
                            title="双击编辑"
                          >
                            {savingCell === r.id ? <Loader2 className="inline h-4 w-4 animate-spin" /> : (r.delivery_days ?? "—")}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-600">{r.min_weight} kg</td>
                      <td className="px-3 py-2 text-slate-600">{r.max_weight != null ? `${r.max_weight} kg` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === "upload" && (
        <div className="mt-4 space-y-4">
          {uploadSuccess && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-green-800">
              <CheckCircle className="h-5 w-5 shrink-0" />
              {uploadSuccess}
            </div>
          )}

          {/* 拖拽上传区域 Dropzone */}
          <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-6">
            <label className="mb-2 block text-sm font-medium text-slate-700">上传 CSV</label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDropzoneActive(true); }}
              onDragLeave={() => setDropzoneActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed py-10 transition-colors ${dropzoneActive ? "border-emerald-500 bg-emerald-50" : "border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50"}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <Upload className="h-10 w-10 text-slate-400" />
              <p className="mt-2 text-sm text-slate-600">
                {dropzoneActive ? "松开以放入文件" : "拖拽或点击选择 CSV"}
              </p>
              <p className="mt-1 text-xs text-slate-500">首行为表头，支持列名：country, method, price_per_kg, min_weight, estimated_days</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={downloadBlankTemplate}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              下载空白模板
            </button>
            <button
              type="button"
              onClick={downloadExampleTemplate}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              下载示例
            </button>
            <button
              type="button"
              onClick={handleExportCurrentRates}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
            >
              <Download className="h-4 w-4" />
              导出当前运费表
            </button>
          </div>

          {parseProgress > 0 && parseProgress < 100 && (
            <div className="flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${parseProgress}%` }}
                />
              </div>
              <span className="text-sm text-slate-600">解析中…</span>
            </div>
          )}
          {headers.length > 0 && (
            <>
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <p className="mb-2 text-sm font-medium text-slate-700">表头映射</p>
                <div className="flex flex-wrap gap-3">
                  {headers.map((h, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">&quot;{h}&quot;</span>
                      <select
                        value={columnMap[i] ?? ""}
                        onChange={(e) => setColumnMap((m) => ({ ...m, [i]: e.target.value }))}
                        className="rounded border border-slate-300 py-1.5 pl-2 pr-8 text-sm text-slate-800"
                      >
                        {SYSTEM_FIELDS.map((f) => (
                          <option key={f.key || "none"} value={f.key}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDryRun}
                  disabled={parseProgress > 0 && parseProgress < 100}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Upload className="h-4 w-4" />
                  预览变更
                </button>
              </div>
            </>
          )}

          {dryRunResult && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-base font-semibold text-slate-800">变更预览</h3>
              <div className="mb-3 flex flex-wrap gap-3">
                <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">新增</span>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">改价</span>
                <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">错误</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-2 py-2 font-medium text-slate-700">状态</th>
                      <th className="px-2 py-2 font-medium text-slate-700">国家</th>
                      <th className="px-2 py-2 font-medium text-slate-700">方式</th>
                      <th className="px-2 py-2 font-medium text-slate-700">原单价</th>
                      <th className="px-2 py-2 font-medium text-slate-700">新单价</th>
                      <th className="px-2 py-2 font-medium text-slate-700">说明</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dryRunResult.toAdd.map((r, i) => (
                      <tr key={`add-${i}`} className="border-b border-slate-100 bg-green-50">
                        <td className="px-2 py-1.5 font-medium text-green-800">新增</td>
                        <td className="px-2 py-1.5">{r.country}</td>
                        <td className="px-2 py-1.5">{r.shipping_method}</td>
                        <td className="px-2 py-1.5 text-slate-400">—</td>
                        <td className="px-2 py-1.5 font-medium text-green-800">¥{r.unit_price}</td>
                        <td className="px-2 py-1.5 text-slate-500">—</td>
                      </tr>
                    ))}
                    {dryRunResult.toUpdate.map((u, i) => (
                      <tr key={`up-${i}`} className="border-b border-slate-100 bg-amber-50">
                        <td className="px-2 py-1.5 font-medium text-amber-800">价格变动</td>
                        <td className="px-2 py-1.5">{u.country}</td>
                        <td className="px-2 py-1.5">{u.shipping_method}</td>
                        <td className="px-2 py-1.5 text-slate-600">¥{u.old_unit_price}</td>
                        <td className="px-2 py-1.5 font-medium text-amber-800">¥{u.new_unit_price}</td>
                        <td className="px-2 py-1.5 text-slate-500">—</td>
                      </tr>
                    ))}
                    {[...dryRunResult.errors, ...dryRunResult.abnormal].map((e, i) => (
                      <tr key={`err-${i}`} className="border-b border-slate-100 bg-red-50">
                        <td className="px-2 py-1.5 font-medium text-red-800">错误</td>
                        <td className="px-2 py-1.5" colSpan={3}>第 {e.rowIndex} 行</td>
                        <td className="px-2 py-1.5" colSpan={2} title={e.reason}>{e.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {confirmLoading && (
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full w-full animate-pulse rounded-full bg-emerald-500" />
                </div>
              )}
              <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDryRunResult(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
                >
                  关闭
                </button>
                {dryRunResult.errors.length > 0 ? (
                  <span className="text-sm text-red-600">存在错误行，请修正 CSV 后重新上传</span>
                ) : (
                  <button
                    type="button"
                    disabled={confirmLoading}
                    onClick={handleConfirmExecute}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {confirmLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    确认执行
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "adjust" && (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-slate-600">按百分比批量调整单价，可限定国家或渠道。</p>
          <div className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">涨跌幅（%）</label>
              <input
                type="number"
                step="0.1"
                placeholder="如 5 或 -2"
                value={percentValue}
                onChange={(e) => setPercentValue(e.target.value)}
                className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">国家（可选）</label>
              <input
                type="text"
                placeholder="留空=全部"
                value={percentFilterCountry}
                onChange={(e) => setPercentFilterCountry(e.target.value)}
                className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">运输方式（可选）</label>
              <input
                type="text"
                placeholder="留空=全部"
                value={percentFilterMethod}
                onChange={(e) => setPercentFilterMethod(e.target.value)}
                className="w-36 rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
              />
            </div>
            <button
              type="button"
              onClick={handleAdjustPreview}
              disabled={adjustLoading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {adjustLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Percent className="h-4 w-4" />}
              预览
            </button>
          </div>
          {percentPreview && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="mb-2 text-sm font-medium text-slate-700">
                将调整 {percentPreview.count} 条路线，单价 × (1 + {percentValue}%)
              </p>
              <table className="w-full min-w-[360px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="py-1.5 pr-2">国家 / 方式</th>
                    <th className="py-1.5 pr-2">原价</th>
                    <th className="py-1.5 pr-2">新价</th>
                  </tr>
                </thead>
                <tbody>
                  {percentPreview.preview.slice(0, 15).map((p, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="py-1 pr-2">{p.country} / {p.shipping_method}</td>
                      <td className="py-1 pr-2 text-slate-600">¥{p.old_price}</td>
                      <td className="py-1 pr-2 font-medium text-amber-700">¥{p.new_price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPercentPreview(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  disabled={adjustLoading}
                  onClick={handleAdjustConfirm}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {adjustLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  确认调价
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "logs" && (
        <div className="mt-4 space-y-2">
          <p className="text-sm text-slate-600">最近批量上传与调价记录。</p>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          {logsLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-10 text-center text-slate-500">暂无操作记录</div>
          ) : (
            <table className="w-full min-w-[500px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-3 py-3 font-medium text-slate-700">时间</th>
                  <th className="px-3 py-3 font-medium text-slate-700">操作</th>
                  <th className="px-3 py-3 font-medium text-slate-700">涉及国家</th>
                  <th className="px-3 py-3 font-medium text-slate-700">摘要</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-3 py-2 text-slate-600">
                      {new Date(l.operated_at).toLocaleString("zh-CN")}
                    </td>
                    <td className="px-3 py-2">
                      {l.action === "bulk_upload" ? "CSV 批量上传" : "涨跌幅调价"}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {(l.countries ?? []).join(", ") || "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {typeof l.summary === "object" && l.summary !== null && "added" in l.summary
                        ? `新增 ${(l.summary as { added?: number }).added ?? 0}，修改 ${(l.summary as { updated?: number }).updated ?? 0}`
                        : typeof l.summary === "object" && l.summary !== null && "percent" in l.summary
                          ? `调价 ${(l.summary as { count?: number }).count ?? 0} 条，${(l.summary as { percent?: number }).percent}%`
                          : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          </div>
        </div>
      )}

      {/* 上传完成后错误行号弹窗 */}
      {errorRowsModal != null && errorRowsModal.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setErrorRowsModal(null)}>
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">部分行异常</h3>
              <button type="button" onClick={() => setErrorRowsModal(null)} className="rounded p-1 text-slate-500 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-600">以下行已跳过，其余已写入。</p>
            <ul className="mt-3 max-h-60 list-inside list-disc overflow-y-auto rounded bg-red-50 p-3 text-sm text-red-800">
              {errorRowsModal.map((e, i) => (
                <li key={i}>第 {e.rowIndex} 行：{e.reason}</li>
              ))}
            </ul>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setErrorRowsModal(null)}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                知道了
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
