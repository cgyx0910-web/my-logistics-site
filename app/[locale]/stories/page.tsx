import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { getLogisticsStories } from "@/lib/data";
import { Link as I18nLink } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

export default async function StoriesListPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("stories");
  const stories = await getLogisticsStories();

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-800">{t("title")}</h1>
        <p className="mt-1 text-slate-600">{t("subtitle")}</p>

        {stories.length === 0 ? (
          <div className="mt-10 rounded-xl bg-white p-10 text-center text-slate-500 shadow-sm">
            {t("noStories")}
          </div>
        ) : (
          <ul className="mt-8 grid gap-6 sm:grid-cols-2">
            {stories.map((s) => (
              <li key={s.id}>
                <I18nLink
                  href={`/stories/${s.id}`}
                  className="flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                >
                  <div className="h-36 w-40 shrink-0 overflow-hidden bg-slate-100">
                    {s.image_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={s.image_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-4xl text-slate-300">
                        📄
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <h2 className="font-semibold text-slate-800 line-clamp-2">{s.title}</h2>
                    <p className="mt-1 flex-1 text-sm text-slate-600 line-clamp-2">
                      {s.description || t("noSummary")}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      {new Date(s.created_at).toLocaleDateString(locale)}
                    </p>
                  </div>
                </I18nLink>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
