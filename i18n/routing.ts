import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["zh-CN", "zh-HK", "en"],
  defaultLocale: "zh-CN",
  localePrefix: "always",
});
