"use client";

import { useMemo } from "react";
import { useLocale } from "@/lib/i18n";
import docsData from "@/data/generated/docs.json";
import { SourceViewer } from "@/components/code/source-viewer";

interface VersionCodeTabProps {
  version: string;
}

interface DocEntry {
  version: string;
  locale: string;
  title: string;
  content: string;
}

function extractCodeBlocks(content: string): { language: string; code: string; filename: string }[] {
  const blocks: { language: string; code: string; filename: string }[] = [];
  const regex = /```(\w+)\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const lang = match[1];
    const code = match[2].trimEnd();
    let filename = "code.py";
    if (lang === "python") filename = "main.py";
    else if (lang === "cuda") filename = "kernel.cu";
    else if (lang === "c") filename = "main.c";
    blocks.push({ language: lang, code, filename });
  }
  return blocks;
}

export function VersionCodeTab({ version }: VersionCodeTabProps) {
  const locale = useLocale();

  const doc = useMemo(() => {
    const match = (docsData as DocEntry[]).find(
      (d) => d.version === version && d.locale === locale
    );
    if (match) return match;
    return (docsData as DocEntry[]).find(
      (d) => d.version === version && d.locale === "en"
    );
  }, [version, locale]);

  const codeBlocks = useMemo(() => {
    if (!doc) return [];
    return extractCodeBlocks(doc.content);
  }, [doc]);

  if (!doc) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-8 text-center">
        <p className="text-[var(--color-text-secondary)]">暂无代码内容</p>
      </div>
    );
  }

  if (codeBlocks.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-8 text-center">
        <p className="text-[var(--color-text-secondary)]">该章节暂无代码实现</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {codeBlocks.map((block, i) => (
        <SourceViewer key={i} source={block.code} filename={block.filename} />
      ))}
    </div>
  );
}
