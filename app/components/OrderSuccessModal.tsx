"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, MessageCircle, Package } from "lucide-react";
import { getOrderLabel, type ContactContext } from "@/lib/contact";
import ContactChannelSelector from "./ContactChannelSelector";

type OrderSuccessModalProps = {
  open: boolean;
  onClose: () => void;
  orderId: string;
  trackingNumber?: string | null;
  shippingFee: number;
};

export default function OrderSuccessModal({
  open,
  onClose,
  orderId,
  trackingNumber,
  shippingFee,
}: OrderSuccessModalProps) {
  const router = useRouter();
  const [contactSelectorOpen, setContactSelectorOpen] = useState(false);
  const ctx: ContactContext = { orderId, trackingNumber };
  const orderLabel = getOrderLabel(ctx);

  if (!open) return null;

  const goToOrderDetail = () => {
    onClose();
    router.push(`/dashboard/orders/${orderId}`);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-success-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-8 w-8 text-green-600" aria-hidden />
          </div>
          <h2 id="order-success-title" className="mt-4 text-xl font-bold text-slate-800">
            订单已保存
          </h2>

          <div className="mt-6 space-y-3 rounded-xl bg-slate-50 p-4 text-left">
            <p className="flex items-center gap-2 text-slate-700">
              <Package className="h-4 w-4 shrink-0 text-slate-500" />
              <span>单号：</span>
              <span className="font-mono font-medium">{orderLabel}</span>
            </p>
            <p className="text-slate-700">
              预估运费：<span className="font-semibold text-[#1e3a8a]">¥{shippingFee.toFixed(2)}</span>
            </p>
          </div>

          <p className="mt-4 text-sm text-amber-800">
            订单已记录，请联系客服确认货物详情并获取仓库地址。
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={goToOrderDetail}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-4 py-3 font-medium text-white hover:bg-[#1d4ed8]"
            >
              <Package className="h-5 w-5" />
              前往订单中心
            </button>
            <button
              type="button"
              onClick={() => setContactSelectorOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#2563eb] bg-white px-4 py-3 font-medium text-[#2563eb] hover:bg-[#2563eb]/5"
            >
              <MessageCircle className="h-5 w-5" />
              咨询在线客服
            </button>
            <ContactChannelSelector
              open={contactSelectorOpen}
              onClose={() => setContactSelectorOpen(false)}
              contactContext={ctx}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
