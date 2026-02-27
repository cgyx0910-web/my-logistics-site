import Link from "next/link";
import { getLogisticsStories } from "@/lib/data";

export default async function StoriesListPage() {
  const stories = await getLogisticsStories();

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-800">物流故事</h1>
        <p className="mt-1 text-slate-600">客户真实寄递故事与避坑指南</p>

        {stories.length === 0 ? (
          <div className="mt-10 rounded-xl bg-white p-10 text-center text-slate-500 shadow-sm">
            暂无故事，敬请期待
          </div>
        ) : (
          <ul className="mt-8 grid gap-6 sm:grid-cols-2">
            {stories.map((s) => (
              <li key={s.id}>
                <Link
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
                      {s.description || "暂无摘要"}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      {new Date(s.created_at).toLocaleDateString("zh-CN")}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
