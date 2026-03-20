"use client";

import Link from "next/link";
import { useTranslations, useLocale } from "@/lib/i18n";
import { LEARNING_PATH, VERSION_META, LAYERS } from "@/lib/constants";
import { LayerBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import versionsData from "@/data/generated/versions.json";


const LAYER_DOT_COLORS: Record<string, string> = {
  overview: "bg-blue-500",
  algorithms: "bg-emerald-500",
  architecture: "bg-purple-500",
  experiments: "bg-amber-500",
  timeline: "bg-red-500",
  design: "bg-pink-500",
};

const LAYER_BORDER_COLORS: Record<string, string> = {
  overview: "border-blue-500/30 hover:border-blue-500/60",
  algorithms: "border-emerald-500/30 hover:border-emerald-500/60",
  architecture: "border-purple-500/30 hover:border-purple-500/60",
  experiments: "border-amber-500/30 hover:border-amber-500/60",
  timeline: "border-red-500/30 hover:border-red-500/60",
  design: "border-pink-500/30 hover:border-pink-500/60",
};

const LAYER_BAR_COLORS: Record<string, string> = {
  overview: "bg-blue-500",
  algorithms: "bg-emerald-500",
  architecture: "bg-purple-500",
  experiments: "bg-amber-500",
  timeline: "bg-red-500",
  design: "bg-pink-500",
};

function getVersionData(id: string) {
  return versionsData.versions.find((v) => v.id === id);
}

export default function HomePage() {
  const t = useTranslations("home");
  const locale = useLocale();

  return (
    <div className="flex flex-col gap-20 pb-16">
      {/* Hero Section */}
      <section className="flex flex-col items-center px-2 pt-8 text-center sm:pt-20">
        <h1 className="text-3xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          {t("hero_title")}
        </h1>
        <p className="mt-4 max-w-2xl text-base text-[var(--color-text-secondary)] sm:text-xl">
          {t("hero_subtitle")}
        </p>
        <div className="mt-8">
          <Link
            href={`/${locale}/timeline`}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {t("start")}
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </section>

      {/* Core Pattern Section */}
      <section>
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">{t("core_pattern")}</h2>
          <p className="mt-2 text-[var(--color-text-secondary)]">
            {t("core_pattern_desc")}
          </p>
        </div>
        <div className="mx-auto max-w-2xl overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-2.5">
            <span className="h-3 w-3 rounded-full bg-red-500/70" />
            <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
            <span className="h-3 w-3 rounded-full bg-green-500/70" />
            <span className="ml-3 text-xs text-zinc-500">uocc_system.py</span>
          </div>
          <pre className="overflow-x-auto p-4 text-sm leading-relaxed">
            <code>
              <span className="text-green-400"># 发射端</span>
              {"\n"}
              <span className="text-purple-400">def</span>
              <span className="text-zinc-300"> </span>
              <span className="text-blue-400">transmit</span>
              <span className="text-zinc-500">(</span>
              <span className="text-zinc-300">data</span>
              <span className="text-zinc-500">):</span>
              {"\n"}
              <span className="text-zinc-300">{"    "}encoded = </span>
              <span className="text-blue-400">utf8_encode</span>
              <span className="text-zinc-500">(</span>
              <span className="text-zinc-300">data</span>
              <span className="text-zinc-500">)</span>
              {"\n"}
              <span className="text-zinc-300">{"    "}ook_signal = </span>
              <span className="text-blue-400">ook_modulate</span>
              <span className="text-zinc-500">(</span>
              <span className="text-zinc-300">encoded</span>
              <span className="text-zinc-500">)</span>
              {"\n"}
              <span className="text-zinc-300">{"    "}rll_signal = </span>
              <span className="text-blue-400">rll_encode</span>
              <span className="text-zinc-500">(</span>
              <span className="text-zinc-300">ook_signal</span>
              <span className="text-zinc-500">)</span>
              {"\n"}
              <span className="text-zinc-300">{"    "}</span>
              <span className="text-blue-400">led_drive</span>
              <span className="text-zinc-500">(</span>
              <span className="text-zinc-300">rll_signal</span>
              <span className="text-zinc-500">)</span>
              <span className="text-zinc-500">  </span>
              <span className="text-green-400"># 光信号发射</span>
              {"\n"}
              {"\n"}
              <span className="text-green-400"># 接收端</span>
              {"\n"}
              <span className="text-purple-400">def</span>
              <span className="text-zinc-300"> </span>
              <span className="text-blue-400">receive</span>
              <span className="text-zinc-500">():</span>
              {"\n"}
              <span className="text-zinc-300">{"    "}frame = </span>
              <span className="text-blue-400">camera_capture</span>
              <span className="text-zinc-500">()</span>
              {"\n"}
              <span className="text-zinc-300">{"    "}iso = </span>
              <span className="text-blue-400">adaptive_iso</span>
              <span className="text-zinc-500">(</span>
              <span className="text-zinc-300">frame</span>
              <span className="text-zinc-500">)</span>
              <span className="text-zinc-500">  </span>
              <span className="text-green-400"># 自适应增益</span>
              {"\n"}
              <span className="text-zinc-300">{"    "}ook_bits = </span>
              <span className="text-blue-400">ook_demodulate</span>
              <span className="text-zinc-500">(</span>
              <span className="text-zinc-300">frame</span>
              <span className="text-zinc-500">)</span>
              {"\n"}
              <span className="text-zinc-300">{"    "}data = </span>
              <span className="text-blue-400">utf8_decode</span>
              <span className="text-zinc-500">(</span>
              <span className="text-zinc-300">ook_bits</span>
              <span className="text-zinc-500">)</span>
              {"\n"}
              <span className="text-zinc-300">{"    "}</span>
              <span className="text-purple-400">return</span>
              <span className="text-zinc-300"> data</span>
            </code>
          </pre>
        </div>
      </section>

      {/* Message Flow Visualization */}
      <section>
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">{t("message_flow")}</h2>
          <p className="mt-2 text-[var(--color-text-secondary)]">
            {t("message_flow_desc")}
          </p>
        </div>
        <div className="mx-auto max-w-2xl">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-blue-500/20 px-4 py-2 text-sm">文字输入</div>
                <span className="text-zinc-500">→</span>
                <div className="rounded-lg bg-blue-500/20 px-4 py-2 text-sm">UTF-8 编码</div>
                <span className="text-zinc-500">→</span>
                <div className="rounded-lg bg-blue-500/20 px-4 py-2 text-sm">OOK 调制</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-emerald-500/20 px-4 py-2 text-sm">LED 光信号</div>
                <span className="text-zinc-500">→</span>
                <div className="rounded-lg bg-purple-500/20 px-4 py-2 text-sm">相机采集</div>
                <span className="text-zinc-500">→</span>
                <div className="rounded-lg bg-purple-500/20 px-4 py-2 text-sm">自适应增益</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-amber-500/20 px-4 py-2 text-sm">OOK 解调</div>
                <span className="text-zinc-500">→</span>
                <div className="rounded-lg bg-amber-500/20 px-4 py-2 text-sm">MIMO 合并</div>
                <span className="text-zinc-500">→</span>
                <div className="rounded-lg bg-amber-500/20 px-4 py-2 text-sm">文字输出</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Learning Path Preview */}
      <section>
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">{t("learning_path")}</h2>
          <p className="mt-2 text-[var(--color-text-secondary)]">
            {t("learning_path_desc")}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {LEARNING_PATH.map((versionId) => {
            const meta = VERSION_META[versionId];
            const data = getVersionData(versionId);
            if (!meta || !data) return null;
            return (
              <Link
                key={versionId}
                href={`/${locale}/${versionId}`}
                className="group block"
              >
                <Card
                  className={cn(
                    "h-full border transition-all duration-200",
                    LAYER_BORDER_COLORS[meta.layer]
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <LayerBadge layer={meta.layer}>{versionId}</LayerBadge>
                    <span className="text-xs tabular-nums text-[var(--color-text-secondary)]">
                      {data.loc} {t("loc")}
                    </span>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold group-hover:underline">
                    {meta.title}
                  </h3>
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                    {meta.keyInsight}
                  </p>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Layer Overview */}
      <section>
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">{t("layers_title")}</h2>
          <p className="mt-2 text-[var(--color-text-secondary)]">
            {t("layers_desc")}
          </p>
        </div>
        <div className="flex flex-col gap-3">
          {LAYERS.map((layer) => (
            <div
              key={layer.id}
              className="flex items-center gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4"
            >
              <div
                className={cn(
                  "h-full w-1.5 self-stretch rounded-full",
                  LAYER_BAR_COLORS[layer.id]
                )}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">{layer.label}</h3>
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    {layer.versions.length} {t("versions_in_layer")}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {layer.versions.map((vid) => {
                    const meta = VERSION_META[vid];
                    return (
                      <Link key={vid} href={`/${locale}/${vid}`}>
                        <LayerBadge
                          layer={layer.id}
                          className="cursor-pointer transition-opacity hover:opacity-80"
                        >
                          {vid}: {meta?.title}
                        </LayerBadge>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
