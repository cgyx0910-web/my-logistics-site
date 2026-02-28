"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";

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

type ContactFloatProps = {
  whatsappLink?: string | null;
  instagramLink?: string | null;
  facebookLink?: string | null;
};

export default function ContactFloat({
  whatsappLink,
  instagramLink,
  facebookLink,
}: ContactFloatProps) {
  const t = useTranslations("contact");
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭
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

  return (
    <div
      id="contact-float"
      ref={panelRef}
      className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6 md:bottom-8 md:right-8"
      style={{
        // 避免遮挡：为移动端留出安全距离，不贴边
        paddingRight: "env(safe-area-inset-right, 0)",
        paddingBottom: "env(safe-area-inset-bottom, 0)",
      }}
    >
      {/* 展开的选项 */}
      <div
        className={`flex flex-col gap-2 overflow-hidden transition-all duration-300 ease-out ${
          open
            ? "pointer-events-auto max-h-40 opacity-100"
            : "pointer-events-none max-h-0 opacity-0"
        }`}
      >
        {whatsappLink && (
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="contact-float-option flex items-center gap-3 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-lg ring-1 ring-slate-200/80 transition hover:bg-slate-50 hover:shadow-xl"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </span>
            {t("whatsapp")}
          </a>
        )}
        {instagramLink && (
          <a
            href={instagramLink}
            target="_blank"
            rel="noopener noreferrer"
            className="contact-float-option flex items-center gap-3 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-lg ring-1 ring-slate-200/80 transition hover:bg-slate-50 hover:shadow-xl"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </span>
            {t("instagram")}
          </a>
        )}
        {facebookLink && (
          <a
            href={facebookLink}
            target="_blank"
            rel="noopener noreferrer"
            className="contact-float-option flex items-center gap-3 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-lg ring-1 ring-slate-200/80 transition hover:bg-slate-50 hover:shadow-xl"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.44 3.14 7.17L2 22l4.5-2.95A10.2 10.2 0 0012 21.4c5.64 0 10-4.13 10-9.7S17.64 2 12 2zm0 17.3c-1.9 0-3.7-.6-5.2-1.7l-.37-.23-3.88 1.02 1.04-3.78-.24-.38a8.1 8.1 0 01-1.24-4.34c0-4.46 3.63-8.1 8.1-8.1s8.1 3.64 8.1 8.1-3.63 8.1-8.1 8.1z" />
              </svg>
            </span>
            {t("messenger")}
          </a>
        )}
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
