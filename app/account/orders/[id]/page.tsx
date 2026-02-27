"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/** 订单详情已迁移至 /dashboard/orders/[id]，保留旧链接重定向 */
export default function AccountOrderRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  useEffect(() => {
    if (id) router.replace(`/dashboard/orders/${id}`);
  }, [id, router]);

  return null;
}
