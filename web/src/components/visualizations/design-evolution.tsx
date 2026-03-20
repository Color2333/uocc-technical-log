"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useSteppedVisualization } from "@/hooks/useSteppedVisualization";
import { StepControls } from "@/components/visualizations/shared/step-controls";

const LED_VERSIONS = [
  {
    v: "v1.0",
    label: "TTL 直驱",
    color: "#ef4444",
    issues: ["电流不稳", "LED 寿命短"],
    icon: "⚠",
  },
  {
    v: "v2.0",
    label: "恒流驱动",
    color: "#f59e0b",
    issues: ["散热不足", "热衰减严重"],
    icon: "⚠",
  },
  {
    v: "v3.0",
    label: "双路功率分支",
    color: "#10b981",
    issues: ["10W + 3.3W", "铝基板散热 ✓"],
    icon: "✓",
  },
];

const ALGO_VERSIONS = [
  {
    v: "Stage 1",
    label: "固定参数",
    color: "#ef4444",
    desc: "发射功率/ISO 固定，清水可用，浑浊水崩溃",
    year: "2025-08",
  },
  {
    v: "Stage 2",
    label: "ISO 自适应",
    color: "#3b82f6",
    desc: "Matus 2020 复现，RSSI 反馈调节 ISO，收敛 ~15 帧",
    year: "2025-11",
  },
  {
    v: "Stage 3",
    label: "改进自适应",
    color: "#6366f1",
    desc: "EMA 平滑 + 自适应学习率 + 动量，稳态振荡 ±3%",
    year: "2025-12",
  },
  {
    v: "Stage 4",
    label: "阻尼多状态机",
    color: "#10b981",
    desc: "曝光+ISO 联合控制，四状态 + α=0.3 阻尼，覆盖 0-50 NTU",
    year: "2026-03",
  },
];

const HW_CHOICES = [
  { component: "计算平台", winner: "Jetson Orin NX 8GB", reason: "CUDA + 实时性", color: "#10b981" },
  { component: "发射 MCU", winner: "STM32/ESP32（待定）", reason: "GPIO 精确时序", color: "#f59e0b" },
  { component: "相机", winner: "双目相机（待型号）", reason: "MIMO 空间分集", color: "#3b82f6" },
  { component: "LED", winner: "10W + 3.3W 双路", reason: "远/近距离切换", color: "#6366f1" },
];

const STEP_INFO = [
  { title: "设计演进总览", desc: "三条并行演进线：LED 驱动迭代、算法迭代、硬件选型。" },
  { title: "LED v1.0 — TTL 直驱", desc: "最简单的驱动方案，直接用 MCU GPIO 驱动 LED，电流不稳定导致 LED 提前老化。" },
  { title: "LED v2.0 — 恒流驱动", desc: "加入恒流驱动 IC，解决电流稳定性，但大功率工况下散热成为瓶颈。" },
  { title: "LED v3.0 — 双路功率（定型）", desc: "10W 远距离 + 3.3W 近距离双路独立控制，铝基板+风扇散热，电路已定型。✅" },
  { title: "算法 Stage 1-2", desc: "从固定参数到 Matus 2020 ISO 自适应，解决轻度浑浊场景的基础问题。" },
  { title: "算法 Stage 3-4", desc: "EMA+动量改进后，进一步引入阻尼多状态机，将覆盖范围扩展到 50 NTU 重度浑浊。" },
  { title: "硬件选型决策", desc: "各组件的选型理由——以 CUDA 实时性和 MIMO 分集为核心驱动。" },
  { title: "演进路径总结", desc: "每次迭代都由实测问题驱动，形成「问题 → 方案 → 验证」闭环。" },
];

export default function DesignEvolution({ title }: { title?: string }) {
  const { currentStep, totalSteps, next, prev, reset, isPlaying, toggleAutoPlay } =
    useSteppedVisualization({ totalSteps: 8, autoPlayInterval: 3200 });

  const ledShown = Math.min(3, [0, 1, 2, 3, 3, 3, 3, 3][currentStep]);
  const algoShown = Math.min(4, [0, 0, 0, 0, 2, 4, 4, 4][currentStep]);
  const showHw = currentStep >= 6;
  const showSummary = currentStep === 7;

  return (
    <section className="min-h-[500px] space-y-4">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        {title || "设计演进"}
      </h2>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900 space-y-4">
        <div className="font-mono text-xs text-zinc-400 dark:text-zinc-500">
          Iterative Design — Problem-Driven Evolution
        </div>

        {/* LED driver evolution */}
        {ledShown > 0 && (
          <div>
            <div className="mb-2 font-mono text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              LED 驱动迭代
            </div>
            <div className="flex flex-wrap gap-2">
              {LED_VERSIONS.slice(0, ledShown).map((v, i) => (
                <motion.div
                  key={v.v}
                  className="flex-1 min-w-[100px] rounded-lg border p-2.5"
                  style={{ borderColor: v.color + "60", background: v.color + "0f" }}
                  initial={{ opacity: 0, scale: 0.9, x: -10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.1 }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="font-mono text-[9px] font-bold" style={{ color: v.color }}>{v.v}</span>
                    <span className="text-[9px]" style={{ color: v.color }}>{v.icon}</span>
                  </div>
                  <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">{v.label}</div>
                  {v.issues.map((issue) => (
                    <div key={issue} className="font-mono text-[9px] text-zinc-500">
                      {v.v === "v3.0" ? "• " : "✗ "}{issue}
                    </div>
                  ))}
                </motion.div>
              ))}

              {/* Arrow between versions */}
              {ledShown > 1 && (
                <div className="hidden sm:flex items-center text-zinc-400 text-sm">→</div>
              )}
            </div>
          </div>
        )}

        {/* Algorithm evolution */}
        {algoShown > 0 && (
          <div>
            <div className="mb-2 font-mono text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              算法迭代
            </div>
            <div className="relative">
              <div className="absolute left-[38px] top-3 bottom-3 w-px bg-zinc-200 dark:bg-zinc-700" />
              <div className="space-y-2">
                {ALGO_VERSIONS.slice(0, algoShown).map((a, i) => (
                  <motion.div
                    key={a.v}
                    className="flex items-start gap-3"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.08 }}
                  >
                    <div className="w-[36px] flex-shrink-0 text-right font-mono text-[8px] text-zinc-400 pt-0.5">
                      {a.year.slice(2)}
                    </div>
                    <div className="relative z-10 mt-1 flex-shrink-0 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-zinc-900"
                      style={{ backgroundColor: a.color }} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[9px] font-bold" style={{ color: a.color }}>{a.v}</span>
                        <span className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">{a.label}</span>
                      </div>
                      <div className="font-mono text-[9px] text-zinc-500">{a.desc}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Hardware choices */}
        <AnimatePresence>
          {showHw && (
            <motion.div
              key="hw"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="mb-2 font-mono text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                硬件选型
              </div>
              <div className="grid grid-cols-2 gap-2">
                {HW_CHOICES.map((h, i) => (
                  <motion.div
                    key={h.component}
                    className="rounded-lg border p-2"
                    style={{ borderColor: h.color + "40", background: h.color + "0a" }}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25, delay: i * 0.07 }}
                  >
                    <div className="font-mono text-[8px] text-zinc-500 mb-0.5">{h.component}</div>
                    <div className="text-[10px] font-bold" style={{ color: h.color }}>{h.winner}</div>
                    <div className="font-mono text-[8px] text-zinc-400">{h.reason}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Summary */}
        <AnimatePresence>
          {showSummary && (
            <motion.div
              key="summary"
              className="rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="font-mono text-[10px] font-bold text-blue-500 mb-2">设计原则</div>
              <div className="space-y-1">
                {[
                  "问题驱动：每次迭代由实测失败模式触发",
                  "渐进式：每版本兼容前版本测试用例",
                  "仿真先行：硬件联调前完成算法仿真验证",
                ].map((p) => (
                  <div key={p} className="font-mono text-[9px] text-blue-400">→ {p}</div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <StepControls
        currentStep={currentStep}
        totalSteps={totalSteps}
        onPrev={prev}
        onNext={next}
        onReset={reset}
        isPlaying={isPlaying}
        onToggleAutoPlay={toggleAutoPlay}
        stepTitle={STEP_INFO[currentStep].title}
        stepDescription={STEP_INFO[currentStep].desc}
      />
    </section>
  );
}
