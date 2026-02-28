"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import type { ContactChannelOption } from "@/lib/contact";

// 咨询图标 - 聊天气泡
function ChatIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}

const OPTION_CLASS =
  "contact-float-option flex items-center gap-3 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-lg ring-1 ring-slate-200/80 transition hover:bg-slate-50 hover:shadow-xl";

type ContactFloatProps = {
  /** 优先使用：与「选择联系方式」弹窗一致的渠道列表（来自客服渠道 site_settings） */
  channels?: ContactChannelOption[];
  /** 兼容旧用法：仅当未传 channels 时生效 */
  whatsappLink?: string | null;
  instagramLink?: string | null;
  facebookLink?: string | null;
};

export default function ContactFloat({
  channels: channelsProp,
  whatsappLink,
  instagramLink,
  facebookLink,
}: ContactFloatProps) {
  const t = useTranslations("contact");
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const channels = useMemo(() => {
    if (channelsProp && channelsProp.length > 0) return channelsProp;
    const legacy: ContactChannelOption[] = [];
    if (whatsappLink) {
      legacy.push({
        id: "whatsapp",
        label: "WhatsApp",
        color: "#25D366",
        action: "open",
        href: whatsappLink,
      });
    }
    if (instagramLink) {
      legacy.push({
        id: "instagram",
        label: "Instagram",
        color: "#E4405F",
        action: "open",
        href: instagramLink,
      });
    }
    if (facebookLink) {
      legacy.push({
        id: "facebook",
        label: "Facebook",
        color: "#1877F2",
        action: "open",
        href: facebookLink,
      });
    }
    return legacy;
  }, [channelsProp, whatsappLink, instagramLink, facebookLink]);

  const showToast = (message: string) => {
    const el = document.createElement("div");
    el.setAttribute("role", "status");
    el.className =
      "fixed bottom-24 left-1/2 z-[110] -translate-x-1/2 rounded-lg bg-slate-800 px-4 py-3 text-sm text-white shadow-lg";
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  };

  const handleChannelClick = (opt: ContactChannelOption) => {
    if (opt.action === "copy" && opt.wechatId) {
      if (typeof navigator?.clipboard?.writeText === "function") {
        navigator.clipboard.writeText(opt.wechatId);
      }
      showToast(t("wechatCopied"));
      return;
    }
    if (opt.action === "open" && opt.href) {
      window.open(opt.href, "_blank", "noopener,noreferrer");
    }
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (channels.length === 0) return null;

  return (
    <div
      id="contact-float"
      ref={panelRef}
      className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6 md:bottom-8 md:right-8"
      style={{
        paddingRight: "env(safe-area-inset-right, 0)",
        paddingBottom: "env(safe-area-inset-bottom, 0)",
      }}
    >
      <div
        className={`flex flex-col gap-2 overflow-hidden transition-all duration-300 ease-out ${
          open
            ? "pointer-events-auto max-h-[min(70vh,20rem)] opacity-100"
            : "pointer-events-none max-h-0 opacity-0"
        }`}
      >
        {channels.map((opt) => (
          <span key={opt.id}>
            {opt.action === "copy" ? (
              <button
                type="button"
                onClick={() => handleChannelClick(opt)}
                className={OPTION_CLASS}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${opt.color}20`, color: opt.color }}
                >
                  <span className="text-sm font-bold">{opt.label.slice(0, 1)}</span>
                </span>
                {opt.label}
              </button>
            ) : (
              <a
                href={opt.href}
                target="_blank"
                rel="noopener noreferrer"
                className={OPTION_CLASS}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${opt.color}20`, color: opt.color }}
                >
                  <span className="text-sm font-bold">{opt.label.slice(0, 1)}</span>
                </span>
                {opt.label}
              </a>
            )}
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#2563eb] text-white shadow-lg ring-4 ring-white transition hover:bg-[#1d4ed8] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2 sm:h-16 sm:w-16"
        aria-label={t("contactSupport")}
        aria-expanded={open}
      >
        <ChatIcon className="h-6 w-6 sm:h-7 sm:w-7" />
      </button>
    </div>
  );
}
