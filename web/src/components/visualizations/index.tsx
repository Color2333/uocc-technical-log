"use client";

import { lazy, Suspense } from "react";
import { useTranslations } from "@/lib/i18n";

const visualizations: Record<
  string,
  React.LazyExoticComponent<React.ComponentType<{ title?: string }>> | null
> = {
  // Graduation project visualizations
  u01: lazy(() => import("./system-overview")),       // 系统概览：自适应闭环
  u02: lazy(() => import("./ook-modulation")),         // OOK 调制解调
  u03: lazy(() => import("./rll-encoding")),           // RLL 4B6B 编码
  u04: lazy(() => import("./adaptive-iso")),           // Adaptive ISO control
  u05: lazy(() => import("./damped-state-machine")),   // Damped state machine
  u06: lazy(() => import("./mimo-combining")),         // MIMO combining
  u07: lazy(() => import("./transmitter-circuit")),    // 发射端电路设计（光耦+P-MOS）
  u08: lazy(() => import("./hardware-pipeline")),      // 接收端全链路
  u09: lazy(() => import("./cuda-acceleration")),    // CUDA 并行加速
  u10: lazy(() => import("./experiment-phases")),    // 实验阶段总览
  u11: lazy(() => import("./progress-tracker")),     // 进度追踪时间线
  u12: lazy(() => import("./design-evolution")),     // 设计演进迭代
};

export function SessionVisualization({ version }: { version: string }) {
  const t = useTranslations("viz");
  const Component = visualizations[version];
  if (!Component) return null;
  return (
    <Suspense
      fallback={
        <div className="min-h-[500px] animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
      }
    >
      <div className="min-h-[500px]">
        <Component title={t(version)} />
      </div>
    </Suspense>
  );
}
