"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslations, useLocale } from "@/lib/i18n";
import { LEARNING_PATH, VERSION_META, LAYERS } from "@/lib/constants";
import { LayerBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const LAYER_DOT_BG: Record<string, string> = {
  overview: "bg-blue-500",
  algorithms: "bg-emerald-500",
  architecture: "bg-purple-500",
  experiments: "bg-amber-500",
  timeline: "bg-red-500",
  design: "bg-pink-500",
};

const LAYER_LINE_BG: Record<string, string> = {
  overview: "bg-blue-500/30",
  algorithms: "bg-emerald-500/30",
  architecture: "bg-purple-500/30",
  experiments: "bg-amber-500/30",
  timeline: "bg-red-500/30",
  design: "bg-pink-500/30",
};

const LAYER_BAR_BG: Record<string, string> = {
  overview: "bg-blue-500",
  algorithms: "bg-emerald-500",
  architecture: "bg-purple-500",
  experiments: "bg-amber-500",
  timeline: "bg-red-500",
  design: "bg-pink-500",
};

const CHAPTER_STATUS: Record<string, "done" | "active" | "planned"> = {
  u01: "done", u02: "done", u03: "done", u04: "done",
  u05: "done", u06: "done", u07: "done", u08: "done",
  u09: "active", u10: "planned", u11: "planned", u12: "planned",
};

const STATUS_CONFIG = {
  done:   { label: "已完成",  dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
  active: { label: "进行中",  dot: "bg-amber-500",    text: "text-amber-600 dark:text-amber-400" },
  planned: { label: "待开始", dot: "bg-zinc-400",     text: "text-zinc-400" },
};

const TOP_PRIORITIES = [
  { priority: "P0", task: "端到端硬件联调", deadline: "4月中", reason: "没有端到端无法答辩" },
  { priority: "P0", task: "浑浊水信道实验", deadline: "4月底", reason: "核心创新点的唯一验证" },
  { priority: "P1", task: "CUDA 加速移植", deadline: "4月初", reason: "满足实时性要求" },
  { priority: "P2", task: "阻尼多状态机调参", deadline: "3月底", reason: "改善自适应效果" },
];

export function Timeline() {
  const t = useTranslations("timeline");
  const locale = useLocale();

  const doneCount = Object.values(CHAPTER_STATUS).filter(s => s === "done").length;
  const activeCount = Object.values(CHAPTER_STATUS).filter(s => s === "active").length;
  const plannedCount = Object.values(CHAPTER_STATUS).filter(s => s === "planned").length;
  const progressPercent = Math.round((doneCount / LEARNING_PATH.length) * 100);

  return (
    <div className="flex flex-col gap-12">
      <div>
        <h3 className="mb-3 text-sm font-medium text-[var(--color-text-secondary)]">
          {t("layer_legend")}
        </h3>
        <div className="flex flex-wrap gap-2">
          {LAYERS.map((layer) => (
            <div key={layer.id} className="flex items-center gap-1.5">
              <span className={cn("h-3 w-3 rounded-full", LAYER_DOT_BG[layer.id])} />
              <span className="text-xs font-medium">{layer.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative">
        {LEARNING_PATH.map((versionId, index) => {
          const meta = VERSION_META[versionId];
          if (!meta) return null;

          const isLast = index === LEARNING_PATH.length - 1;
          const status = CHAPTER_STATUS[versionId] ?? "planned";
          const statusCfg = STATUS_CONFIG[status];

          return (
            <div key={versionId} className="relative flex gap-4 pb-8 sm:gap-6">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-[var(--color-bg)] sm:h-10 sm:w-10",
                    LAYER_DOT_BG[meta.layer]
                  )}
                >
                  <span className="text-[10px] font-bold text-white sm:text-xs">
                    {versionId}
                  </span>
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      "w-0.5 flex-1",
                      LAYER_LINE_BG[
                        VERSION_META[LEARNING_PATH[index + 1]]?.layer || meta.layer
                      ]
                    )}
                  />
                )}
              </div>

              <div className="flex-1 pb-2">
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 transition-colors hover:border-[var(--color-text-secondary)]/30 sm:p-5"
                >
                  <div className="flex flex-wrap items-start gap-2">
                    <LayerBadge layer={meta.layer}>{versionId}</LayerBadge>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium",
                        statusCfg.dot,
                        status === "done" && "text-white",
                        status === "active" && "text-white",
                        status === "planned" && "text-zinc-700"
                      )}
                    >
                      {statusCfg.label}
                    </span>
                  </div>

                  <h3 className="mt-2 text-base font-semibold sm:text-lg">
                    {meta.title}
                    <span className="ml-2 text-sm font-normal text-[var(--color-text-secondary)]">
                      {meta.subtitle}
                    </span>
                  </h3>

                  {meta.keyInsight && (
                    <p className="mt-3 text-sm italic text-[var(--color-text-secondary)]">
                      &ldquo;{meta.keyInsight}&rdquo;
                    </p>
                  )}

                  <Link
                    href={`/${locale}/${versionId}`}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                  >
                    {t("learn_more")}
                    <span aria-hidden="true">&rarr;</span>
                  </Link>
                </motion.div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <h3 className="mb-4 text-lg font-semibold">{t("loc_growth")}</h3>
          <div className="space-y-3">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
              const count =
                key === "done" ? doneCount
                : key === "active" ? activeCount
                : plannedCount;
              const pct = Math.round((count / LEARNING_PATH.length) * 100);
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", cfg.dot)} />
                  <span className="w-16 shrink-0 text-xs text-[var(--color-text-secondary)]">
                    {cfg.label}
                  </span>
                  <div className="flex-1">
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${pct}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className={cn("h-full rounded-full", cfg.dot)}
                      />
                    </div>
                  </div>
                  <span className={cn("w-10 text-right text-xs font-medium tabular-nums", cfg.text)}>
                    {count}/{LEARNING_PATH.length}
                  </span>
                </div>
              );
            })}

            <div className="mt-4 flex items-baseline gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
              <span className="text-2xl font-bold">{progressPercent}%</span>
              <span className="text-sm text-[var(--color-text-secondary)]">毕设内容已完成</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-lg font-semibold">剩余工作优先级</h3>
          <div className="space-y-2">
            {TOP_PRIORITIES.map((item, i) => (
              <motion.div
                key={item.task}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.06 }}
                className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3"
              >
                <span
                  className={cn(
                    "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold",
                    item.priority === "P0" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                    item.priority === "P1" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                    item.priority === "P2" && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  )}
                >
                  {item.priority}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.task}</p>
                  <p className="truncate text-xs text-[var(--color-text-secondary)]">
                    {item.reason}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-[var(--color-text-secondary)]">
                  {item.deadline}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
