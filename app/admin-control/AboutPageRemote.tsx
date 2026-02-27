"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { Loader2, Image, Save, FileText } from "lucide-react";

const FIELDS = [
  { key: "about_hero_image", label: "关于我们 Hero 图 URL", type: "url" as const, showPreview: true },
  { key: "about_title", label: "关于我们标题", type: "text" as const, showPreview: false },
  { key: "about_subtitle", label: "副标题", type: "text" as const, showPreview: false },
  { key: "about_intro", label: "公司简介（多行）", type: "textarea" as const, showPreview: false },
  { key: "about_mission", label: "服务宗旨（多行）", type: "textarea" as const, showPreview: false },
  { key: "about_image_2", label: "配图 URL（可选）", type: "url" as const, showPreview: true },
  { key: "about_contact", label: "联系我们说明（多行，可选）", type: "textarea" as const, showPreview: false },
] as const;

function ImagePreview({ src }: { src: string }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  if (!src || !/^https?:\/\//i.test(src.trim())) return null;
  return (
    <div className="shrink-0">
      <div className="relative h-16 w-24 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src.trim()}
          alt="预览"
          className="h-full w-full object-cover"
          onLoad={() => {
            setLoaded(true);
            setError(false);
          }}
          onError={() => setError(true)}
        />
        {!loaded && !error && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">加载中…</div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-50 text-xs text-red-600">加载失败</div>
        )}
      </div>
    </div>
  );
}

export default function AboutPageRemote() {
  const { getAccessToken } = useAuth();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    const token = await getAccessToken();
    const res = await fetch(`${typeof window !== "undefined" ? window.location.origin : ""}/api/admin/site-settings`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const data = await res.json();
      setSettings(typeof data === "object" && data !== null ? data : {});
    }
  }, [getAccessToken]);

  useEffect(() => {
    setLoading(true);
    fetchSettings().finally(() => setLoading(false));
  }, [fetchSettings]);

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    const token = await getAccessToken();
    try {
      const res = await fetch(`${window.location.origin}/api/admin/site-settings`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ settings }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`已保存，关于我们页面将立即生效（${data.updated ?? 0} 项）`);
      } else {
        alert(data.error ?? "保存失败");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <section id="about-page" className="mt-12 scroll-mt-8">
      <h2 className="flex items-center gap-2 text-xl font-bold text-slate-800">
        <FileText className="h-5 w-5 text-teal-600" />
        关于我们
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        编辑「关于我们」页面的标题、简介、图片等；留空则使用默认文案
      </p>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-5">
            {FIELDS.map(({ key, label, type, showPreview }) => (
              <div key={key}>
                <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    {type === "textarea" ? (
                      <textarea
                        value={settings[key] ?? ""}
                        onChange={(e) => handleChange(key, e.target.value)}
                        placeholder="多行文本，留空则使用默认内容"
                        rows={4}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 placeholder:text-slate-400"
                      />
                    ) : (
                      <input
                        type={type}
                        value={settings[key] ?? ""}
                        onChange={(e) => handleChange(key, e.target.value)}
                        placeholder={type === "url" ? "https://..." : "选填"}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 placeholder:text-slate-400"
                      />
                    )}
                  </div>
                  {showPreview && <ImagePreview src={settings[key] ?? ""} />}
                </div>
              </div>
            ))}
            <div className="pt-2">
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                保存
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
