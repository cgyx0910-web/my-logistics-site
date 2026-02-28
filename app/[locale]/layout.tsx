import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { getSiteSettings } from "@/lib/data";
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
  const whatsappLink = siteSettings.whatsapp_link?.trim() || undefined;
  const igHandle = siteSettings.contact_instagram_handle?.trim();
  const instagramLink = igHandle
    ? `https://www.instagram.com/${igHandle.replace(/^@/, "")}/`
    : undefined;
  const facebookLink = siteSettings.contact_facebook_link?.trim() || undefined;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <AuthProvider>
        <ToastProvider>
          <AuthGate>
            <FlashMessageBanner />
            <Navbar />
            {children}
            <ContactFloat
              whatsappLink={whatsappLink}
              instagramLink={instagramLink}
              facebookLink={facebookLink}
            />
          </AuthGate>
        </ToastProvider>
      </AuthProvider>
    </NextIntlClientProvider>
  );
}
