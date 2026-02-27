"use client";

/**
 * 简单 Markdown 渲染：**粗体**、## 标题、- 列表、换行
 * 先转义 HTML 再应用规则，避免 XSS
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function simpleMarkdownToHtml(content: string): string {
  const escaped = escapeHtml(content);
  const lines = escaped.split("\n");
  const out: string[] = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith("## ")) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      out.push(`<h2 class="mt-6 mb-2 text-lg font-bold text-slate-800">${trimmed.slice(3)}</h2>`);
      continue;
    }

    if (trimmed.startsWith("- ")) {
      if (!inList) {
        out.push("<ul class=\"list-disc pl-6 space-y-1 my-2\">");
        inList = true;
      }
      out.push(`<li>${trimmed.slice(2)}</li>`);
      continue;
    }

    if (inList) {
      out.push("</ul>");
      inList = false;
    }

    if (trimmed === "") {
      out.push("<br />");
      continue;
    }

    let para = trimmed;
    para = para.replace(/\*\*(.+?)\*\*/g, "<strong class=\"font-semibold text-slate-800\">$1</strong>");
    out.push(`<p class="my-2 leading-relaxed text-slate-700">${para}</p>`);
  }

  if (inList) out.push("</ul>");
  return out.join("\n");
}

export default function StoryContent({ content }: { content: string }) {
  const html = simpleMarkdownToHtml(content);
  return (
    <div
      className="prose prose-slate max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
