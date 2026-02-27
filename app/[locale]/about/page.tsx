import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { getSiteSettings } from "@/lib/data";
import { Link } from "@/i18n/navigation";

const DEFAULT_INTRO =
  "我们致力于为跨境卖家与个人用户提供一站式集运与物流解决方案，覆盖台湾、泰国、柬埔寨、马来西亚、印尼等市场，让您的货物安全、高效送达。";
const DEFAULT_MISSION =
  "以专业、可靠、省心为服务宗旨，持续优化运输时效与成本，助力每一位客户轻松跨境。";

type Props = { params: Promise<{ locale: string }> };

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");
  const settings = await getSiteSettings();

  const heroImage = settings.about_hero_image?.trim() || undefined;
  const title = settings.about_title?.trim() || t("title");
  const subtitle = settings.about_subtitle?.trim() || t("defaultSubtitle");
  const intro = settings.about_intro?.trim() || DEFAULT_INTRO;
  const mission = settings.about_mission?.trim() || DEFAULT_MISSION;
  const image2 = settings.about_image_2?.trim() || undefined;
  const contactText = settings.about_contact?.trim() || undefined;
  const whatsappLink = settings.whatsapp_link?.trim() || undefined;

  return (
    <main className="min-h-screen bg-slate-50">
      <section
        className="relative overflow-hidden bg-[#1e3a8a] px-4 py-16 sm:py-20 md:py-24"
        style={
          heroImage
            ? {
                backgroundImage: `url(${heroImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        {!heroImage && (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1e3a8a] via-[#2563eb] to-[#1e40af]" />
        )}
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative mx-auto max-w-4xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-sm sm:text-4xl md:text-5xl">
            {title}
          </h1>
          <p className="mt-4 text-lg text-white/95 sm:text-xl">{subtitle}</p>
          <Link
            href="/"
            className="mt-8 inline-block rounded-lg bg-white/20 px-5 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/30"
          >
            {t("backHome")}
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <div className="rounded-2xl bg-white p-8 shadow-sm sm:p-10">
          <h2 className="text-xl font-bold text-slate-800 sm:text-2xl">{t("companyIntro")}</h2>
          <p className="mt-4 whitespace-pre-line text-slate-600 leading-relaxed">
            {intro}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:gap-12">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-slate-800 sm:text-2xl">{t("mission")}</h2>
            <p className="mt-4 whitespace-pre-line text-slate-600 leading-relaxed">
              {mission}
            </p>
          </div>
          {image2 && (
            <div className="shrink-0 md:w-80">
              <div className="aspect-[4/3] overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image2}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {(contactText || whatsappLink) && (
        <section className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
          <div className="rounded-2xl bg-white p-8 shadow-sm sm:p-10">
            <h2 className="text-xl font-bold text-slate-800 sm:text-2xl">{t("contact")}</h2>
            {contactText && (
              <p className="mt-4 whitespace-pre-line text-slate-600 leading-relaxed">
                {contactText}
              </p>
            )}
            {whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#20BD5A]"
              >
                {t("contactWhatsApp")}
              </a>
            )}
          </div>
        </section>
      )}

      <div className="mx-auto max-w-3xl px-4 pb-16 pt-4">
        <Link
          href="/"
          className="text-sm font-medium text-[#1e3a8a] hover:underline"
        >
          {t("backHomeLink")}
        </Link>
      </div>
    </main>
  );
}
