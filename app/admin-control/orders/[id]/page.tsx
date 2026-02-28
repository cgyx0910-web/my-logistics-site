"use client";

import { useCallback, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { ArrowLeft, Loader2, CheckCircle, Copy } from "lucide-react";
import { useToast } from "@/app/context/ToastContext";

const PRESET_STATUSES = [
  "已收货",
  "运输中",
  "清关中",
  "派送中",
  "已签收",
  "包裹已到站",
  "财务已确认收款，仓库正在安排出库",
];

type Order = {
  id: string;
  tracking_number: string | null;
  status: string;
  shipping_fee: number;
  payment_proof_url: string | null;
  domestic_tracking_number: string | null;
  created_at: string;
  cargo_details?: string | null;
  sender_name?: string | null;
  sender_phone?: string | null;
  sender_address?: string | null;
  receiver_name?: string | null;
  receiver_phone?: string | null;
  receiver_address?: string | null;
  cancel_requested_by?: string | null;
};
type Log = { id: string; status_title: string; location: string | null; description: string | null; created_at: string };

export default function AdminOrderDetailPage() {
  const params = useParams();
  const { user, profile, getAccessToken } = useAuth();
  const { toast } = useToast();
  const id = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [settling, setSettling] = useState(false);

  const [statusTitle, setStatusTitle] = useState("");
  const [customStatus, setCustomStatus] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [orderStatus, setOrderStatus] = useState("");
  const [trackingNumberInput, setTrackingNumberInput] = useState("");
  const [savingTrackingNumber, setSavingTrackingNumber] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const fetchDetail = useCallback(async () => {
    const token = await getAccessToken();
    const res = await fetch(`/api/admin/orders/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      setOrder(null);
      setLogs([]);
      return;
    }
    const data = await res.json();
    setOrder(data.order);
    setLogs(data.logs ?? []);
    setTrackingNumberInput(data.order?.tracking_number ?? "");
  }, [id, getAccessToken]);

  const handleSaveTrackingNumber = async () => {
    const value = trackingNumberInput.trim() || null;
    setSavingTrackingNumber(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ tracking_number: value }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchDetail();
        toast.success(value ? "物流单号已保存" : "已清空物流单号");
      } else {
        toast.error(data.error ?? "保存失败");
      }
    } finally {
      setSavingTrackingNumber(false);
    }
  };

  const handleGenerateTrackingNumber = () => {
    const generated = "EX" + id.replace(/-/g, "").slice(0, 8).toUpperCase();
    setTrackingNumberInput(generated);
    toast.success("已生成单号，请点击「保存物流单号」");
  };

  useEffect(() => {
    if (!user || profile?.role !== "admin") return;
    setLoading(true);
    fetchDetail().finally(() => setLoading(false));
  }, [user, profile?.role, id, fetchDetail]);

  const handleSaveTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = (statusTitle === "自定义" ? customStatus : statusTitle).trim();
    if (!title) {
      alert("请选择或输入状态");
      return;
    }
    setSaving(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/admin/orders/${id}/tracking`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          status_title: title,
          location: location.trim() || undefined,
          description: description.trim() || undefined,
          order_status: orderStatus || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchDetail();
        setStatusTitle("");
        setCustomStatus("");
        setLocation("");
        setDescription("");
        setOrderStatus("");
      } else alert(data.error ?? "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmPayment = async () => {
    setConfirming(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/admin/orders/${id}/confirm-payment`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok) {
        await fetchDetail();
      } else alert(data.error ?? "操作失败");
    } finally {
      setConfirming(false);
    }
  };

  const handleSettle = async () => {
    setSettling(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/admin/orders/${id}/settle`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok) await fetchDetail();
      else alert(data.error ?? "结算失败");
    } finally {
      setSettling(false);
    }
  };

  const handleConfirmCancel = async () => {
    setCancelLoading(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/admin/orders/${id}/confirm-cancel`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok) {
        await fetchDetail();
        toast.success(data.message ?? "订单已取消");
      } else {
        toast.error(data.error ?? "操作失败");
      }
    } finally {
      setCancelLoading(false);
    }
  };

  const handleRejectCancel = async () => {
    setCancelLoading(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/admin/orders/${id}/reject-cancel`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok) {
        await fetchDetail();
        toast.success(data.message ?? "已不同意取消");
      } else {
        toast.error(data.error ?? "操作失败");
      }
    } finally {
      setCancelLoading(false);
    }
  };

  const handleRequestCancel = async () => {
    setCancelLoading(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/admin/orders/${id}/request-cancel`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok) {
        await fetchDetail();
        toast.success(data.message ?? "已申请取消");
      } else {
        toast.error(data.error ?? "操作失败");
      }
    } finally {
      setCancelLoading(false);
    }
  };

  if (loading || !order) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href="/admin-control"
        className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        返回订单列表
      </Link>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800">订单信息</h2>
        <p className="mt-2 text-sm text-slate-600">
          订单号：<span className="font-mono text-slate-500">{order.id}</span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(order.id).then(
                () => toast.success("已复制订单号"),
                () => toast.error("复制失败")
              );
            }}
            className="ml-2 inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50"
          >
            <Copy className="h-3.5 w-3.5" /> 复制
          </button>
        </p>
        <p className="mt-1 text-sm text-slate-600">
          状态：{order.status} · 运费：¥{Number(order.shipping_fee).toFixed(2)}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="text-sm font-medium text-slate-700">物流单号（用于首页查询）：</label>
          <input
            type="text"
            value={trackingNumberInput}
            onChange={(e) => setTrackingNumberInput(e.target.value)}
            placeholder="可自动生成或手动填写"
            className="min-w-[180px] rounded-lg border border-slate-300 px-3 py-1.5 font-mono text-sm"
          />
          <button
            type="button"
            onClick={handleGenerateTrackingNumber}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            自动生成
          </button>
          <button
            type="button"
            onClick={handleSaveTrackingNumber}
            disabled={savingTrackingNumber}
            className="rounded-lg bg-[#2563eb] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#1d4ed8] disabled:opacity-60"
          >
            {savingTrackingNumber ? "保存中…" : "保存物流单号"}
          </button>
        </div>
        {order.domestic_tracking_number && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-600">国内物流单号：</span>
            <span className="font-mono text-slate-800">{order.domestic_tracking_number}</span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(order.domestic_tracking_number ?? "").then(
                  () => toast.success("已复制单号"),
                  () => toast.error("复制失败")
                );
              }}
              className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              <Copy className="h-3.5 w-3.5" />
              一键复制
            </button>
          </div>
        )}
        {order.cargo_details && (
          <p className="mt-2 text-sm text-slate-600">
            货物品名：<span className="font-medium text-slate-800">{order.cargo_details}</span>
          </p>
        )}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
            <h3 className="text-sm font-semibold text-slate-700">寄件人</h3>
            <p className="mt-1 text-sm text-slate-600">
              姓名：{order.sender_name || "—"} · 电话：{order.sender_phone || "—"}
            </p>
            {order.sender_address && (
              <p className="mt-1 text-sm text-slate-600">地址：{order.sender_address}</p>
            )}
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
            <h3 className="text-sm font-semibold text-slate-700">收件人</h3>
            <p className="mt-1 text-sm text-slate-600">
              姓名：{order.receiver_name || "—"} · 电话：{order.receiver_phone || "—"}
            </p>
            {order.receiver_address && (
              <p className="mt-1 text-sm text-slate-600">地址：{order.receiver_address}</p>
            )}
          </div>
        </div>
        <button
          type="button"
          disabled={order.status === "已完成" || order.status === "已取消" || settling}
          onClick={handleSettle}
          title={order.status === "已完成" ? "已结算，不可重复操作" : order.status === "已取消" ? "订单已取消" : "完成订单并发放积分（实付金额 1:1）"}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {settling ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {order.status === "已完成" ? "已结算" : "确认结算"}
        </button>

        {order.status === "待确认" && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/50 p-4">
            <h3 className="text-sm font-semibold text-slate-800">订单取消（仅待确认时可申请取消，需双方同意后生效）</h3>
            {order.cancel_requested_by === "customer" && (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <p className="text-sm font-medium text-amber-800">客户已申请取消</p>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  disabled={cancelLoading}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
                >
                  {cancelLoading ? "处理中…" : "同意"}
                </button>
                <button
                  type="button"
                  onClick={handleRejectCancel}
                  disabled={cancelLoading}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  不同意
                </button>
              </div>
            )}
            {order.cancel_requested_by === "admin" && (
              <p className="mt-2 text-sm text-slate-600">管理员已申请取消，待客户在订单详情页同意后生效</p>
            )}
            {!order.cancel_requested_by && (
              <button
                type="button"
                onClick={handleRequestCancel}
                disabled={cancelLoading}
                className="mt-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {cancelLoading ? "提交中…" : "申请取消（需客户同意）"}
              </button>
            )}
          </div>
        )}

        {order.payment_proof_url && (
          <div className="mt-4 border-t border-slate-200 pt-4">
            <h3 className="text-sm font-semibold text-slate-700">支付凭证图片</h3>
            <a
              href={order.payment_proof_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block"
            >
              <img
                src={order.payment_proof_url}
                alt="支付凭证"
                className="max-h-48 rounded-lg border border-slate-200 object-contain"
              />
            </a>
            <button
              type="button"
              onClick={handleConfirmPayment}
              disabled={confirming}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
            >
              <CheckCircle className="h-4 w-4" />
              {confirming ? "处理中…" : "确认收款"}
            </button>
          </div>
        )}
      </div>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800">添加轨迹</h2>
        <form onSubmit={handleSaveTracking} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">状态</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setStatusTitle(s); setCustomStatus(""); }}
                  className={`rounded-lg border px-3 py-1.5 text-sm ${statusTitle === s ? "border-[#2563eb] bg-[#2563eb] text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
                >
                  {s}
                </button>
              ))}
              <button
                type="button"
                onClick={() => { setStatusTitle("自定义"); }}
                className={`rounded-lg border px-3 py-1.5 text-sm ${statusTitle === "自定义" ? "border-[#2563eb] bg-[#2563eb] text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
              >
                自定义
              </button>
            </div>
            {statusTitle === "自定义" && (
              <input
                type="text"
                value={customStatus}
                onChange={(e) => setCustomStatus(e.target.value)}
                placeholder="输入自定义状态"
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2"
              />
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">当前位置</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="如：广州白云中转场"
              className="w-full rounded-lg border border-slate-300 px-4 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">详情描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="详细说明"
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-4 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">同步订单主状态（选填）</label>
            <select
              value={orderStatus}
              onChange={(e) => setOrderStatus(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2"
            >
              <option value="">不修改</option>
              <option value="待确认">待确认</option>
              <option value="待付款">待付款</option>
              <option value="待支付运费">待支付运费</option>
              <option value="已支付">已支付</option>
              <option value="待出库">待出库</option>
              <option value="已入库">已入库</option>
              <option value="运输中">运输中</option>
              <option value="已完成">已完成</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[#2563eb] px-5 py-2.5 font-medium text-white hover:bg-[#1d4ed8] disabled:opacity-60"
          >
            {saving ? "保存中…" : "保存并更新"}
          </button>
        </form>
      </div>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800">已有轨迹</h2>
        {logs.length === 0 ? (
          <p className="mt-4 text-slate-500">暂无轨迹记录</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {logs.map((log) => (
              <li key={log.id} className="border-l-2 border-slate-200 pl-4">
                <p className="font-medium text-slate-800">{log.status_title}</p>
                {log.location && <p className="text-sm text-slate-600">{log.location}</p>}
                {log.description && <p className="text-sm text-slate-500">{log.description}</p>}
                <p className="text-xs text-slate-400">{new Date(log.created_at).toLocaleString("zh-CN")}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
