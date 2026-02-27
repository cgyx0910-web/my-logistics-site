"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale } from "next-intl";
import { usePathname } from "@/i18n/navigation";

const LOCALES = [
  { code: "zh-CN", label: "简体中文", short: "简" },
  { code: "zh-HK", label: "繁體中文", short: "繁" },
  { code: "en", label: "English", short: "EN" },
] as const;

export default function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="选择语言"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded bg-white/20 text-xs font-bold">
          {current.short}
        </span>
        <svg
          className={`h-4 w-4 opacity-90 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 top-full z-50 mt-2 min-w-[10rem] rounded-lg border border-slate-200 bg-white py-1 shadow-xl"
        >
          {LOCALES.map((loc) => (
            <li key={loc.code} role="option" aria-selected={locale === loc.code}>
              <a
                href={`/${loc.code}${pathname}`}
                className={`block px-4 py-2.5 text-sm transition ${
                  locale === loc.code
                    ? "bg-slate-100 font-medium text-[#1e3a8a]"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
                onClick={() => setOpen(false)}
              >
                {loc.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
