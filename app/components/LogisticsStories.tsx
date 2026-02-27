"use client";

import { useTranslations, useLocale } from "next-intl";
import type { LogisticsStoryRow } from "@/types/database";
import { Link as I18nLink } from "@/i18n/navigation";

export interface LogisticsStoriesProps {
  stories: LogisticsStoryRow[];
}

function scrollToCalculator() {
  const el = document.getElementById("freight-calculator");
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function LogisticsStories({ stories }: LogisticsStoriesProps) {
  const t = useTranslations("stories");
  const locale = useLocale();
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white px-4 py-14 sm:py-16 md:py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(148,163,184,0.06),transparent)]" />
      <div className="relative mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
            {t("sectionLabel")}
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl md:text-4xl">
            {t("sectionTitle")}
          </h2>
          <p className="mt-3 max-w-xl mx-auto text-base text-slate-600 sm:text-lg">
            {t("sectionDesc")}
          </p>
        </div>

        {stories.length > 0 ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {stories.map((story) => (
              <I18nLink
                key={story.id}
                href={`/stories/${story.id}`}
                className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60 transition-all duration-300 hover:shadow-lg hover:ring-slate-300/80"
              >
                {/* 封面图或占位 */}
                <div
                  className={`relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden ${!story.image_url ? (story.placeholder_bg ?? "bg-slate-100") : ""} transition-transform duration-300 group-hover:scale-[1.02]`}
                >
                  {story.image_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={story.image_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : story.placeholder_icon ? (
                    <span className="text-5xl opacity-80" aria-hidden>
                      {story.placeholder_icon}
                    </span>
                  ) : (
                    <span className="text-5xl opacity-80" aria-hidden>
                      📦
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <h3 className="text-lg font-bold leading-snug text-slate-800">
                    {story.title}
                  </h3>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600 line-clamp-2">
                    {story.description || t("noSummary")}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(story.tags ?? []).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-slate-400">
                    {new Date(story.created_at).toLocaleDateString(locale)}
                  </p>
                </div>
              </I18nLink>
            ))}
          </div>
        ) : (
          <div className="mt-10 flex flex-col items-center justify-center rounded-2xl bg-white py-16 shadow-sm ring-1 ring-slate-200/60">
            <p className="text-lg font-medium text-slate-600">
              {t("noStories")}
            </p>
          </div>
        )}

        <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
          {stories.length > 0 && (
            <I18nLink
              href="/stories"
              className="rounded-xl border-2 border-slate-300 px-6 py-3.5 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {t("moreStories")}
            </I18nLink>
          )}
          <button
            type="button"
            onClick={scrollToCalculator}
            className="rounded-xl bg-gradient-to-r from-[#2563eb] to-[#1e40af] px-6 py-3.5 font-semibold text-white shadow-md transition hover:from-[#1d4ed8] hover:to-[#1e3a8a] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2"
          >
            {t("cta")}
          </button>
        </div>
      </div>
    </section>
  );
}
