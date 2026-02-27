"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";

/** 个人中心已迁移至 /dashboard，保留 /account 重定向 */
export default function AccountPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);
  return null;
}
