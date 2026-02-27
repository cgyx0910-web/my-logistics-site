"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { ArrowLeft, Loader2, MessageCircle, ChevronRight, Upload, FileCheck, Truck } from "lucide-react";
import { useToast } from "@/app/context/ToastContext";
import { getOrderLabel } from "@/lib/contact";
import ContactChannelSelector from "@/app/components/ContactChannelSelector";

type Order = {
  id: string;
  tracking_number: string | null;
  status: string;
  shipping_fee?: number;
  fixed_shipping_fee?: number | null;
  payment_proof_url: string | null;
  domestic_tracking_number: string | null;
  cargo_details: string | null;
  sender_name: string | null;
  sender_phone: string | null;
  sender_address: string | null;
  receiver_name: string | null;
  receiver_phone: string | null;
  receiver_address: string | null;
  order_type?: string;
  product_summary?: { name: string; image_url: string | null } | null;
};
type Log = {
  id: string;
  status_title: string;
  location: string | null;
  description: string | null;
  created_at: string;
};

const STEPS_LOGISTICS = [
  "联系客服确认",
  "寄送到集运仓",
  "上传支付凭证",
  "等待收货",
] as const;

const STEPS_TREASURE = [
  "获得商品",
  "支付预设运费",
  "等待收货",
] as const;

export default function DashboardOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, getAccessToken } = useAuth();
  const { toast } = useToast();
  const id = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactSelectorOpen, setContactSelectorOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingDomestic, setSavingDomestic] = useState(false);
  const [savingReceiver, setSavingReceiver] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofModalUrl, setProofModalUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [domestic_tracking_number, setDomesticTrackingNumber] = useState("");
  const [cargo_details, setCargoDetails] = useState("");
  const [sender_name, setSenderName] = useState("");
  const [sender_phone, setSenderPhone] = useState("");
  const [sender_address, setSenderAddress] = useState("");
  const [receiver_name, setReceiverName] = useState("");
  const [receiver_phone, setReceiverPhone] = useState("");
  const [receiver_address, setReceiverAddress] = useState("");

  const fetchDetail = useCallback(async () => {
    const token = await getAccessToken();
    const res = await fetch(`/api/orders/${id}/tracking`, {
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
    setDomesticTrackingNumber(data.order?.domestic_tracking_number ?? "");
    setCargoDetails(data.order?.cargo_details ?? "");
    setSenderName(data.order?.sender_name ?? "");
    setSenderPhone(data.order?.sender_phone ?? "");
    setSenderAddress(data.order?.sender_address ?? "");
    setReceiverName(data.order?.receiver_name ?? "");
    setReceiverPhone(data.order?.receiver_phone ?? "");
    setReceiverAddress(data.order?.receiver_address ?? "");
  }, [id, getAccessToken]);

  useEffect(() => {
    if (!user) {
      router.replace("/");
      return;
    }
    setLoading(true);
    fetchDetail().finally(() => setLoading(false));
  }, [user, router, id, fetchDetail]);

  const handleSubmitWaybill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || order.status !== "待确认") return;
    setSubmitting(true);
    setSuccessMessage(false);
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          cargo_details: cargo_details.trim() || "",
          sender_name: sender_name.trim() || "",
          sender_phone: sender_phone.trim() || "",
          sender_address: sender_address.trim() || "",
          receiver_name: receiver_name.trim() || "",
          receiver_phone: receiver_phone.trim() || "",
          receiver_address: receiver_address.trim() || "",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchDetail();
        setSuccessMessage(true);
      } else {
        alert(data.error ?? "提交失败");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDomesticTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = domestic_tracking_number.trim();
    setSavingDomestic(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ domestic_tracking_number: value }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchDetail();
        toast.success(value ? "国内单号已保存" : "已清空国内单号");
      } else {
        toast.error(data.error ?? "保存失败");
      }
    } finally {
      setSavingDomestic(false);
    }
  };

  const handleSaveReceiver = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingReceiver(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          receiver_name: receiver_name.trim() || "",
          receiver_phone: receiver_phone.trim() || "",
          receiver_address: receiver_address.trim() || "",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchDetail();
        toast.success("收货人信息已保存");
      } else {
        toast.error(data.error ?? "保存失败");
      }
    } finally {
      setSavingReceiver(false);
    }
  };

  const handleUploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type) || file.size > 5 * 1024 * 1024) {
      toast.error("请选择 5MB 以内的 JPG/PNG/WebP/GIF 图片");
      e.target.value = "";
      return;
    }
    setUploadingProof(true);
    try {
      const token = await getAccessToken();
      const formData = new FormData();
      formData.set("file", file);
      const res = await fetch(`/api/orders/${id}/payment-proof`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        if (data.url && order) {
          setOrder((prev) => (prev ? { ...prev, payment_proof_url: data.url } : null));
        }
        await fetchDetail();
        toast.success("支付凭证上传成功");
      } else {
        toast.error(data.error ?? "上传失败");
      }
    } catch {
      toast.error("上传失败，请重试");
    } finally {
      setUploadingProof(false);
      e.target.value = "";
    }
  };

  if (loading || !order) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const contactContext = { orderId: order.id, trackingNumber: order.tracking_number };
  const isTreasure = order.order_type === "treasure";
  const steps = isTreasure ? STEPS_TREASURE : STEPS_LOGISTICS;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        返回个人中心
      </Link>

      <div className="mt-6 rounded-xl border-2 border-[#2563eb]/20 bg-[#eff6ff] p-5">
        {isTreasure && (
          <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
            淘货订单：平台发货，无需寄送集运仓，支付预设运费后等待出库即可。
          </p>
        )}
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#1e40af]">
          后续步骤指引
        </h3>
        <ol className="mt-3 space-y-2">
          {steps.map((step, i) => (
            <li key={step} className="flex items-center gap-2 text-slate-700">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2563eb] text-xs font-bold text-white">
                {i + 1}
              </span>
              {step}
              {i < steps.length - 1 && (
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              )}
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={() => setContactSelectorOpen(true)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#2563eb] px-4 py-3 font-medium text-white hover:bg-[#1d4ed8]"
        >
          <MessageCircle className="h-5 w-5" />
          联系客服（咨询订单 {getOrderLabel(contactContext)}）
        </button>
        <ContactChannelSelector
          open={contactSelectorOpen}
          onClose={() => setContactSelectorOpen(false)}
          contactContext={contactContext}
        />

        {/* 第 2 步：寄送到集运仓（仅普通集运订单显示，淘货跳过） */}
        {!isTreasure && (
          <div className="mt-6 rounded-lg border border-[#2563eb]/30 bg-white p-4">
            <div className="flex items-center gap-2 text-slate-700">
              <Truck className="h-5 w-5 text-[#2563eb]" />
              <span className="font-medium">
                {order.domestic_tracking_number ? "已录入单号" : "寄送到集运仓"}
              </span>
            </div>
            <form onSubmit={handleSaveDomesticTracking} className="mt-3 flex gap-2">
              <input
                type="text"
                value={domestic_tracking_number}
                onChange={(e) => setDomesticTrackingNumber(e.target.value)}
                placeholder="录入发往仓库的国内快递单号"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
              />
              <button
                type="submit"
                disabled={savingDomestic}
                className="rounded-lg bg-[#2563eb] px-4 py-2 font-medium text-white hover:bg-[#1d4ed8] disabled:opacity-60"
              >
                {savingDomestic ? "保存中…" : "保存"}
              </button>
            </form>
          </div>
        )}

        {/* 上传支付凭证（淘货为「支付预设运费」） */}
        <div className="mt-4 rounded-lg border border-[#2563eb]/30 bg-white p-4">
          <div className="flex items-center gap-2 text-slate-700">
            <FileCheck className="h-5 w-5 text-[#2563eb]" />
            <span className="font-medium">
              {isTreasure ? "支付预设运费" : "上传支付凭证"}
              {isTreasure && (order.fixed_shipping_fee != null || order.shipping_fee != null) && (
                <span className="ml-2 text-amber-700">¥{Number(order.fixed_shipping_fee ?? order.shipping_fee).toFixed(2)}</span>
              )}
            </span>
          </div>
          <div className="mt-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleUploadProof}
            />
            {order.payment_proof_url ? (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded border border-slate-200 bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      key={order.payment_proof_url}
                      src={order.payment_proof_url}
                      alt="支付凭证"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => setProofModalUrl(order.payment_proof_url)}
                      className="inline-flex items-center gap-2 rounded-lg border border-[#2563eb]/50 bg-[#eff6ff] px-3 py-1.5 text-sm font-medium text-[#1e40af] hover:bg-[#dbeafe]"
                    >
                      已上传，查看凭证
                    </button>
                    <a
                      href={order.payment_proof_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-slate-500 hover:text-slate-700"
                    >
                      新窗口打开
                    </a>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingProof}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                >
                  {uploadingProof ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  重新上传
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={uploadingProof}
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50/50 px-4 py-4 font-medium text-slate-600 hover:border-[#2563eb]/50 hover:bg-[#eff6ff] hover:text-[#1e40af] disabled:opacity-60"
              >
                {uploadingProof ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    上传中…
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5" />
                    选择图片上传支付凭证
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800">物流详情</h2>
        <p className="mt-2 text-sm text-slate-600">
          {isTreasure && <span className="mr-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">淘货</span>}
          单号：<span className="font-mono">{order.tracking_number || "待分配"}</span> · 状态：
          {order.status}
          {(order.fixed_shipping_fee != null || order.shipping_fee != null) && (
            <> · 运费：¥{Number(order.fixed_shipping_fee ?? order.shipping_fee).toFixed(2)}</>
          )}
        </p>
        {isTreasure && (order.receiver_name || order.receiver_phone || order.receiver_address) && (
          <div className="mt-5 space-y-4 border-t border-slate-200 pt-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">收件人信息</h3>
              <div className="mt-1 space-y-0.5 text-slate-800">
                {order.receiver_name && <p><span className="text-slate-500">姓名：</span>{order.receiver_name}</p>}
                {order.receiver_phone && <p><span className="text-slate-500">联系方式：</span>{order.receiver_phone}</p>}
                {order.receiver_address && <p><span className="text-slate-500">地址：</span><span className="whitespace-pre-wrap">{order.receiver_address}</span></p>}
              </div>
            </div>
          </div>
        )}
        {!isTreasure && (order.cargo_details || order.sender_name || order.sender_phone || order.sender_address || order.receiver_name || order.receiver_phone || order.receiver_address) && (
          <div className="mt-5 space-y-4 border-t border-slate-200 pt-5">
            {order.cargo_details && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700">货物品名</h3>
                <p className="mt-1 text-slate-800">{order.cargo_details}</p>
              </div>
            )}
            {(order.sender_name || order.sender_phone || order.sender_address) && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700">寄件人</h3>
                <div className="mt-1 space-y-0.5 text-slate-800">
                  {order.sender_name && <p>{order.sender_name}</p>}
                  {order.sender_phone && <p>{order.sender_phone}</p>}
                  {order.sender_address && <p className="whitespace-pre-wrap">{order.sender_address}</p>}
                </div>
              </div>
            )}
            {(order.receiver_name || order.receiver_phone || order.receiver_address) && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700">收件人</h3>
                <div className="mt-1 space-y-0.5 text-slate-800">
                  {order.receiver_name && <p>{order.receiver_name}</p>}
                  {order.receiver_phone && <p>{order.receiver_phone}</p>}
                  {order.receiver_address && <p className="whitespace-pre-wrap">{order.receiver_address}</p>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {isTreasure && order.product_summary && (
        <div className="mt-6 rounded-xl border border-amber-200/60 bg-amber-50/50 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800">商品信息</h2>
          <p className="mt-1 text-sm text-slate-600">本订单兑换的商品</p>
          <div className="mt-4 flex items-center gap-4 rounded-lg border border-amber-200/60 bg-white p-4">
            {order.product_summary.image_url ? (
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={order.product_summary.image_url}
                  alt={order.product_summary.name}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-2xl text-slate-300">
                📦
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-800">{order.product_summary.name}</p>
              {order.cargo_details && (
                <p className="mt-1 text-sm text-slate-600">{order.cargo_details}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {isTreasure && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800">收货人信息</h2>
          <p className="mt-1 text-sm text-slate-600">
            请填写收货人姓名、电话与地址，便于平台安排发货。
          </p>
          <form onSubmit={handleSaveReceiver} className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">收货人姓名</label>
              <input
                type="text"
                value={receiver_name}
                onChange={(e) => setReceiverName(e.target.value)}
                placeholder="请输入收货人姓名"
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">收货人电话</label>
              <input
                type="text"
                value={receiver_phone}
                onChange={(e) => setReceiverPhone(e.target.value)}
                placeholder="请输入收货人电话"
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">收货地址</label>
              <textarea
                value={receiver_address}
                onChange={(e) => setReceiverAddress(e.target.value)}
                rows={3}
                placeholder="省/市/区、街道、门牌号等"
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-800"
              />
            </div>
            <button
              type="submit"
              disabled={savingReceiver}
              className="w-full rounded-lg bg-[#2563eb] py-3 font-medium text-white hover:bg-[#1d4ed8] disabled:opacity-60"
            >
              {savingReceiver ? "保存中…" : "保存收货人信息"}
            </button>
          </form>
        </div>
      )}

      {order.status === "待确认" && !isTreasure && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800">补全物流信息</h2>
          <p className="mt-1 text-sm text-slate-600">
            请填写货物品名及收寄双方信息，便于客服核对并安排入库。
          </p>
          {successMessage && (
            <p className="mt-3 rounded-lg bg-green-50 p-3 text-sm font-medium text-green-800">
              信息已更新，客服将尽快核对并为您安排入库。
            </p>
          )}
          <form onSubmit={handleSubmitWaybill} className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">货物品名</label>
              <input
                type="text"
                value={cargo_details}
                onChange={(e) => setCargoDetails(e.target.value)}
                placeholder="例如：衣服、零食、非液态化妆品等"
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-800"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-1">
              <h3 className="text-sm font-semibold text-slate-700">寄件人</h3>
              <div className="space-y-3 sm:col-span-2">
                <div>
                  <label className="mb-1 block text-sm text-slate-600">姓名</label>
                  <input
                    type="text"
                    value={sender_name}
                    onChange={(e) => setSenderName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-600">电话</label>
                  <input
                    type="text"
                    value={sender_phone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-600">地址</label>
                  <textarea
                    value={sender_address}
                    onChange={(e) => setSenderAddress(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2"
                  />
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-1">
              <h3 className="text-sm font-semibold text-slate-700">收件人</h3>
              <div className="space-y-3 sm:col-span-2">
                <div>
                  <label className="mb-1 block text-sm text-slate-600">姓名</label>
                  <input
                    type="text"
                    value={receiver_name}
                    onChange={(e) => setReceiverName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-600">电话</label>
                  <input
                    type="text"
                    value={receiver_phone}
                    onChange={(e) => setReceiverPhone(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-600">地址</label>
                  <textarea
                    value={receiver_address}
                    onChange={(e) => setReceiverAddress(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2"
                  />
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-[#2563eb] py-3 font-medium text-white hover:bg-[#1d4ed8] disabled:opacity-60"
            >
              {submitting ? "提交中…" : "保存并提交"}
            </button>
          </form>
        </div>
      )}

      <div className="mt-8">
        <h3 className="text-sm font-medium uppercase tracking-wide text-slate-500">物流时间轴</h3>
        {logs.length === 0 ? (
          <p className="mt-6 text-slate-500">暂无物流轨迹</p>
        ) : (
          <ul className="mt-6 space-y-0">
            {logs.map((log, index) => (
              <li key={log.id} className="relative flex gap-4 pb-8 last:pb-0">
                {index < logs.length - 1 && (
                  <span
                    className="absolute left-[11px] top-6 h-full w-0.5 bg-slate-200"
                    aria-hidden
                  />
                )}
                <span
                  className={`relative z-10 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${index === 0 ? "bg-[#2563eb] ring-4 ring-[#2563eb]/20" : "bg-slate-300"}`}
                  aria-hidden
                />
                <div
                  className={`flex-1 rounded-lg border p-4 ${index === 0 ? "border-[#2563eb]/30 bg-[#eff6ff]" : "border-slate-200 bg-slate-50/80"}`}
                >
                  <p className={`font-medium ${index === 0 ? "text-[#1e40af]" : "text-slate-600"}`}>
                    {log.status_title}
                  </p>
                  {log.location && <p className="mt-1 text-sm text-slate-600">{log.location}</p>}
                  {log.description && (
                    <p className="mt-1 text-sm text-slate-500">{log.description}</p>
                  )}
                  <p
                    className={`mt-2 text-xs ${index === 0 ? "text-[#2563eb]" : "text-slate-400"}`}
                  >
                    {new Date(log.created_at).toLocaleString("zh-CN")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 查看凭证弹窗 */}
      {proofModalUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setProofModalUrl(null)}
          role="dialog"
          aria-modal="true"
          aria-label="支付凭证大图"
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-slate-600 hover:bg-white"
            onClick={() => setProofModalUrl(null)}
            aria-label="关闭"
          >
            <span className="text-xl leading-none">×</span>
          </button>
          <img
            src={proofModalUrl}
            alt="支付凭证"
            className="max-h-[90vh] max-w-full rounded-lg object-contain shadow-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
