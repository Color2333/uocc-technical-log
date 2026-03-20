"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useSteppedVisualization } from "@/hooks/useSteppedVisualization";
import { StepControls } from "@/components/visualizations/shared/step-controls";
import { useSvgPalette } from "@/hooks/useDarkMode";

// 4B6B 编码表（部分）
const ENCODE_TABLE: Record<string, { code: string; disparity: number }> = {
  "0001": { code: "010011", disparity: 0 },
  "0010": { code: "011001", disparity: 0 },
  "0011": { code: "011100", disparity: 1 },
  "0110": { code: "101100", disparity: 1 },
  "1010": { code: "111000", disparity: 2 },
};

// 演示序列：三个连续4-bit块
const DEMO_NIBBLES = ["0001", "0110", "1010"];
const ENCODED = DEMO_NIBBLES.map((n) => ENCODE_TABLE[n]);

const STEP_INFO = [
  { title: "4B6B RLL 编码", desc: "将 4 位数据扩展为 6 位传输符号，确保直流平衡，防止连续相同比特导致时钟丢失。" },
  { title: "输入第 1 块：0001", desc: "4 位输入块 0001，包含连续三个 0，直接传输会导致 DC 漂移。" },
  { title: "查编码表", desc: "在 4B6B 编码表中查找 0001 的对应编码：010011，disparity = 0（直流平衡）。" },
  { title: "输出编码：010011", desc: "输出 6 位符号 010011，频繁交替的 0/1 保证了时钟可恢复性。" },
  { title: "Running Disparity 更新", desc: "运行 disparity += 0 → 保持为 0，直流累积良好。" },
  { title: "输入第 2 块：0110", desc: "第二个 4 位块 0110，继续编码。" },
  { title: "编码：101100 (disp=+1)", desc: "0110 → 101100，disparity=+1，运行 disparity 变为 +1。" },
  { title: "输入第 3 块：1010", desc: "第三个 4 位块 1010，包含交替比特。" },
  { title: "编码：111000 (disp=+2)", desc: "1010 → 111000，running disparity = +3。下一块将优先选择负 disparity 的编码字以平衡直流。" },
  { title: "完整编码流", desc: "输入 12 位 → 输出 18 位，数据率开销 50%，换来时钟可恢复性和直流平衡。" },
];

const STEP_NIBBLE_IDX = [-1, 0, 0, 0, 0, 1, 1, 2, 2, -1]; // 当前处理的 nibble
const STEP_SHOW_LOOKUP = [false, false, true, false, false, false, true, false, true, false];
const STEP_SHOW_OUTPUT = [false, false, false, true, true, false, false, false, false, false];
const COMPLETED_OUTPUTS_PER_STEP = [0, 0, 0, 1, 1, 1, 2, 2, 3, 3];
const RUNNING_DISPARITY_PER_STEP = [0, 0, 0, 0, 0, 0, 1, 1, 3, 3];

export default function RLLEncoding({ title }: { title?: string }) {
  const {
    currentStep, totalSteps, next, prev, reset, isPlaying, toggleAutoPlay,
  } = useSteppedVisualization({ totalSteps: 10, autoPlayInterval: 2500 });

  const palette = useSvgPalette();
  const stepInfo = STEP_INFO[currentStep];
  const activeNibbleIdx = STEP_NIBBLE_IDX[currentStep];
  const showLookup = STEP_SHOW_LOOKUP[currentStep];
  const completedOutputs = COMPLETED_OUTPUTS_PER_STEP[currentStep];
  const runningDisparity = RUNNING_DISPARITY_PER_STEP[currentStep];

  const activeNibble = activeNibbleIdx >= 0 ? DEMO_NIBBLES[activeNibbleIdx] : null;
  const activeEncoded = activeNibbleIdx >= 0 ? ENCODED[activeNibbleIdx] : null;

  return (
    <section className="min-h-[500px] space-y-4">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        {title || "RLL 编码：4B6B"}
      </h2>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mb-3 font-mono text-xs text-zinc-400 dark:text-zinc-500">
          Run-Length Limited Encoding · 4B6B
        </div>

        <div className="flex flex-col gap-5">
          {/* 输入流 + 编码过程 */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            {/* 输入块 */}
            <div className="flex-1">
              <div className="mb-1.5 font-mono text-[10px] text-zinc-400">输入 4-bit 块</div>
              <div className="flex gap-3">
                {DEMO_NIBBLES.map((nibble, idx) => {
                  const isDone = idx < completedOutputs;
                  const isActive = idx === activeNibbleIdx;
                  return (
                    <motion.div
                      key={idx}
                      className="flex flex-col items-center gap-1"
                      animate={{ scale: isActive ? 1.08 : 1 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="flex gap-0.5">
                        {nibble.split("").map((bit, bitIdx) => (
                          <motion.div
                            key={bitIdx}
                            className="flex h-8 w-7 items-center justify-center rounded font-mono text-sm font-bold"
                            animate={{
                              backgroundColor: isActive
                                ? "#3b82f622"
                                : isDone ? "#10b98122" : "transparent",
                              color: isActive
                                ? "#3b82f6"
                                : isDone ? "#10b981" : palette.nodeText,
                              borderColor: isActive
                                ? "#3b82f6"
                                : isDone ? "#10b98166" : palette.nodeStroke,
                              borderWidth: "1px",
                              borderStyle: "solid",
                            }}
                            transition={{ duration: 0.3 }}
                          >
                            {bit}
                          </motion.div>
                        ))}
                      </div>
                      <span className="font-mono text-[9px] text-zinc-400">块{idx + 1}</span>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* 编码箭头 */}
            <AnimatePresence mode="wait">
              {showLookup && activeNibble && activeEncoded ? (
                <motion.div
                  key="lookup-active"
                  className="flex flex-col items-center gap-2"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.4, type: "spring", bounce: 0.3 }}
                >
                  <div className="rounded-lg border border-purple-300 bg-purple-50 px-3 py-2 dark:border-purple-700 dark:bg-purple-950/40">
                    <div className="font-mono text-[9px] text-purple-500 dark:text-purple-400">查编码表</div>
                    <div className="mt-1 font-mono text-xs font-bold text-purple-700 dark:text-purple-300">
                      {activeNibble} → {activeEncoded.code}
                    </div>
                    <div className="mt-0.5 font-mono text-[9px] text-purple-500">
                      disp = {activeEncoded.disparity > 0 ? "+" : ""}{activeEncoded.disparity}
                    </div>
                  </div>
                  <motion.div
                    className="text-lg font-bold text-purple-400"
                    animate={{ x: [0, 6, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity }}
                  >
                    →
                  </motion.div>
                </motion.div>
              ) : (
                <motion.div
                  key="arrow-idle"
                  className="text-2xl text-zinc-300 dark:text-zinc-600"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  →
                </motion.div>
              )}
            </AnimatePresence>

            {/* 输出 6-bit 块 */}
            <div className="flex-1">
              <div className="mb-1.5 font-mono text-[10px] text-zinc-400">输出 6-bit 符号</div>
              <div className="flex gap-3">
                <AnimatePresence>
                  {ENCODED.slice(0, Math.max(completedOutputs, activeNibbleIdx >= 0 && STEP_SHOW_OUTPUT[currentStep] ? activeNibbleIdx + 1 : 0)).map((enc, idx) => (
                    <motion.div
                      key={idx}
                      className="flex flex-col items-center gap-1"
                      initial={{ opacity: 0, y: 12, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4, type: "spring", bounce: 0.25 }}
                    >
                      <div className="flex gap-0.5">
                        {enc.code.split("").map((bit, bitIdx) => (
                          <motion.div
                            key={bitIdx}
                            className="flex h-8 w-6 items-center justify-center rounded font-mono text-xs font-bold"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: bitIdx * 0.06, duration: 0.2, type: "spring" }}
                            style={{
                              backgroundColor: bit === "1" ? "#f59e0b22" : "#3b82f622",
                              color: bit === "1" ? "#d97706" : "#3b82f6",
                              border: `1px solid ${bit === "1" ? "#f59e0b44" : "#3b82f644"}`,
                            }}
                          >
                            {bit}
                          </motion.div>
                        ))}
                      </div>
                      <span className="font-mono text-[9px] text-zinc-400">符号{idx + 1}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {completedOutputs === 0 && !STEP_SHOW_OUTPUT[currentStep] && (
                  <div className="flex items-center font-mono text-xs text-zinc-300 dark:text-zinc-600">
                    等待编码...
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Running Disparity 可视化 */}
          <div>
            <div className="mb-1.5 font-mono text-[10px] text-zinc-400">Running Disparity（直流累积）</div>
            <div className="flex items-center gap-3">
              <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                {/* 中心基准线 */}
                <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-zinc-400 dark:bg-zinc-500" />
                {/* 偏移指示 */}
                <motion.div
                  className="absolute top-0 h-full rounded-full"
                  style={{
                    background: Math.abs(runningDisparity) > 2 ? "#ef444488" : "#10b98188",
                  }}
                  animate={{
                    left: runningDisparity >= 0
                      ? "50%"
                      : `${50 - Math.abs(runningDisparity) * 8}%`,
                    width: `${Math.abs(runningDisparity) * 8}%`,
                  }}
                  transition={{ duration: 0.5, type: "spring" }}
                />
              </div>
              <motion.span
                className="min-w-[3rem] text-right font-mono text-sm font-bold"
                animate={{
                  color: Math.abs(runningDisparity) > 2 ? "#ef4444" : "#10b981",
                }}
              >
                {runningDisparity > 0 ? "+" : ""}{runningDisparity}
              </motion.span>
              <span className="font-mono text-[9px] text-zinc-400">
                {Math.abs(runningDisparity) <= 2 ? "✓ 平衡" : "⚠ 需补偿"}
              </span>
            </div>
          </div>

          {/* 完整输出展示（最后一步） */}
          <AnimatePresence>
            {currentStep === 9 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.5 }}
                className="overflow-hidden rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950/30"
              >
                <div className="mb-1 font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  编码对比
                </div>
                <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                  <div>
                    <span className="text-zinc-400">输入 (12 bit)：</span>
                    <span className="ml-1 text-emerald-600 dark:text-emerald-400">
                      {DEMO_NIBBLES.join(" ")}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400">输出 (18 bit)：</span>
                    <span className="ml-1 text-amber-600 dark:text-amber-400">
                      {ENCODED.map((e) => e.code).join(" ")}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400">编码开销：</span>
                    <span className="ml-1 text-blue-500">+50%</span>
                  </div>
                  <div>
                    <span className="text-zinc-400">直流平衡：</span>
                    <span className="ml-1 text-emerald-500">✓ 满足</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <StepControls
        currentStep={currentStep}
        totalSteps={totalSteps}
        onPrev={prev}
        onNext={next}
        onReset={reset}
        isPlaying={isPlaying}
        onToggleAutoPlay={toggleAutoPlay}
        stepTitle={stepInfo.title}
        stepDescription={stepInfo.desc}
      />
    </section>
  );
}
