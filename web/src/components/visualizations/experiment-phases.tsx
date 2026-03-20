"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useSteppedVisualization } from "@/hooks/useSteppedVisualization";
import { StepControls } from "@/components/visualizations/shared/step-controls";

interface Phase {
  id: string;
  label: string;
  env: string;
  goal: string;
  status: "done" | "setup" | "pending";
  color: string;
  metrics?: { label: string; value: string; color: string }[];
}

const PHASES: Phase[] = [
  {
    id: "p0",
    label: "Phase 0",
    env: "ISO/Gain 标定",
    goal: "相机参数摸底",
    status: "done",
    color: "#10b981",
    metrics: [
      { label: "Gain=0", value: "ISO~100 低噪声", color: "#10b981" },
      { label: "Gain=62", value: "ISO~400 均衡", color: "#3b82f6" },
      { label: "Gain=75", value: "ISO~600 高增益", color: "#f59e0b" },
    ],
  },
  {
    id: "p1",
    label: "Phase 1",
    env: "空气信道",
    goal: "基准性能测试",
    status: "done",
    color: "#3b82f6",
    metrics: [
      { label: "BER@1m", value: "< 10⁻⁶ ✓", color: "#10b981" },
      { label: "BER@3m", value: "< 10⁻⁴ ✓", color: "#10b981" },
      { label: "延迟", value: "< 50ms ✓", color: "#10b981" },
    ],
  },
  {
    id: "p2",
    label: "Phase 2",
    env: "清水信道",
    goal: "无浑浊干扰验证",
    status: "setup",
    color: "#6366f1",
    metrics: [
      { label: "水箱", value: "60×30×30cm 亚克力", color: "#6366f1" },
      { label: "距离", value: "3m", color: "#6366f1" },
      { label: "状态", value: "Setup 中…", color: "#f59e0b" },
    ],
  },
  {
    id: "p3",
    label: "Phase 3",
    env: "浑浊水信道",
    goal: "自适应能力验证",
    status: "pending",
    color: "#ec4899",
    metrics: [
      { label: "5 NTU", value: "~0.5ml/L 牛奶", color: "#ec4899" },
      { label: "20 NTU", value: "~2ml/L 牛奶", color: "#ec4899" },
      { label: "50 NTU", value: "~5ml/L 牛奶", color: "#ec4899" },
    ],
  },
];

const STEP_INFO = [
  { title: "实验规划", desc: "四阶段实验设计：从标定到实际水下通信验证。" },
  { title: "Phase 0 — ISO 标定", desc: "室内固定场景，三组 Gain 值（0/62/75）拍摄对比，确定 STATE_PARAMS 映射。" },
  { title: "Phase 0 结果", desc: "Gain=0 对应 STABLE，Gain=62 对应 LOW，Gain=75 接近 HIGH 状态参数。" },
  { title: "Phase 1 — 空气信道", desc: "室内空气，1m/3m/5m 三个距离，建立无水介质基准 BER 曲线。" },
  { title: "Phase 1 结果", desc: "1m BER < 10⁻⁶，3m BER < 10⁻⁴，端到端延迟 < 50ms，全部达标。" },
  { title: "Phase 2 — 清水信道", desc: "透明亚克力水箱，3m 通信距离，验证水介质对基准性能的影响。" },
  { title: "Phase 3 — 浑浊水信道", desc: "牛奶模拟浑浊度（5/20/50 NTU），验证阻尼算法的自适应收敛效果。" },
  { title: "目标指标", desc: "BER < 10⁻⁴ @3m 浑浊水，自适应收敛 < 30 帧，是核心论文创新点验证。" },
];

const PHASE_SHOWN_PER_STEP = [0, 1, 1, 2, 2, 3, 4, 4];
const METRICS_SHOWN_PER_STEP = [false, false, true, false, true, false, false, false];

export default function ExperimentPhases({ title }: { title?: string }) {
  const { currentStep, totalSteps, next, prev, reset, isPlaying, toggleAutoPlay } =
    useSteppedVisualization({ totalSteps: 8, autoPlayInterval: 3000 });

  const shownPhases = PHASES.slice(0, PHASE_SHOWN_PER_STEP[currentStep]);
  const showMetrics = METRICS_SHOWN_PER_STEP[currentStep];
  const showGoal = currentStep === 7;

  return (
    <section className="min-h-[500px] space-y-4">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        {title || "实验阶段总览"}
      </h2>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mb-3 font-mono text-xs text-zinc-400 dark:text-zinc-500">
          Experiment Phases — UOCC System Validation
        </div>

        {/* Phase cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PHASES.map((phase, idx) => {
            const isShown = idx < PHASE_SHOWN_PER_STEP[currentStep];
            const isActive = PHASE_SHOWN_PER_STEP[currentStep] - 1 === idx;
            return (
              <AnimatePresence key={phase.id}>
                {isShown && (
                  <motion.div
                    initial={{ opacity: 0, y: 16, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.4, delay: 0.05 * idx }}
                    className="rounded-xl border p-3"
                    style={{
                      borderColor: isActive ? phase.color : "transparent",
                      background: isActive
                        ? `linear-gradient(135deg, ${phase.color}15, ${phase.color}08)`
                        : "rgba(113,113,122,0.07)",
                      boxShadow: isActive ? `0 0 0 1px ${phase.color}40` : "none",
                    }}
                  >
                    {/* Header */}
                    <div className="mb-2 flex items-center gap-2">
                      <motion.div
                        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: phase.color }}
                        animate={isActive ? { scale: [1, 1.4, 1] } : { scale: 1 }}
                        transition={{ duration: 1, repeat: isActive ? Infinity : 0 }}
                      />
                      <span className="font-mono text-[10px] font-bold" style={{ color: phase.color }}>
                        {phase.label}
                      </span>
                      <span className="ml-auto text-[9px] font-mono text-zinc-500">
                        {phase.status === "done" ? "✅" : phase.status === "setup" ? "🔄" : "○"}
                      </span>
                    </div>

                    <div className="mb-1 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      {phase.env}
                    </div>
                    <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      {phase.goal}
                    </div>

                    {/* Metrics */}
                    <AnimatePresence>
                      {showMetrics && isActive && phase.metrics && (
                        <motion.div
                          className="mt-2 space-y-1 border-t border-zinc-200 pt-2 dark:border-zinc-700"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          {phase.metrics.map((m) => (
                            <div key={m.label} className="flex justify-between font-mono text-[9px]">
                              <span className="text-zinc-500">{m.label}</span>
                              <span style={{ color: m.color }}>{m.value}</span>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            );
          })}
        </div>

        {/* Goal targets */}
        <AnimatePresence>
          {showGoal && (
            <motion.div
              key="goal"
              className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="mb-2 font-mono text-[10px] font-bold text-green-600 dark:text-green-400">
                TARGET METRICS
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { label: "BER", value: "< 10⁻⁴", sub: "3m 浑浊水" },
                  { label: "收敛时间", value: "< 30 帧", sub: "自适应算法" },
                  { label: "传输速率", value: "≥ 1 kbps", sub: "水下信道" },
                  { label: "端到端延迟", value: "< 100ms", sub: "含解码" },
                ].map((t) => (
                  <div key={t.label} className="text-center">
                    <div className="font-mono text-[10px] text-zinc-400">{t.label}</div>
                    <div className="font-mono text-sm font-bold text-green-500">{t.value}</div>
                    <div className="font-mono text-[9px] text-zinc-500">{t.sub}</div>
                  </div>
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
