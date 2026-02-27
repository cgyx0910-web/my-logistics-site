"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";

const STORAGE_KEY = "flashMessage";

export default function FlashMessageBanner() {
  const t = useTranslations("flashMessage");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const msg = sessionStorage.getItem(STORAGE_KEY);
    if (msg) {
      sessionStorage.removeItem(STORAGE_KEY);
      setMessage(msg);
    }
  }, []);

  if (!message) return null;

  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-4 bg-amber-600 px-4 py-3 text-white shadow-md"
    >
      <span className="font-medium">{message}</span>
      <button
        type="button"
        onClick={() => setMessage(null)}
        className="rounded p-1 hover:bg-white/20"
        aria-label={t("close")}
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}
