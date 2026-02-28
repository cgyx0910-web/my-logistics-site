"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { Loader2, Save, MessageCircle } from "lucide-react";

const FIELDS = [
  { key: "contact_whatsapp_number", label: "WhatsApp 号码", placeholder: "8613800138000（国际格式，无+号）" },
  { key: "contact_line_link", label: "Line 客服链接", placeholder: "https://line.me/ti/p/xxx" },
  { key: "contact_telegram", label: "Telegram", placeholder: "用户名或 t.me/xxx 链接" },
  { key: "contact_instagram_handle", label: "Instagram 用户名", placeholder: "用户名，可带 @" },
  { key: "contact_facebook_link", label: "Facebook / Messenger 链接", placeholder: "https://m.me/xxx 或主页链接" },
  { key: "contact_wechat_id", label: "微信号", placeholder: "用于一键复制" },
] as const;

export default function ContactChannelsAdmin() {
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
        alert(`已保存客服渠道（${data.updated ?? 0} 项），选择联系方式弹窗与客服浮窗将使用新配置`);
      } else {
        alert(data.error ?? "保存失败");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <section id="admin-contact-channels" className="mt-12 scroll-mt-24">
      <h2 className="flex items-center gap-2 text-xl font-bold text-slate-800">
        <MessageCircle className="h-5 w-5 text-emerald-600" />
        客服渠道
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        配置后，「选择联系方式」弹窗与右下角客服浮窗将展示对应渠道；留空则不显示该渠道。首页装修中的「客服 WhatsApp 链接」仍用于浮窗主 WhatsApp 按钮。
      </p>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-5">
            {FIELDS.map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
                <input
                  type="text"
                  value={settings[key] ?? ""}
                  onChange={(e) => handleChange(key, e.target.value)}
                  placeholder={placeholder}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 placeholder:text-slate-400"
                />
              </div>
            ))}
            <div className="pt-2">
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
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
