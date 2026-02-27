"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import imageCompression from "browser-image-compression";
import { Loader2, Upload, BookOpen, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { useToast } from "@/app/context/ToastContext";
import type { LogisticsStoryRow } from "@/types/database";

const COVER_MAX_MB = 0.8;
const COVER_MAX_DIM = 1200;
const CATEGORY_OPTIONS = ["避坑指南", "时效预警", "客户案例", "其他"];

type StoryCard = {
  id: string;
  title: string;
  image_url: string | null;
  created_at: string;
};

export default function LogisticsStoriesAdmin() {
  const { getAccessToken } = useAuth();
  const { toast } = useToast();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [list, setList] = useState<StoryCard[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    category: "",
    summary: "",
    content: "",
  });

  const fetchList = useCallback(async () => {
    setListLoading(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${typeof window !== "undefined" ? window.location.origin : ""}/api/admin/logistics-stories`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setList(
          (Array.isArray(data) ? data : []).map((s: LogisticsStoryRow) => ({
            id: s.id,
            title: s.title,
            image_url: s.image_url ?? null,
            created_at: s.created_at,
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

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file?.type.startsWith("image/")) return;
    setCoverUploading(true);
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: COVER_MAX_MB,
        maxWidthOrHeight: COVER_MAX_DIM,
        useWebWorker: true,
        fileType: "image/webp",
      });
      toast.success("图片压缩成功…");
      const token = await getAccessToken();
      const formData = new FormData();
      formData.set("file", compressed);
      const res = await fetch(`${window.location.origin}/api/admin/upload-site-asset`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setCoverUrl(data.url);
        toast.success("上传成功！");
      } else {
        toast.error(data.error ?? "上传失败");
      }
    } catch {
      toast.error("压缩或上传失败");
    } finally {
      setCoverUploading(false);
    }
    e.target.value = "";
  };

  const resetForm = () => {
    setForm({ title: "", category: "", summary: "", content: "" });
    setCoverUrl(null);
    setEditingId(null);
  };

  const fillEdit = (s: LogisticsStoryRow) => {
    setEditingId(s.id);
    setForm({
      title: s.title,
      category: (s.tags ?? [])[0] ?? "",
      summary: s.description ?? "",
      content: s.content ?? "",
    });
    setCoverUrl(s.image_url ?? null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const token = await getAccessToken();
    const tags = form.category ? [form.category] : [];
    const body = {
      title: form.title.trim(),
      description: form.summary.trim(),
      content: form.content.trim() || null,
      tags,
      image_url: coverUrl,
      sort_order: 0,
    };
    try {
      if (editingId) {
        const res = await fetch(`${window.location.origin}/api/admin/logistics-stories/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (res.ok) {
          toast.success("更新已生效");
          resetForm();
          await fetchList();
        } else {
          toast.error(data.error ?? "更新失败");
        }
      } else {
        const res = await fetch(`${window.location.origin}/api/admin/logistics-stories`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (res.ok) {
          toast.success("发布成功！");
          resetForm();
          await fetchList();
        } else {
          toast.error(data.error ?? "发布失败");
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除该故事？")) return;
    setActionLoading(id);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${window.location.origin}/api/admin/logistics-stories/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        toast.success("已删除");
        await fetchList();
        if (editingId === id) resetForm();
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
        <BookOpen className="h-5 w-5 text-sky-600" />
        物流故事管理中心
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        发布/编辑故事：封面图上传至 site-assets，支持简单 Markdown 正文；下方为故事列表，可编辑或删除。
      </p>

      <form onSubmit={handleSubmit} className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">封面图</label>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleCoverChange}
              className="hidden"
            />
            <button
              type="button"
              disabled={coverUploading}
              onClick={() => coverInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {coverUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {coverUploading ? "上传中…" : "选择封面（自动压缩）"}
            </button>
            {coverUrl && (
              <div className="mt-2 h-24 w-40 overflow-hidden rounded-lg border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverUrl} alt="封面" className="h-full w-full object-cover" />
              </div>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">标题 *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">分类</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
            >
              <option value="">请选择</option>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">摘要</label>
            <input
              type="text"
              value={form.summary}
              onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
              placeholder="列表页与首页展示用"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">正文（支持简单 Markdown）</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              rows={12}
              placeholder="支持 **粗体**、## 标题、- 列表、换行等"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-800"
            />
            <p className="mt-1 text-xs text-slate-500">可用：**粗体**、## 二级标题、- 列表、空行换段</p>
          </div>
        </div>
        {saving && (
          <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-slate-200">
            <div className="h-full w-2/3 animate-pulse rounded-full bg-sky-500" />
          </div>
        )}
        <div className="mt-4 flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-sky-600 px-4 py-2 font-medium text-white hover:bg-sky-700 disabled:opacity-50"
          >
            {saving ? "提交中…" : editingId ? "保存更新" : "发布"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
            >
              取消编辑
            </button>
          )}
        </div>
      </form>

      <div className="mt-6">
        <h3 className="mb-3 text-sm font-semibold text-slate-800">故事列表</h3>
        {listLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : list.length === 0 ? (
          <div className="py-12 text-center text-slate-500">暂无故事</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((s) => (
              <div
                key={s.id}
                className="flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="h-24 w-28 shrink-0 overflow-hidden bg-slate-100">
                  {s.image_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={s.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl text-slate-300">📄</div>
                  )}
                </div>
                <div className="flex flex-1 flex-col justify-between p-3">
                  <div>
                    <p className="font-medium text-slate-800 line-clamp-2">{s.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {new Date(s.created_at).toLocaleString("zh-CN")}
                    </p>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      disabled={!!actionLoading}
                      onClick={async () => {
                        const token = await getAccessToken();
                        const res = await fetch(`${window.location.origin}/api/admin/logistics-stories/${s.id}`, {
                          headers: token ? { Authorization: `Bearer ${token}` } : {},
                        });
                        if (res.ok) {
                          const one: LogisticsStoryRow = await res.json();
                          fillEdit(one);
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded bg-slate-600 px-2 py-1 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
                    >
                      <Pencil className="h-3 w-3" />
                      编辑
                    </button>
                    <button
                      type="button"
                      disabled={!!actionLoading}
                      onClick={() => handleDelete(s.id)}
                      className="inline-flex items-center gap-1 rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {actionLoading === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
