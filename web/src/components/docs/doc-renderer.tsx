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

const ASCII_DIAGRAM_VERSIONS = ["u01", "u02", "u03", "u04", "u05", "u06", "u07", "u08", "u09", "u10", "u11", "u12"];

// Mapping from doc file path → version ID (derived from docs/_meta.json)
const DOC_PATH_TO_VERSION: Record<string, string> = {
  "index.md":                        "u01",
  "algorithms/ook-modulation.md":    "u02",
  "algorithms/rll-encoding.md":      "u03",
  "algorithms/adaptive-iso.md":      "u04",
  "algorithms/damped-state-machine.md": "u05",
  "algorithms/mimo-combining.md":    "u06",
  "architecture/transmitter.md":     "u07",
  "architecture/receiver.md":        "u08",
  "architecture/cuda-acceleration.md": "u09",
  "experiments/index.md":            "u10",
  "timeline/progress.md":            "u11",
  "design/index.md":                 "u12",
};

const VERSION_TO_DOC_DIR: Record<string, string> = {
  u01: "",
  u02: "algorithms/",
  u03: "algorithms/",
  u04: "algorithms/",
  u05: "algorithms/",
  u06: "algorithms/",
  u07: "architecture/",
  u08: "architecture/",
  u09: "architecture/",
  u10: "experiments/",
  u11: "timeline/",
  u12: "design/",
};

/** Resolve a relative .md href (from a given version's doc dir) to a version id */
function resolveDocHref(href: string, fromVersion: string): string | null {
  const docDir = VERSION_TO_DOC_DIR[fromVersion] ?? "";
  // Normalise the raw href to a canonical doc-relative path
  const combined = docDir + href;  // e.g. "algorithms/./damped-state-machine.md"
  const parts = combined.split("/");
  const resolved: string[] = [];
  for (const part of parts) {
    if (part === "..") resolved.pop();
    else if (part !== ".") resolved.push(part);
  }
  const docPath = resolved.join("/");
  return DOC_PATH_TO_VERSION[docPath] ?? null;
}

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

function postProcessHtml(html: string, version: string, locale: string): string {
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
  // Rewrite cross-doc .md links to proper app routes (e.g. ./damped-state-machine.md → /zh/u05)
  html = html.replace(
    /href="([^"]*\.md)"/g,
    (match, href) => {
      const targetVersion = resolveDocHref(href, version);
      if (targetVersion) {
        return `href="/${locale}/${targetVersion}"`;
      }
      // Fallback: neutralise the link so it doesn't cause a 404
      return `href="#" title="${href}"`;
    }
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
    return postProcessHtml(raw, version, locale);
  }, [doc.content, version, locale]);

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
