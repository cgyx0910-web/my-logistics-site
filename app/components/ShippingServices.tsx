import { Plane, Ship, Package } from "lucide-react";

const SERVICES = [
  {
    id: "air",
    title: "空运特快",
    desc: "时效 3-5 天，适合小件、急件。",
    icon: Plane,
    iconBg: "bg-blue-100 text-blue-600",
  },
  {
    id: "sea-bulk",
    title: "海运普货",
    desc: "时效 12-15 天，价格极低，适合大宗家具、家电。",
    icon: Ship,
    iconBg: "bg-emerald-100 text-emerald-600",
  },
  {
    id: "sea-parcel",
    title: "海运小包",
    desc: "适合 20kg 以下非紧急包裹。",
    icon: Package,
    iconBg: "bg-amber-100 text-amber-600",
  },
] as const;

export default function ShippingServices() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <h2 className="text-center text-2xl font-bold text-slate-800 sm:text-3xl">
        运输服务介绍
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-center text-slate-600">
        多种渠道可选，满足不同时效与预算需求
      </p>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className="flex flex-col rounded-2xl bg-white p-6 shadow-md transition hover:shadow-lg sm:p-8"
            >
              <div
                className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${item.iconBg}`}
                aria-hidden
              >
                <Icon className="h-6 w-6" strokeWidth={2} />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-800">
                {item.title}
              </h3>
              <p className="mt-2 flex-1 text-slate-600 leading-relaxed">
                {item.desc}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
