"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import imageCompression from "browser-image-compression";
import { Loader2, Upload, X, Package, Trash2, EyeOff } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { useToast } from "@/app/context/ToastContext";

const MAX_SIZE_MB = 0.8;
const MAX_WIDTH_OR_HEIGHT = 1200;

type ProductRow = {
  id: string;
  name: string;
  image_url: string | null;
  stock: number;
  is_active: boolean;
};

export default function TreasurePublishCenter() {
  const { getAccessToken } = useAuth();
  const { toast } = useToast();
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [list, setList] = useState<ProductRow[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    points_required: 0,
    fixed_shipping_fee: "" as number | "",
    stock: 0,
    is_auction: false,
    end_time: "",
  });

  const fetchList = useCallback(async () => {
    setListLoading(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${typeof window !== "undefined" ? window.location.origin : ""}/api/auction-products`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setList(
          (Array.isArray(data) ? data : []).map((p: { id: string; name: string; image_url: string | null; stock: number; is_active?: boolean }) => ({
            id: p.id,
            name: p.name,
            image_url: p.image_url ?? null,
            stock: p.stock ?? 0,
            is_active: p.is_active !== false,
          }))
        );
      } else {
        setList([]);
      }
    } finally {
      setListLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    const token = await getAccessToken();
    const added: string[] = [];
    let didToastCompress = false;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) continue;
      try {
        const compressed = await imageCompression(file, {
          maxSizeMB: MAX_SIZE_MB,
          maxWidthOrHeight: MAX_WIDTH_OR_HEIGHT,
          useWebWorker: true,
          fileType: "image/webp",
        });
        if (!didToastCompress) {
          toast.success("图片压缩成功…");
          didToastCompress = true;
        }
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
          toast.error(res.ok ? "响应解析失败" : `上传失败 ${res.status}`);
          continue;
        }
        if (res.ok && data.url) {
          added.push(data.url);
          toast.success("上传成功！");
        } else {
          toast.error(data.error ?? `上传失败 ${res.status}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "压缩或上传失败";
        toast.error(msg);
      }
    }
    if (added.length) setUploadedUrls((prev) => [...prev, ...added]);
    setUploading(false);
    e.target.value = "";
  };

  const removeImage = (url: string) => {
    setUploadedUrls((prev) => prev.filter((u) => u !== url));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const token = await getAccessToken();
    const images = uploadedUrls.length ? uploadedUrls : null;
    const imageUrl = uploadedUrls[0] ?? null;
    const body = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      image_url: imageUrl,
      images,
      points_required: form.points_required,
      direct_buy_points: null,
      fixed_shipping_fee: form.fixed_shipping_fee === "" ? 0 : Number(form.fixed_shipping_fee),
      stock: form.stock,
      tag: null,
      button_text: null,
      sort_order: 0,
      is_auction: form.is_auction,
      end_time: form.is_auction && form.end_time ? form.end_time : null,
    };
    try {
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
        toast.success("商品已发布");
        setForm({ name: "", description: "", points_required: 0, fixed_shipping_fee: "", stock: 0, is_auction: false, end_time: "" });
        setUploadedUrls([]);
        await fetchList();
      } else {
        toast.error(data.error ?? "发布失败");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    setActionLoading(id);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${window.location.origin}/api/auction-products/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ is_active: false }),
      });
      if (res.ok) {
        toast.success("已下架");
        await fetchList();
      } else {
        const data = await res.json();
        toast.error(data.error ?? "下架失败");
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除该商品？")) return;
    setActionLoading(id);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${window.location.origin}/api/auction-products/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        toast.success("已删除");
        await fetchList();
      } else {
        const data = await res.json();
        toast.error(data.error ?? "删除失败");
      }
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <section className="mt-12">
      <h2 className="flex items-center gap-2 text-xl font-bold text-slate-800">
        <Package className="h-5 w-5 text-amber-600" />
        淘货商品发布中心
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        多图上传（自动压缩）、发布商品；下方列表支持一键下架与删除。
      </p>

      <form onSubmit={handleSubmit} className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">品名 *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">详细描述</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={4}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">商品图片（多图）</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={handleFiles}
              className="hidden"
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? "上传中…" : "选择图片（自动压缩 0.8MB / 1200px）"}
            </button>
            {uploadedUrls.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-3">
                {uploadedUrls.map((url) => (
                  <div key={url} className="relative">
                    <div className="h-20 w-20 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="已上传" className="h-full w-full object-cover" />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeImage(url)}
                      className="absolute -right-1 -top-1 rounded-full bg-slate-700 p-0.5 text-white hover:bg-slate-800"
                      aria-label="删除"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">积分价格 *</label>
              <input
                type="number"
                min={0}
                value={form.points_required}
                onChange={(e) => setForm((f) => ({ ...f, points_required: parseInt(e.target.value, 10) || 0 }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">固定运费（元）*</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.fixed_shipping_fee}
                onChange={(e) => setForm((f) => ({ ...f, fixed_shipping_fee: e.target.value === "" ? "" : parseFloat(e.target.value) }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
                placeholder="0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">库存 *</label>
              <input
                type="number"
                min={0}
                value={form.stock}
                onChange={(e) => setForm((f) => ({ ...f, stock: parseInt(e.target.value, 10) || 0 }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_auction"
              checked={form.is_auction}
              onChange={(e) => setForm((f) => ({ ...f, is_auction: e.target.checked }))}
              className="rounded border-slate-300"
            />
            <label htmlFor="is_auction" className="text-sm font-medium text-slate-700">
              开启竞拍
            </label>
          </div>
          {form.is_auction && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">起拍价（积分）</label>
                <input
                  type="number"
                  min={0}
                  value={form.points_required}
                  onChange={(e) => setForm((f) => ({ ...f, points_required: parseInt(e.target.value, 10) || 0 }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">竞拍截止日期</label>
                <input
                  type="datetime-local"
                  value={form.end_time}
                  onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
                />
              </div>
            </div>
          )}
        </div>
        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {saving ? "发布中…" : "发布商品"}
          </button>
        </div>
      </form>

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <h3 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800">已发布商品</h3>
        {listLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : list.length === 0 ? (
          <div className="py-12 text-center text-slate-500">暂无商品</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {list.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-4 px-4 py-3 hover:bg-slate-50/50 sm:flex-nowrap">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                  {p.image_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-400">
                      <Package className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-slate-800">{p.name}</span>
                  {!p.is_active && (
                    <span className="ml-2 rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-600">已下架</span>
                  )}
                  <div className="text-sm text-slate-500">库存：{p.stock}</div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    disabled={!!actionLoading || !p.is_active}
                    onClick={() => handleDeactivate(p.id)}
                    className="inline-flex items-center gap-1 rounded bg-slate-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
                  >
                    {actionLoading === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <EyeOff className="h-3.5 w-3.5" />}
                    一键下架
                  </button>
                  <button
                    type="button"
                    disabled={!!actionLoading}
                    onClick={() => handleDelete(p.id)}
                    className="inline-flex items-center gap-1 rounded bg-red-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {actionLoading === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    删除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
