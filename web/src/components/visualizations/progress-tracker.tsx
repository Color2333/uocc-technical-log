"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useSteppedVisualization } from "@/hooks/useSteppedVisualization";
import { StepControls } from "@/components/visualizations/shared/step-controls";

interface Milestone {
  date: string;
  label: string;
  status: "done" | "active" | "pending";
  color: string;
}

const MILESTONES: Milestone[] = [
  { date: "2025-08", label: "LED 驱动 v3.0 定型", status: "done", color: "#10b981" },
  { date: "2025-09", label: "OOK 调制解调基础", status: "done", color: "#10b981" },
  { date: "2025-10", label: "UTF-8 / RLL 4B6B 实现", status: "done", color: "#10b981" },
  { date: "2025-11", label: "ISO 自适应仿真（Matus 2020）", status: "done", color: "#10b981" },
  { date: "2025-12", label: "EMA + 自适应学习率 + 动量", status: "done", color: "#10b981" },
  { date: "2026-01", label: "中期答辩通过", status: "done", color: "#10b981" },
  { date: "2026-02", label: "发射端电路 v1 测试通过", status: "done", color: "#10b981" },
  { date: "2026-03", label: "阻尼平滑曝光 + MIMO EGC 理论", status: "done", color: "#10b981" },
  { date: "2026-04", label: "CUDA 加速 + 端到端联调", status: "active", color: "#f59e0b" },
  { date: "2026-04", label: "清水 → 浑浊水信道实验", status: "active", color: "#f59e0b" },
  { date: "2026-05", label: "论文初稿 + 演示系统定型", status: "pending", color: "#6366f1" },
  { date: "2026-05底", label: "答辩 ★", status: "pending", color: "#ec4899" },
];

const STEP_INFO = [
  { title: "项目进度总览", desc: "从 2025-08 到 2026-05，共 12 个核心里程碑。" },
  { title: "硬件基础阶段", desc: "LED 驱动 v3.0 定型，OOK 调制解调基础功能完成。" },
  { title: "算法仿真阶段", desc: "UTF-8/RLL 编码、ISO 自适应（Matus 2020）、改进算法均完成。" },
  { title: "中期答辩通过", desc: "2026-01 中期评审通过，进入系统集成阶段。" },
  { title: "硬件集成阶段", desc: "发射端电路 v1 测试通过，阻尼平滑算法完成，MIMO EGC 理论研究完成。" },
  { title: "当前：冲刺阶段", desc: "CUDA 移植、端到端联调、信道实验——这是答辩前的关键路径。" },
  { title: "优先级视图", desc: "P0（必须完成）→ P1 → P2 的任务分层。" },
  { title: "倒计时", desc: "距答辩约 10 周，关键路径是端到端硬件联调和浑浊水实验。" },
];

const P0_TASKS = ["端到端硬件联调", "浑浊水信道实验"];
const P1_TASKS = ["CUDA 加速移植"];
const P2_TASKS = ["阻尼算法 α 调优", "MIMO BER 对比"];

export default function ProgressTracker({ title }: { title?: string }) {
  const { currentStep, totalSteps, next, prev, reset, isPlaying, toggleAutoPlay } =
    useSteppedVisualization({ totalSteps: 8, autoPlayInterval: 3000 });

  const milestonesShown = Math.min(
    MILESTONES.length,
    [2, 4, 6, 8, 10, 12, 12, 12][currentStep] ?? 12
  );

  const showPriority = currentStep === 6;
  const showCountdown = currentStep === 7;

  // weeks remaining (static)
  const weeksLeft = 10;
  const totalWeeks = 40;
  const progressPct = Math.round(((totalWeeks - weeksLeft) / totalWeeks) * 100);

  return (
    <section className="min-h-[500px] space-y-4">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        {title || "进度追踪"}
      </h2>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mb-3 font-mono text-xs text-zinc-400 dark:text-zinc-500">
          Project Timeline — 2025-08 → 2026-05
        </div>

        {/* Overall progress bar */}
        <div className="mb-4">
          <div className="mb-1 flex justify-between font-mono text-[10px] text-zinc-500">
            <span>项目总进度</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-green-500 via-blue-500 to-amber-500"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[72px] top-0 bottom-0 w-px bg-zinc-200 dark:bg-zinc-700" />

          <div className="space-y-2">
            {MILESTONES.slice(0, milestonesShown).map((m, idx) => (
              <motion.div
                key={m.label}
                className="flex items-start gap-3"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.06 }}
              >
                {/* Date */}
                <div className="w-[68px] flex-shrink-0 pt-0.5 text-right font-mono text-[9px] text-zinc-400">
                  {m.date}
                </div>

                {/* Dot */}
                <div className="relative z-10 flex-shrink-0 pt-1">
                  <motion.div
                    className="h-3 w-3 rounded-full border-2 border-white dark:border-zinc-900"
                    style={{ backgroundColor: m.color }}
                    animate={m.status === "active" ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                    transition={{ duration: 1.2, repeat: m.status === "active" ? Infinity : 0 }}
                  />
                </div>

                {/* Label */}
                <div className="flex-1 pb-2">
                  <span
                    className={`text-xs font-medium ${
                      m.status === "done"
                        ? "text-zinc-700 dark:text-zinc-300"
                        : m.status === "active"
                        ? "font-bold text-amber-500"
                        : "text-zinc-400"
                    }`}
                  >
                    {m.label}
                  </span>
                  {m.status === "done" && (
                    <span className="ml-2 font-mono text-[9px] text-green-500">✓</span>
                  )}
                  {m.status === "active" && (
                    <motion.span
                      className="ml-2 font-mono text-[9px] text-amber-400"
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      ← 当前
                    </motion.span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Priority view */}
        <AnimatePresence>
          {showPriority && (
            <motion.div
              key="priority"
              className="mt-4 grid grid-cols-3 gap-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              {[
                { label: "P0 必须完成", tasks: P0_TASKS, color: "#ef4444", bg: "rgba(239,68,68,0.08)" },
                { label: "P1 重要", tasks: P1_TASKS, color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
                { label: "P2 增益", tasks: P2_TASKS, color: "#6366f1", bg: "rgba(99,102,241,0.08)" },
              ].map((p) => (
                <div key={p.label} className="rounded-lg border p-2"
                  style={{ borderColor: p.color + "40", background: p.bg }}>
                  <div className="mb-1.5 font-mono text-[9px] font-bold" style={{ color: p.color }}>
                    {p.label}
                  </div>
                  {p.tasks.map((t) => (
                    <div key={t} className="font-mono text-[9px] text-zinc-400">• {t}</div>
                  ))}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Countdown */}
        <AnimatePresence>
          {showCountdown && (
            <motion.div
              key="countdown"
              className="mt-4 flex items-center gap-4 rounded-xl border border-pink-200 bg-pink-50 p-4 dark:border-pink-900 dark:bg-pink-950/30"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 260 }}
            >
              <div className="text-center">
                <div className="font-mono text-4xl font-black text-pink-500">{weeksLeft}</div>
                <div className="font-mono text-[10px] text-pink-400">周</div>
              </div>
              <div>
                <div className="text-sm font-bold text-pink-600 dark:text-pink-300">距答辩剩余时间</div>
                <div className="font-mono text-[10px] text-pink-400">关键路径：硬件联调 → 浑浊水实验 → 论文</div>
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
