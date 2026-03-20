"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useSteppedVisualization } from "@/hooks/useSteppedVisualization";
import { StepControls } from "@/components/visualizations/shared/step-controls";
import { useSvgPalette } from "@/hooks/useDarkMode";

// 演示比特流
const DEMO_BITS = [1, 0, 1, 1, 0, 0, 1];

const STEP_INFO = [
  { title: "OOK 调制：开关键控", desc: "最简单的数字调制方式。bit=1 → LED 开启（载波ON），bit=0 → LED 关闭（载波OFF）。" },
  { title: "bit = 1 → LED ON", desc: "发送第 1 位：1。LED 点亮，光信号发射。相机接收到高亮度帧。" },
  { title: "bit = 0 → LED OFF", desc: "发送第 2 位：0。LED 熄灭，无光信号。相机接收到低亮度帧。" },
  { title: "bit = 1 → LED ON", desc: "发送第 3 位：1。LED 再次点亮。" },
  { title: "bit = 1 → LED ON", desc: "发送第 4 位：1。LED 保持点亮（连续1→连续光）。" },
  { title: "bit = 0 → LED OFF", desc: "发送第 5 位：0。LED 熄灭。" },
  { title: "bit = 0 → LED OFF", desc: "发送第 6 位：0。连续两个 0 → 相机无信号，此处体现了 RLL 编码的必要性。" },
  { title: "bit = 1 → LED ON", desc: "发送第 7 位：1。LED 最后一次点亮，完成一帧传输。" },
  { title: "波形全貌", desc: "完整的 OOK 调制波形：LED 开关对应比特序列 1011001。接收端通过阈值判决恢复比特流。" },
];

// 每步当前激活的比特索引
const ACTIVE_BIT_PER_STEP = [-1, 0, 1, 2, 3, 4, 5, 6, -1];
// 每步已完成的比特（用于波形绘制）
const COMPLETED_BITS_PER_STEP = [0, 1, 2, 3, 4, 5, 6, 7, 7];

// 波形的 X 坐标 per bit
const BIT_W = 40;
const WAVE_START_X = 40;
const WAVE_Y_ON = 50;
const WAVE_Y_OFF = 90;

function buildWavePath(bits: number[]): string {
  if (bits.length === 0) return "";
  let d = "";
  let x = WAVE_START_X;
  for (let i = 0; i < bits.length; i++) {
    const y = bits[i] === 1 ? WAVE_Y_ON : WAVE_Y_OFF;
    const prevY = i === 0 ? (bits[0] === 1 ? WAVE_Y_ON : WAVE_Y_OFF) : (bits[i - 1] === 1 ? WAVE_Y_ON : WAVE_Y_OFF);
    if (i === 0) {
      d += `M ${x} ${y}`;
    } else if (y !== prevY) {
      // 垂直跳变
      d += ` L ${x} ${prevY} L ${x} ${y}`;
    }
    d += ` L ${x + BIT_W} ${y}`;
    x += BIT_W;
  }
  return d;
}

// LED 光晕组件
function LedVisual({ isOn }: { isOn: boolean }) {
  return (
    <div className="relative flex items-center justify-center">
      {/* 外层光晕 */}
      <AnimatePresence>
        {isOn && (
          <motion.div
            key="outer-glow"
            className="absolute rounded-full"
            style={{ width: 96, height: 96, background: "radial-gradient(circle, #fbbf2460 0%, transparent 70%)" }}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 1.0, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </AnimatePresence>
      {/* 中层光晕 */}
      <AnimatePresence>
        {isOn && (
          <motion.div
            key="mid-glow"
            className="absolute rounded-full"
            style={{ width: 64, height: 64, background: "radial-gradient(circle, #fde68a80 0%, transparent 70%)" }}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>
      {/* LED 圆 */}
      <motion.div
        className="relative z-10 rounded-full border-4"
        style={{ width: 44, height: 44 }}
        animate={{
          backgroundColor: isOn ? "#fbbf24" : "#27272a",
          borderColor: isOn ? "#f59e0b" : "#3f3f46",
          boxShadow: isOn ? "0 0 24px 8px #fbbf2480" : "none",
        }}
        transition={{ duration: 0.25, type: "spring", stiffness: 300 }}
      />
    </div>
  );
}

export default function OOKModulation({ title }: { title?: string }) {
  const {
    currentStep, totalSteps, next, prev, reset, isPlaying, toggleAutoPlay,
  } = useSteppedVisualization({ totalSteps: 9, autoPlayInterval: 1800 });

  const palette = useSvgPalette();
  const stepInfo = STEP_INFO[currentStep];
  const activeBitIdx = ACTIVE_BIT_PER_STEP[currentStep];
  const completedCount = COMPLETED_BITS_PER_STEP[currentStep];
  const completedBits = DEMO_BITS.slice(0, completedCount);
  const isLedOn = activeBitIdx >= 0 && DEMO_BITS[activeBitIdx] === 1;

  const wavePath = buildWavePath(completedBits);

  return (
    <section className="min-h-[500px] space-y-4">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        {title || "OOK 调制解调"}
      </h2>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mb-3 font-mono text-xs text-zinc-400 dark:text-zinc-500">
          On-Off Keying Modulation
        </div>

        {/* 比特流显示 */}
        <div className="mb-5">
          <div className="mb-1.5 font-mono text-[10px] text-zinc-400">比特流</div>
          <div className="flex gap-2">
            {DEMO_BITS.map((bit, i) => {
              const isDone = i < completedCount;
              const isActive = i === activeBitIdx;
              return (
                <motion.div
                  key={i}
                  className="flex h-10 w-10 items-center justify-center rounded-lg font-mono text-lg font-bold"
                  animate={{
                    backgroundColor: isActive
                      ? bit === 1 ? "#fbbf24" : "#3b82f6"
                      : isDone
                        ? bit === 1 ? "#fbbf2422" : "#3b82f622"
                        : "transparent",
                    color: isActive
                      ? "#1a1a1a"
                      : isDone
                        ? bit === 1 ? "#d97706" : "#2563eb"
                        : palette.nodeText,
                    scale: isActive ? 1.18 : 1,
                    borderColor: isActive
                      ? bit === 1 ? "#f59e0b" : "#3b82f6"
                      : isDone
                        ? bit === 1 ? "#f59e0b44" : "#3b82f644"
                        : palette.nodeStroke,
                    borderWidth: "2px",
                    borderStyle: "solid",
                  }}
                  transition={{ duration: 0.25, type: "spring", stiffness: 400 }}
                >
                  {bit}
                </motion.div>
              );
            })}

            {/* 当前状态标注 */}
            <AnimatePresence mode="wait">
              {activeBitIdx >= 0 && (
                <motion.div
                  key={`label-${activeBitIdx}`}
                  className="ml-2 flex items-center gap-2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.3 }}
                >
                  <span className="font-mono text-xs text-zinc-400">→</span>
                  <span
                    className="rounded px-2 py-0.5 font-mono text-xs font-bold"
                    style={{
                      background: DEMO_BITS[activeBitIdx] === 1 ? "#fbbf2422" : "#3b82f622",
                      color: DEMO_BITS[activeBitIdx] === 1 ? "#d97706" : "#3b82f6",
                    }}
                  >
                    LED {DEMO_BITS[activeBitIdx] === 1 ? "ON ↑" : "OFF ↓"}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          {/* LED 可视化 */}
          <div className="flex flex-col items-center gap-3 lg:w-1/3">
            <div className="font-mono text-[10px] text-zinc-400">LED 状态</div>
            <div className="flex h-32 items-center justify-center">
              <LedVisual isOn={isLedOn} />
            </div>
            <motion.div
              className="rounded-full px-3 py-1 font-mono text-xs font-bold"
              animate={{
                backgroundColor: isLedOn ? "#fbbf2422" : "#27272a",
                color: isLedOn ? "#d97706" : "#71717a",
              }}
              transition={{ duration: 0.25 }}
            >
              {activeBitIdx >= 0 ? (isLedOn ? "● 光信号发射中" : "○ 无光信号") : "待机"}
            </motion.div>
          </div>

          {/* 波形图 */}
          <div className="flex-1">
            <div className="mb-1.5 font-mono text-[10px] text-zinc-400">OOK 波形（实时绘制）</div>
            <svg
              viewBox="0 0 330 120"
              className="w-full rounded-md border border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950"
              style={{ minHeight: 100 }}
            >
              {/* 背景网格线 */}
              <line x1="0" y1={WAVE_Y_ON} x2="330" y2={WAVE_Y_ON} stroke={palette.edgeStroke} strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="0" y1={WAVE_Y_OFF} x2="330" y2={WAVE_Y_OFF} stroke={palette.edgeStroke} strokeWidth="0.5" strokeDasharray="4 4" />
              {/* 比特分割线 */}
              {DEMO_BITS.map((_, i) => (
                <line
                  key={i}
                  x1={WAVE_START_X + i * BIT_W}
                  y1="20"
                  x2={WAVE_START_X + i * BIT_W}
                  y2="110"
                  stroke={palette.edgeStroke}
                  strokeWidth="0.5"
                  strokeDasharray="2 3"
                />
              ))}
              {/* 轴标签 */}
              <text x="8" y={WAVE_Y_ON + 4} fontSize="8" fill={palette.labelFill}>ON</text>
              <text x="5" y={WAVE_Y_OFF + 4} fontSize="8" fill={palette.labelFill}>OFF</text>
              {/* 比特标签 */}
              {DEMO_BITS.map((bit, i) => (
                <text
                  key={i}
                  x={WAVE_START_X + i * BIT_W + BIT_W / 2}
                  y="16"
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight={i === activeBitIdx ? "700" : "400"}
                  fill={i === activeBitIdx ? (bit === 1 ? "#f59e0b" : "#3b82f6") : palette.labelFill}
                >
                  {bit}
                </text>
              ))}
              {/* 波形路径 */}
              {wavePath && (
                <motion.path
                  d={wavePath}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  key={wavePath}
                />
              )}
              {/* 当前位置游标 */}
              {activeBitIdx >= 0 && (
                <motion.line
                  x1={WAVE_START_X + activeBitIdx * BIT_W + BIT_W / 2}
                  y1="20"
                  x2={WAVE_START_X + activeBitIdx * BIT_W + BIT_W / 2}
                  y2="110"
                  stroke="#f59e0b"
                  strokeWidth="1.5"
                  strokeDasharray="3 2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                />
              )}
            </svg>
          </div>
        </div>

        {/* 接收端阈值判决提示 */}
        {currentStep === 8 && (
          <motion.div
            className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950/30"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              接收端阈值判决
            </div>
            <div className="mt-1 font-mono text-xs text-emerald-600 dark:text-emerald-400">
              亮度 &gt; threshold → bit = 1 &nbsp;|&nbsp; 亮度 ≤ threshold → bit = 0
            </div>
            <div className="mt-1 font-mono text-xs text-emerald-500">
              恢复比特流：{DEMO_BITS.join(" ")} ✓
            </div>
          </motion.div>
        )}
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
