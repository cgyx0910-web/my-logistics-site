import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import TrackingQuery from "@/app/components/TrackingQuery";

type Props = { params: Promise<{ locale: string }> };

export default async function TrackingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("tracking");

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
        <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">{t("title")}</h1>
        <p className="mt-2 text-slate-600">{t("subtitle")}</p>
        <TrackingQuery />
      </div>
    </main>
  );
}
