import { notFound } from "next/navigation";
import Link from "next/link";
import { getLogisticsStory } from "@/lib/data";
import StoryContent from "./StoryContent";
import { ChevronLeft } from "lucide-react";

export default async function StoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const story = await getLogisticsStory(id);
  if (!story) notFound();

  return (
    <main className="min-h-screen bg-slate-50">
      <article className="mx-auto max-w-3xl px-4 py-8">
        <Link
          href="/stories"
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-800"
        >
          <ChevronLeft className="h-4 w-4" />
          返回列表
        </Link>

        {story.image_url && (
          <div className="mt-6 aspect-video w-full overflow-hidden rounded-xl bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={story.image_url}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <header className="mt-6">
          <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">{story.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            {(story.tags ?? []).length > 0 && (
              <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-slate-600">
                {(story.tags ?? [])[0]}
              </span>
            )}
            <time dateTime={story.created_at}>
              {new Date(story.created_at).toLocaleDateString("zh-CN")}
            </time>
          </div>
        </header>

        {story.description && (
          <p className="mt-4 text-slate-600">{story.description}</p>
        )}

        {story.content && (
          <div className="mt-6 border-t border-slate-200 pt-6">
            <StoryContent content={story.content} />
          </div>
        )}
      </article>
    </main>
  );
}
