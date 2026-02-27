"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import imageCompression from "browser-image-compression";
import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";
import {
  Search,
  Package,
  Loader2,
  CheckCircle,
  MapPin,
  X,
  Gavel,
  Plus,
  Pencil,
  Truck,
  Upload,
} from "lucide-react";
import ShippingRatesAdmin from "./ShippingRatesAdmin";
import HomepageRemote from "./HomepageRemote";
import TreasurePublishCenter from "./TreasurePublishCenter";
import LogisticsStoriesAdmin from "./LogisticsStoriesAdmin";
import AboutPageRemote from "./AboutPageRemote";

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const TARGET_SIZE_MB = 0.8; // 压缩目标约 800KB

const STATUS_OPTIONS = [
  "",
  "待确认",
  "待付款",
  "待支付运费",
  "已支付",
  "待出库",
  "已入库",
  "运输中",
  "已完成",
];

const STATUS_TAG_CLASS: Record<string, string> = {
  待确认: "bg-amber-100 text-amber-800 border-amber-200",
  待付款: "bg-orange-100 text-orange-800 border-orange-200",
  待支付运费: "bg-orange-100 text-orange-800 border-orange-200",
  已支付: "bg-blue-100 text-blue-800 border-blue-200",
  待出库: "bg-violet-100 text-violet-800 border-violet-200",
  已入库: "bg-sky-100 text-sky-800 border-sky-200",
  运输中: "bg-indigo-100 text-indigo-800 border-indigo-200",
  已完成: "bg-green-100 text-green-800 border-green-200",
};

type OrderRow = {
  id: string;
  user_id: string;
  user_email: string;
  tracking_number: string | null;
  status: string;
  shipping_fee: number;
  payment_proof_url: string | null;
  created_at: string;
  cargo_details: string | null;
  order_type?: string;
};

export default function AdminControlPage() {
  const { user, profile, getAccessToken } = useAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [cargoFilter, setCargoFilter] = useState("");
  const [submitted, setSubmitted] = useState({ tracking: "", status: "", email: "", cargo: "" });

  const [proofModal, setProofModal] = useState<string | null>(null);
  const [progressModal, setProgressModal] = useState<OrderRow | null>(null);
  const [progressLocation, setProgressLocation] = useState("");
  const [progressDesc, setProgressDesc] = useState("");
  const [progressSaving, setProgressSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  type AuctionProduct = {
    id: string;
    name: string;
    description: string | null;
    image_url: string | null;
    points_required: number;
    direct_buy_points: number | null;
    shipping_fee: number | null;
    fixed_shipping_fee: number | null;
    stock: number;
    tag: string | null;
    button_text: string | null;
    sort_order: number;
    is_auction: boolean;
    end_time: string | null;
    settled_at: string | null;
  };
  const [auctionProducts, setAuctionProducts] = useState<AuctionProduct[]>([]);
  const [auctionLoading, setAuctionLoading] = useState(false);
  const [auctionSettleLoading, setAuctionSettleLoading] = useState<string | null>(null);
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [productFormSaving, setProductFormSaving] = useState(false);
  const [editProduct, setEditProduct] = useState<AuctionProduct | null>(null);
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const productImageInputRef = useRef<HTMLInputElement>(null);
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    image_url: "",
    points_required: 0,
    direct_buy_points: "" as number | "",
    fixed_shipping_fee: "" as number | "",
    stock: 0,
    tag: "",
    button_text: "",
    sort_order: 0,
    is_auction: false,
    end_time: "",
  });

  const fetchOrders = useCallback(async () => {
    const token = await getAccessToken();
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const params = new URLSearchParams();
    if (submitted.tracking) params.set("tracking", submitted.tracking);
    if (submitted.status) params.set("status", submitted.status);
    if (submitted.email) params.set("email", submitted.email);
    if (submitted.cargo) params.set("cargo", submitted.cargo);
    const url = `${base}/api/admin/orders?${params.toString()}`;
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const data = await res.json();
      setOrders(data);
    } else setOrders([]);
  }, [getAccessToken, submitted]);

  useEffect(() => {
    if (!user || profile?.role !== "admin") return;
    setLoading(true);
    fetchOrders().finally(() => setLoading(false));
  }, [user, profile?.role, fetchOrders]);

  const fetchAuctionProducts = useCallback(async () => {
    const res = await fetch("/api/auction-products");
    if (res.ok) {
      const data = await res.json();
      setAuctionProducts(Array.isArray(data) ? data : []);
    } else setAuctionProducts([]);
  }, []);

  useEffect(() => {
    if (!user || profile?.role !== "admin") return;
    setAuctionLoading(true);
    fetchAuctionProducts().finally(() => setAuctionLoading(false));
  }, [user, profile?.role, fetchAuctionProducts]);

  const handleSettleAuction = async (productId: string) => {
    setAuctionSettleLoading(productId);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${window.location.origin}/api/admin/auction/settle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ product_id: productId }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`结拍成功，已为中标用户生成订单：${data.order_id ?? ""}`);
        await fetchAuctionProducts();
      } else {
        alert(data.error ?? "结拍失败");
      }
    } finally {
      setAuctionSettleLoading(null);
    }
  };

  const resetProductForm = () => {
    setProductForm({
      name: "",
      description: "",
      image_url: "",
      points_required: 0,
      direct_buy_points: "",
      fixed_shipping_fee: "",
      stock: 0,
      tag: "",
      button_text: "",
      sort_order: 0,
      is_auction: false,
      end_time: "",
    });
    setProductImageFile(null);
    setProductImagePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (productImageInputRef.current) productImageInputRef.current.value = "";
    setEditProduct(null);
    setProductFormOpen(false);
  };

  const openEditProduct = (p: AuctionProduct) => {
    setEditProduct(p);
    setProductImageFile(null);
    setProductImagePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (productImageInputRef.current) productImageInputRef.current.value = "";
    setProductForm({
      name: p.name,
      description: p.description ?? "",
      image_url: p.image_url ?? "",
      points_required: p.points_required,
      direct_buy_points: p.direct_buy_points ?? "",
      fixed_shipping_fee: p.fixed_shipping_fee ?? p.shipping_fee ?? "",
      stock: p.stock,
      tag: p.tag ?? "",
      button_text: p.button_text ?? "",
      sort_order: p.sort_order,
      is_auction: p.is_auction,
      end_time: p.end_time ? p.end_time.slice(0, 16) : "",
    });
  };

  const [productImagePreviewUrl, setProductImagePreviewUrl] = useState<string | null>(null);

  const handleProductImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      alert("文件太大，请压缩后再传");
      e.target.value = "";
      return;
    }
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      alert("请选择 JPG、PNG、WebP 或 GIF 图片");
      e.target.value = "";
      return;
    }
    if (productImagePreviewUrl) URL.revokeObjectURL(productImagePreviewUrl);
    setProductImagePreviewUrl(URL.createObjectURL(file));
    setProductImageFile(file);
  };

  useEffect(() => {
    return () => {
      if (productImagePreviewUrl) URL.revokeObjectURL(productImagePreviewUrl);
    };
  }, [productImagePreviewUrl]);

  const compressAndUploadImage = async (file: File): Promise<{ url: string | null; error?: string }> => {
    const token = await getAccessToken();
    const options = {
      maxSizeMB: TARGET_SIZE_MB,
      useWebWorker: true,
      fileType: "image/webp" as const,
    };
    try {
      const compressed = await imageCompression(file, options);
      const formData = new FormData();
      formData.set("file", compressed);
      const res = await fetch(`${window.location.origin}/api/admin/upload-image`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const raw = await res.text();
      let data: { url?: string; error?: string } = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        return { url: null, error: `响应异常 ${res.status}` };
      }
      if (res.ok && data.url) return { url: data.url };
      return { url: null, error: data.error ?? `上传失败 ${res.status}` };
    } catch (e) {
      return { url: null, error: e instanceof Error ? e.message : "压缩或上传失败" };
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setProductFormSaving(true);
    const token = await getAccessToken();
    let imageUrl: string | null = productForm.image_url?.trim() || null;
    if (productImageFile) {
      const result = await compressAndUploadImage(productImageFile);
      if (result.url) imageUrl = result.url;
      else {
        alert(result.error || "图片压缩或上传失败，请重试。若提示 RLS，请在 Supabase 执行迁移 024。");
        setProductFormSaving(false);
        return;
      }
    }
    const body = {
      name: productForm.name.trim(),
      description: productForm.description.trim() || null,
      image_url: imageUrl,
      points_required: productForm.points_required,
      direct_buy_points: productForm.direct_buy_points === "" ? null : Number(productForm.direct_buy_points),
      fixed_shipping_fee: productForm.fixed_shipping_fee === "" ? 0 : Number(productForm.fixed_shipping_fee),
      stock: productForm.stock,
      tag: productForm.tag.trim() || null,
      button_text: productForm.button_text.trim() || null,
      sort_order: productForm.sort_order,
      is_auction: productForm.is_auction,
      end_time: productForm.end_time.trim() || null,
    };
    try {
      if (editProduct) {
        const res = await fetch(`${window.location.origin}/api/auction-products/${editProduct.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (res.ok) {
          resetProductForm();
          await fetchAuctionProducts();
        } else alert(data.error ?? "更新失败");
      } else {
        const res = await fetch(`${window.location.origin}/api/auction-products`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (res.ok) {
          resetProductForm();
          await fetchAuctionProducts();
        } else alert(data.error ?? "新增失败");
      }
    } finally {
      setProductFormSaving(false);
    }
  };

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted({
      tracking: tracking.trim(),
      status: statusFilter,
      email: emailFilter.trim(),
      cargo: cargoFilter.trim(),
    });
  };

  const handleConfirmPayment = async (orderId: string) => {
    setActionLoading(orderId);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${window.location.origin}/api/admin/orders/${orderId}/confirm-payment`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) await fetchOrders();
      else alert((await res.json()).error ?? "操作失败");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveProgress = async () => {
    if (!progressModal) return;
    setProgressSaving(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(
        `${window.location.origin}/api/admin/orders/${progressModal.id}/tracking`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            status_title: "物流更新",
            location: progressLocation.trim() || null,
            description: progressDesc.trim() || null,
          }),
        }
      );
      if (res.ok) {
        setProgressModal(null);
        setProgressLocation("");
        setProgressDesc("");
        await fetchOrders();
      } else alert((await res.json()).error ?? "保存失败");
    } finally {
      setProgressSaving(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setActionLoading(orderId);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${window.location.origin}/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) await fetchOrders();
      else alert((await res.json()).error ?? "更新失败");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSettle = async (orderId: string) => {
    setActionLoading(orderId);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${window.location.origin}/api/admin/orders/${orderId}/settle`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok) await fetchOrders();
      else alert(data.error ?? "结算失败");
    } finally {
      setActionLoading(null);
    }
  };

  const handleShipOrder = async (orderId: string) => {
    setActionLoading(orderId);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${window.location.origin}/api/admin/orders/${orderId}/ship`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok) await fetchOrders();
      else alert(data.error ?? "操作失败");
    } finally {
      setActionLoading(null);
    }
  };

  if (!user || profile?.role !== "admin") return null;

  const navSections = [
    { id: "admin-orders", label: "订单管理" },
    { id: "admin-auction", label: "竞拍结拍" },
    { id: "admin-treasure", label: "淘货商品" },
    { id: "admin-treasure-publish", label: "淘货发布" },
    { id: "admin-shipping", label: "运费管理" },
    { id: "admin-stories", label: "物流故事" },
    { id: "admin-homepage", label: "首页装修" },
    { id: "about-page", label: "关于我们" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-col gap-8 lg:flex-row">
        <aside className="sticky top-24 order-2 h-fit shrink-0 lg:order-1 lg:w-52">
          <nav className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">后台导航</div>
            <ul className="mt-2 space-y-0.5">
              {navSections.map(({ id, label }) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    className="block rounded-lg px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        <div className="min-w-0 flex-1 order-1 lg:order-2">
      <section id="admin-orders" className="scroll-mt-24">
      <h1 className="text-2xl font-bold text-slate-800">订单管理</h1>
      <p className="mt-1 text-slate-600">多维筛选、凭证审核、状态与轨迹、积分结算</p>

      <form onSubmit={handleFilter} className="mt-6 flex flex-wrap items-end gap-3">
        <div className="min-w-[120px]">
          <label className="mb-1 block text-sm font-medium text-slate-700">订单状态</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-300 py-2 pl-3 pr-8 text-slate-800"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s || "all"} value={s}>
                {s || "全部"}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[160px]">
          <label className="mb-1 block text-sm font-medium text-slate-700">单号</label>
          <input
            type="text"
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            placeholder="模糊搜索"
            className="w-full rounded-lg border border-slate-300 py-2 px-3 text-slate-800"
          />
        </div>
        <div className="min-w-[180px]">
          <label className="mb-1 block text-sm font-medium text-slate-700">用户邮箱</label>
          <input
            type="text"
            value={emailFilter}
            onChange={(e) => setEmailFilter(e.target.value)}
            placeholder="模糊搜索"
            className="w-full rounded-lg border border-slate-300 py-2 px-3 text-slate-800"
          />
        </div>
        <div className="min-w-[160px]">
          <label className="mb-1 block text-sm font-medium text-slate-700">货物品名</label>
          <input
            type="text"
            value={cargoFilter}
            onChange={(e) => setCargoFilter(e.target.value)}
            placeholder="模糊搜索"
            className="w-full rounded-lg border border-slate-300 py-2 px-3 text-slate-800"
          />
        </div>
        <button
          type="submit"
          className="flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2 font-medium text-white hover:bg-[#1d4ed8]"
        >
          <Search className="h-4 w-4" />
          筛选
        </button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : orders.length === 0 ? (
          <div className="py-12 text-center text-slate-500">暂无订单或未找到匹配结果</div>
        ) : (
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-3 py-3 font-medium text-slate-700">订单号</th>
                <th className="px-3 py-3 font-medium text-slate-700">单号</th>
                <th className="px-3 py-3 font-medium text-slate-700">用户邮箱</th>
                <th className="px-3 py-3 font-medium text-slate-700">货物品名</th>
                <th className="px-3 py-3 font-medium text-slate-700">状态</th>
                <th className="px-3 py-3 font-medium text-slate-700">运费</th>
                <th className="px-3 py-3 font-medium text-slate-700">凭证</th>
                <th className="px-3 py-3 font-medium text-slate-700">创建时间</th>
                <th className="px-3 py-3 font-medium text-slate-700">操作</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="px-3 py-2 font-mono text-slate-700" title={o.id ?? ""}>
                    {o.id ? `${String(o.id).slice(0, 8)}…` : "—"}
                  </td>
                  <td className="px-3 py-2 font-mono text-slate-700">{o.tracking_number ?? "—"}</td>
                  <td className="px-3 py-2 text-slate-600">{o.user_email ?? "—"}</td>
                  <td className="px-3 py-2 text-slate-600 max-w-[140px]" title={o.cargo_details ?? ""}>
                    <span className="flex items-center gap-1.5">
                      {o.order_type === "treasure" && (
                        <span className="shrink-0 rounded bg-amber-500 px-2 py-0.5 text-xs font-bold text-white shadow-sm">
                          自营
                        </span>
                      )}
                      <span className="truncate">{o.cargo_details || "—"}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_TAG_CLASS[o.status] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">¥{Number(o.shipping_fee).toFixed(2)}</td>
                  <td className="px-3 py-2">
                    {o.payment_proof_url ? (
                      <button
                        type="button"
                        onClick={() => setProofModal(o.payment_proof_url)}
                        className="block h-12 w-12 overflow-hidden rounded border border-slate-200 hover:opacity-90"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={o.payment_proof_url}
                          alt="凭证"
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {new Date(o.created_at).toLocaleString("zh-CN")}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {!["已支付", "待出库", "已完成"].includes(o.status) && (
                        <button
                          type="button"
                          disabled={!!actionLoading}
                          onClick={() => handleConfirmPayment(o.id)}
                          className="inline-flex items-center gap-1 rounded bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          {actionLoading === o.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <CheckCircle className="h-3 w-3" />
                          )}
                          确认收款
                        </button>
                      )}
                      {o.order_type === "treasure" && o.status === "待出库" && (
                        <button
                          type="button"
                          disabled={!!actionLoading}
                          onClick={() => handleShipOrder(o.id)}
                          title="写入轨迹「平台已打包，正在安排出库」并更新为运输中"
                          className="inline-flex items-center gap-1 rounded bg-violet-600 px-2 py-1 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                        >
                          {actionLoading === o.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Truck className="h-3 w-3" />
                          )}
                          一键发货
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={o.status === "已完成" || !!actionLoading}
                        onClick={() => handleSettle(o.id)}
                        title={o.status === "已完成" ? "已结算，不可重复操作" : "完成订单并发放积分（1:1）"}
                        className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {actionLoading === o.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : null}
                        确认结算
                      </button>
                      <button
                        type="button"
                        onClick={() => setProgressModal(o)}
                        className="inline-flex items-center gap-1 rounded bg-sky-600 px-2 py-1 text-xs font-medium text-white hover:bg-sky-700"
                      >
                        <MapPin className="h-3 w-3" />
                        更新进度
                      </button>
                      <select
                        value={o.status}
                        onChange={(e) => handleStatusChange(o.id, e.target.value)}
                        disabled={!!actionLoading}
                        className="rounded border border-slate-300 py-1 pl-1.5 pr-6 text-xs disabled:opacity-50"
                      >
                        {STATUS_OPTIONS.filter(Boolean).map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <Link
                        href={`/admin-control/orders/${o.id}`}
                        className="inline-flex items-center gap-1 rounded bg-[#2563eb] px-2 py-1 text-xs font-medium text-white hover:bg-[#1d4ed8]"
                      >
                        <Package className="h-3 w-3" />
                        管理轨迹
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      </section>

      {/* 竞拍结拍 */}
      <section id="admin-auction" className="mt-12 scroll-mt-24">
        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-800">
          <Gavel className="h-5 w-5 text-amber-600" />
          竞拍结拍
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          对已到期的竞拍商品执行结拍：确定最高出价者、退还未中标者积分、为中标者生成物流订单
        </p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          {auctionLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : (() => {
            const pending = auctionProducts.filter((p) => p.is_auction && !p.settled_at);
            if (pending.length === 0) {
              return (
                <div className="py-10 text-center text-slate-500">
                  暂无待结拍商品（仅显示「积分竞拍」且未结拍的商品）
                </div>
              );
            }
            return (
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-3 py-3 font-medium text-slate-700">商品名称</th>
                    <th className="px-3 py-3 font-medium text-slate-700">起拍积分</th>
                    <th className="px-3 py-3 font-medium text-slate-700">结束时间</th>
                    <th className="px-3 py-3 font-medium text-slate-700">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((p) => (
                    <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="px-3 py-2 font-medium text-slate-800">{p.name}</td>
                      <td className="px-3 py-2 text-slate-600">{p.points_required}</td>
                      <td className="px-3 py-2 text-slate-600">
                        {p.end_time
                          ? new Date(p.end_time).toLocaleString("zh-CN")
                          : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          disabled={!!auctionSettleLoading}
                          onClick={() => handleSettleAuction(p.id)}
                          className="inline-flex items-center gap-1 rounded bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                        >
                          {auctionSettleLoading === p.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Gavel className="h-3.5 w-3.5" />
                          )}
                          结拍
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })()}
        </div>
      </section>

      {/* 淘货商品管理 / 上架表单 */}
      <section id="admin-treasure" className="mt-12 scroll-mt-24">
        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-800">
          <Package className="h-5 w-5 text-indigo-600" />
          淘货商品管理
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          上架积分淘货商品，可填写预设运费（fixed_shipping_fee）。兑换/竞拍生成订单时将使用该金额作为运费。
        </p>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => { resetProductForm(); setProductFormOpen(true); }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            新增商品
          </button>
        </div>
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          {auctionLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : auctionProducts.length === 0 ? (
            <div className="py-10 text-center text-slate-500">暂无淘货商品</div>
          ) : (
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-3 py-3 font-medium text-slate-700">名称</th>
                  <th className="px-3 py-3 font-medium text-slate-700">起拍积分</th>
                  <th className="px-3 py-3 font-medium text-slate-700">预设运费(元)</th>
                  <th className="px-3 py-3 font-medium text-slate-700">库存</th>
                  <th className="px-3 py-3 font-medium text-slate-700">标签</th>
                  <th className="px-3 py-3 font-medium text-slate-700">类型</th>
                  <th className="px-3 py-3 font-medium text-slate-700">操作</th>
                </tr>
              </thead>
              <tbody>
                {auctionProducts.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-3 py-2 font-medium text-slate-800">{p.name}</td>
                    <td className="px-3 py-2 text-slate-600">{p.points_required}</td>
                    <td className="px-3 py-2 text-slate-600">
                      ¥{Number(p.fixed_shipping_fee ?? p.shipping_fee ?? 0).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-slate-600">{p.stock}</td>
                    <td className="px-3 py-2 text-slate-600">{p.tag ?? "—"}</td>
                    <td className="px-3 py-2">{p.is_auction ? "竞拍" : "直拍"}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => openEditProduct(p)}
                        className="inline-flex items-center gap-1 rounded bg-slate-600 px-2 py-1 text-xs font-medium text-white hover:bg-slate-700"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        编辑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* 新增/编辑商品弹窗（含预设运费） */}
      {(productFormOpen || editProduct) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-800">
              {editProduct ? "编辑商品" : "新增商品（上架）"}
            </h3>
            <form onSubmit={handleSaveProduct} className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">商品名称 *</label>
                <input
                  type="text"
                  value={productForm.name}
                  onChange={(e) => setProductForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">描述</label>
                <input
                  type="text"
                  value={productForm.description}
                  onChange={(e) => setProductForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">商品图片</label>
                <input
                  ref={productImageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleProductImageChange}
                  className="hidden"
                />
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => productImageInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Upload className="h-4 w-4" />
                    选择图片（≤2MB，上传前自动压缩为 WebP）
                  </button>
                  {(productForm.image_url || productImageFile) && (
                    <div className="flex items-center gap-2">
                      <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                        {productImageFile && productImagePreviewUrl ? (
                          <img
                            src={productImagePreviewUrl}
                            alt="预览"
                            className="h-full w-full object-cover"
                          />
                        ) : productForm.image_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={productForm.image_url}
                            alt="商品图"
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setProductImageFile(null);
                          setProductImagePreviewUrl((prev) => {
                            if (prev) URL.revokeObjectURL(prev);
                            return null;
                          });
                          setProductForm((f) => ({ ...f, image_url: "" }));
                          if (productImageInputRef.current) productImageInputRef.current.value = "";
                        }}
                        className="rounded p-1 text-slate-500 hover:bg-slate-100"
                        title="清除"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">超过 2MB 将提示压缩后再传；保存时自动压缩至约 800KB 并转为 WebP</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">起拍积分</label>
                  <input
                    type="number"
                    min={0}
                    value={productForm.points_required}
                    onChange={(e) => setProductForm((f) => ({ ...f, points_required: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">直拍积分</label>
                  <input
                    type="number"
                    min={0}
                    value={productForm.direct_buy_points}
                    onChange={(e) => setProductForm((f) => ({ ...f, direct_buy_points: e.target.value === "" ? "" : parseInt(e.target.value, 10) }))}
                    placeholder="可选"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">预设运费（元）*</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={productForm.fixed_shipping_fee}
                  onChange={(e) => setProductForm((f) => ({ ...f, fixed_shipping_fee: e.target.value === "" ? "" : parseFloat(e.target.value) }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
                  placeholder="0"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">库存</label>
                  <input
                    type="number"
                    min={0}
                    value={productForm.stock}
                    onChange={(e) => setProductForm((f) => ({ ...f, stock: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">标签</label>
                  <input
                    type="text"
                    value={productForm.tag}
                    onChange={(e) => setProductForm((f) => ({ ...f, tag: e.target.value }))}
                    placeholder="0元领 / 积分竞拍"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">按钮文案</label>
                <input
                  type="text"
                  value={productForm.button_text}
                  onChange={(e) => setProductForm((f) => ({ ...f, button_text: e.target.value }))}
                  placeholder="立即兑换 / 立即出价"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">排序</label>
                  <input
                    type="number"
                    value={productForm.sort_order}
                    onChange={(e) => setProductForm((f) => ({ ...f, sort_order: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
                  />
                </div>
                <div className="flex items-end gap-2 pb-1">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={productForm.is_auction}
                      onChange={(e) => setProductForm((f) => ({ ...f, is_auction: e.target.checked }))}
                      className="rounded border-slate-300"
                    />
                    是否竞拍
                  </label>
                </div>
              </div>
              {productForm.is_auction && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">竞拍结束时间</label>
                  <input
                    type="datetime-local"
                    value={productForm.end_time}
                    onChange={(e) => setProductForm((f) => ({ ...f, end_time: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
                  />
                </div>
              )}
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={resetProductForm}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={productFormSaving}
                  className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {productFormSaving ? "保存中…" : editProduct ? "保存" : "上架"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 凭证放大 */}
      {proofModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setProofModal(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-slate-800 hover:bg-white"
            onClick={() => setProofModal(null)}
            aria-label="关闭"
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={proofModal}
            alt="支付凭证"
            className="max-h-full max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* 淘货商品发布中心：多图上传、发布表单、列表下架/删除 */}
      <section id="admin-treasure-publish" className="mt-12 scroll-mt-24">
        <TreasurePublishCenter />
      </section>

      {/* 运费管理：CSV 上传、表头映射、Dry Run、调价、历史 */}
      <section id="admin-shipping" className="mt-12 scroll-mt-24">
        <ShippingRatesAdmin />
      </section>

      {/* 物流故事管理中心 */}
      <section id="admin-stories" className="mt-12 scroll-mt-24">
        <LogisticsStoriesAdmin />
      </section>

      {/* 首页装修遥控器：Banner 与功能图标 URL */}
      <section id="admin-homepage" className="mt-12 scroll-mt-24">
        <HomepageRemote />
      </section>

      {/* 关于我们页面内容管理 */}
      <AboutPageRemote />

      {/* 更新进度弹窗 */}
      {progressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-800">更新进度</h3>
            <p className="mt-1 text-sm text-slate-500">单号：{progressModal.tracking_number || "—"}</p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">当前位置</label>
                <input
                  type="text"
                  value={progressLocation}
                  onChange={(e) => setProgressLocation(e.target.value)}
                  placeholder="如：广州白云中转场"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">状态描述</label>
                <textarea
                  value={progressDesc}
                  onChange={(e) => setProgressDesc(e.target.value)}
                  placeholder="详细说明"
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setProgressModal(null);
                  setProgressLocation("");
                  setProgressDesc("");
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="button"
                disabled={progressSaving}
                onClick={handleSaveProgress}
                className="rounded-lg bg-[#2563eb] px-4 py-2 font-medium text-white hover:bg-[#1d4ed8] disabled:opacity-50"
              >
                {progressSaving ? "保存中…" : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}

        </div>
      </div>
    </div>
  );
}
