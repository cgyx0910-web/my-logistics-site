import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { getSiteSettings } from "@/lib/data";
import { getContactChannelsFromSettings, type ContactChannelOption } from "@/lib/contact";
import Navbar from "@/app/components/Navbar";
import ContactFloat from "@/app/components/ContactFloat";
import FlashMessageBanner from "@/app/components/FlashMessageBanner";
import AuthGate from "@/app/components/AuthGate";
import { AuthProvider } from "@/app/context/AuthContext";
import { ToastProvider } from "@/app/context/ToastContext";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const [messages, siteSettings] = await Promise.all([
    getMessages(),
    getSiteSettings(),
  ]);
  // 浮窗与「选择联系方式」弹窗一致：优先使用客服渠道 site_settings，缺省时用首页装修 WhatsApp 兜底
  let floatChannels: ContactChannelOption[] = getContactChannelsFromSettings(siteSettings, null);
  if (!floatChannels.some((c) => c.id === "whatsapp") && siteSettings.whatsapp_link?.trim()) {
    const wa = siteSettings.whatsapp_link.trim();
    const sep = wa.includes("?") ? "&" : "?";
    floatChannels = [
      {
        id: "whatsapp",
        label: "WhatsApp",
        color: "#25D366",
        action: "open",
        href: `${wa}${sep}text=${encodeURIComponent("您好，我想咨询物流与下单问题。")}`,
      },
      ...floatChannels,
    ];
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <AuthProvider>
        <ToastProvider>
          <AuthGate>
            <FlashMessageBanner />
            <Navbar />
            {children}
            <ContactFloat channels={floatChannels} />
          </AuthGate>
        </ToastProvider>
      </AuthProvider>
    </NextIntlClientProvider>
  );
}
