"use client";

import { useMemo } from "react";
import { useLocale } from "@/lib/i18n";
import docsData from "@/data/generated/docs.json";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import rehypeStringify from "rehype-stringify";
import { DiagramProvider } from "@/components/docs/diagrams/diagram-provider";
import { remarkDiagramPlugin } from "@/plugins/remark-diagram";

interface DocRendererProps {
  version: string;
}

const ASCII_DIAGRAM_VERSIONS = ["u01", "u02", "u03", "u04", "u05", "u06", "u07", "u08"];

function stripAsciiDiagrams(content: string): string {
  return content.replace(
    /^```\n([┌┐└├┤─│▼►├┼┤└┘■□▪▫\s\S]{10,})```\n/gm,
    ""
  );
}

function renderMarkdown(md: string): string {
  const result = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkDiagramPlugin)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeHighlight, { detect: false, ignoreMissing: true })
    .use(rehypeStringify)
    .processSync(md);
  return String(result);
}

function postProcessHtml(html: string): string {
  html = html.replace(
    /<pre><code class="hljs language-(\w+)">/g,
    '<pre class="code-block" data-language="$1"><code class="hljs language-$1">'
  );
  html = html.replace(
    /<pre><code(?! class="hljs)([^>]*)>/g,
    '<pre class="ascii-diagram"><code$1>'
  );
  html = html.replace(
    /<blockquote>/,
    '<blockquote class="hero-callout">'
  );
  html = html.replace(/<h1>.*?<\/h1>\n?/, "");
  html = html.replace(
    /<ol start="(\d+)">/g,
    (_, start) => `<ol style="counter-reset:step-counter ${parseInt(start) - 1}">`
  );
  return html;
}

export function DocRenderer({ version }: DocRendererProps) {
  const locale = useLocale();

  const doc = useMemo(() => {
    const match = docsData.find(
      (d: { version: string; locale: string }) =>
        d.version === version && d.locale === locale
    );
    if (match) return match;
    return (
      docsData.find(
        (d: { version: string; locale: string }) =>
          d.version === version && d.locale === "zh"
      ) ||
      docsData.find(
        (d: { version: string; locale: string }) =>
          d.version === version && d.locale === "en"
      )
    );
  }, [version, locale]);

  if (!doc) return null;

  const html = useMemo(() => {
    const content = ASCII_DIAGRAM_VERSIONS.includes(version)
      ? stripAsciiDiagrams(doc.content)
      : doc.content;
    const raw = renderMarkdown(content);
    return postProcessHtml(raw);
  }, [doc.content, version]);

  return (
    <div className="py-4">
      <DiagramProvider>
        <div
          className="prose-custom"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </DiagramProvider>
    </div>
  );
}
