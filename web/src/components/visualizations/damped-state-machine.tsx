"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useSteppedVisualization } from "@/hooks/useSteppedVisualization";
import { StepControls } from "@/components/visualizations/shared/step-controls";
import { useSvgPalette } from "@/hooks/useDarkMode";

const STATES = [
  { id: "stable", label: "STABLE\n稳定态", x: 250, y: 55, color: "#10b981", activeColor: "#34d399" },
  { id: "low", label: "LOW\n低增益态", x: 100, y: 195, color: "#3b82f6", activeColor: "#60a5fa" },
  { id: "high", label: "HIGH\n高增益态", x: 400, y: 195, color: "#f59e0b", activeColor: "#fbbf24" },
  { id: "dark", label: "DARK\n低光态", x: 250, y: 340, color: "#6366f1", activeColor: "#818cf8" },
];

const TRANSITIONS = [
  { from: "stable", to: "low", label: "信号过强" },
  { from: "stable", to: "high", label: "信号过弱" },
  { from: "stable", to: "dark", label: "极低光" },
  { from: "low", to: "stable", label: "|e| < LOW" },
  { from: "high", to: "stable", label: "|e| < LOW" },
  { from: "dark", to: "stable", label: "|e| < LOW" },
  { from: "low", to: "high", label: "e 恶化" },
  { from: "high", to: "low", label: "e 改善" },
  { from: "high", to: "dark", label: "e 恶化" },
  { from: "dark", to: "high", label: "e 改善" },
];

// RSSI EMA signal values per step (0–1 normalized, target = 0.6)
const RSSI_RAW_PER_STEP = [0.62, 0.60, 0.35, 0.30, 0.28, 0.45, 0.72, 0.18, 0.38, 0.61];
const RSSI_EMA_PER_STEP = [0.61, 0.60, 0.52, 0.45, 0.39, 0.41, 0.51, 0.39, 0.39, 0.53];

const ACTIVE_STATES_PER_STEP = [
  ["stable"],
  ["stable"],
  ["stable", "high"],
  ["high"],
  ["high"],
  ["high", "low"],
  ["low"],
  ["low", "dark"],
  ["dark"],
  ["stable"],
];

const STEP_INFO = [
  { title: "阻尼多状态机", desc: "曝光+增益联合控制的多状态机，覆盖宽动态范围。" },
  { title: "稳定态", desc: "信道良好，RSSI_ema ≈ 0.60，接近目标值 0.6。" },
  { title: "EMA 检测扰动", desc: "RSSI_raw 突降至 0.35，EMA 平滑后为 0.52，误差开始累积。" },
  { title: "切换高增益态", desc: "RSSI_ema < 阈值，阻尼切换：ISO = 0.3×800 + 0.7×100 = 310 → 渐增至 800。" },
  { title: "高增益态维持", desc: "ISO 持续升高，EMA 稳定在 0.39，调参状态。" },
  { title: "信道改善", desc: "RSSI 回升，EMA 上穿阈值，准备切回低增益态。" },
  { title: "切换低增益态", desc: "信号过强（RSSI_ema=0.51），切换 LOW：ISO=200，避免过曝。" },
  { title: "极低光事件", desc: "RSSI_raw 骤降至 0.18，EMA=0.39，触发 DARK 态切换。" },
  { title: "DARK 态运行", desc: "ISO=1600，曝光=50ms，勉强维持信号可辨识。" },
  { title: "阻尼恢复稳定", desc: "信道改善，动量 + 阻尼使系统平滑恢复 STABLE，α=0.3 防止振荡。" },
];

const ISO_PARAMS: Record<string, { iso: number; exposure: number }> = {
  stable: { iso: 100, exposure: 5 },
  low: { iso: 200, exposure: 10 },
  high: { iso: 800, exposure: 20 },
  dark: { iso: 1600, exposure: 50 },
};

function getState(id: string) {
  return STATES.find((s) => s.id === id)!;
}

function edgePathBounce(fromId: string, toId: string): string {
  const from = getState(fromId);
  const to = getState(toId);
  if (fromId === "stable" && toId === "low") {
    return `M ${from.x} ${from.y + 40} Q ${from.x - 60} ${from.y + 130} ${to.x + 30} ${to.y - 38}`;
  }
  if (fromId === "stable" && toId === "high") {
    return `M ${from.x} ${from.y + 40} Q ${from.x + 60} ${from.y + 130} ${to.x - 30} ${to.y - 38}`;
  }
  if (fromId === "stable" && toId === "dark") {
    return `M ${from.x} ${from.y + 40} L ${from.x} ${from.y + 140} L ${to.x} ${to.y - 40}`;
  }
  if (fromId === "low" && toId === "stable") {
    return `M ${from.x - 30} ${from.y - 20} L ${from.x - 90} ${from.y - 80} L ${to.x - 30} ${to.y + 38}`;
  }
  if (fromId === "high" && toId === "stable") {
    return `M ${from.x + 30} ${from.y - 20} L ${from.x + 90} ${from.y - 80} L ${to.x + 30} ${to.y + 38}`;
  }
  if (fromId === "high" && toId === "dark") {
    return `M ${from.x} ${from.y + 40} L ${to.x} ${to.y - 40}`;
  }
  if (fromId === "dark" && toId === "high") {
    return `M ${from.x + 20} ${from.y - 40} L ${to.x - 20} ${to.y + 40}`;
  }
  if (fromId === "low" && toId === "high") {
    return `M ${from.x + 40} ${from.y} L ${to.x - 40} ${to.y}`;
  }
  if (fromId === "high" && toId === "low") {
    return `M ${from.x - 40} ${from.y} L ${to.x + 40} ${to.y}`;
  }
  if (fromId === "dark" && toId === "stable") {
    return `M ${from.x} ${from.y - 40} L ${to.x} ${to.y + 40}`;
  }
  return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
}

// Miniature RSSI EMA chart rendered in SVG
function RssiChart({
  upToStep,
  palette,
}: {
  upToStep: number;
  palette: ReturnType<typeof useSvgPalette>;
}) {
  const W = 200;
  const H = 70;
  const PAD = { l: 24, r: 8, t: 10, b: 18 };
  const inner = { w: W - PAD.l - PAD.r, h: H - PAD.t - PAD.b };
  const steps = RSSI_RAW_PER_STEP.length;

  function xOf(i: number) {
    return PAD.l + (i / (steps - 1)) * inner.w;
  }
  function yOf(v: number) {
    return PAD.t + (1 - v) * inner.h;
  }

  const rawPoints = RSSI_RAW_PER_STEP.slice(0, upToStep + 1)
    .map((v, i) => `${xOf(i)},${yOf(v)}`)
    .join(" ");

  const emaPoints = RSSI_EMA_PER_STEP.slice(0, upToStep + 1)
    .map((v, i) => `${xOf(i)},${yOf(v)}`)
    .join(" ");

  const targetY = yOf(0.6);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-label="RSSI EMA 信号图">
      {/* Target line */}
      <line x1={PAD.l} y1={targetY} x2={W - PAD.r} y2={targetY}
        stroke="#10b981" strokeWidth="1" strokeDasharray="3,2" opacity="0.7" />
      <text x={PAD.l - 2} y={targetY + 3} fontSize="7" fill="#10b981" textAnchor="end">目标</text>

      {/* Raw RSSI (faded) */}
      {upToStep > 0 && (
        <polyline points={rawPoints} fill="none"
          stroke={palette.edgeStroke} strokeWidth="1" opacity="0.4" />
      )}

      {/* EMA line */}
      {upToStep > 0 && (
        <motion.polyline
          key={upToStep}
          points={emaPoints}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="1.5"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        />
      )}

      {/* Current EMA dot */}
      <motion.circle
        cx={xOf(upToStep)}
        cy={yOf(RSSI_EMA_PER_STEP[upToStep])}
        r="3"
        fill="#f59e0b"
        animate={{ scale: [1, 1.5, 1] }}
        transition={{ duration: 0.8, repeat: Infinity }}
      />

      {/* Axes labels */}
      <text x={PAD.l} y={H - 4} fontSize="7" fill={palette.nodeText}>0</text>
      <text x={W - PAD.r} y={H - 4} fontSize="7" fill={palette.nodeText} textAnchor="end">Step {upToStep}</text>
      <text x={PAD.l - 2} y={PAD.t + inner.h + 2} fontSize="7" fill={palette.nodeText} textAnchor="end">0</text>
      <text x={PAD.l - 2} y={PAD.t + 4} fontSize="7" fill={palette.nodeText} textAnchor="end">1</text>
    </svg>
  );
}

export default function DampedStateMachine({ title }: { title?: string }) {
  const {
    currentStep,
    totalSteps,
    next,
    prev,
    reset,
    isPlaying,
    toggleAutoPlay,
  } = useSteppedVisualization({ totalSteps: 10, autoPlayInterval: 3500 });

  const palette = useSvgPalette();
  const activeStates = ACTIVE_STATES_PER_STEP[currentStep];
  const stepInfo = STEP_INFO[currentStep];
  const currentState = activeStates[activeStates.length - 1] || "stable";
  const params = ISO_PARAMS[currentState];

  const rssiEma = RSSI_EMA_PER_STEP[currentStep];
  const rssiRaw = RSSI_RAW_PER_STEP[currentStep];

  return (
    <section className="min-h-[500px] space-y-4">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        {title || "阻尼多状态机"}
      </h2>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mb-2 font-mono text-xs text-zinc-400 dark:text-zinc-500">
          State Machine (α = 0.3 damping) + RSSI EMA (β = 0.7)
        </div>

        <div className="flex flex-col gap-4 lg:flex-row">
          {/* FSM diagram */}
          <div className="w-full lg:w-[55%]">
            <svg
              viewBox="0 0 500 400"
              aria-label="阻尼多状态机状态转换图"
              className="w-full rounded-md border border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950"
              style={{ minHeight: 340 }}
            >
              <defs>
                <filter id="fsm-glow">
                  <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#f59e0b" floodOpacity="0.9" />
                </filter>
                <marker id="fsm-arrow" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
                  <polygon points="0 0, 7 2.5, 0 5" fill={palette.arrowFill} />
                </marker>
                <marker id="fsm-arrow-active" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
                  <polygon points="0 0, 7 2.5, 0 5" fill="#f59e0b" />
                </marker>
              </defs>

              {TRANSITIONS.map((t) => {
                const from = getState(t.from);
                const to = getState(t.to);
                const isActive =
                  activeStates.includes(t.from) && activeStates.includes(t.to) &&
                  currentStep >= 2;
                const d = edgePathBounce(t.from, t.to);
                const midX = (from.x + to.x) / 2;
                const midY = (from.y + to.y) / 2;
                return (
                  <g key={`${t.from}-${t.to}`}>
                    <motion.path
                      d={d}
                      fill="none"
                      stroke={isActive ? "#f59e0b" : palette.edgeStroke}
                      strokeWidth={isActive ? 2.5 : 1.5}
                      strokeDasharray={isActive ? "none" : "4,4"}
                      markerEnd={isActive ? "url(#fsm-arrow-active)" : "url(#fsm-arrow)"}
                      animate={{ stroke: isActive ? "#f59e0b" : palette.edgeStroke, strokeWidth: isActive ? 2.5 : 1.5 }}
                      transition={{ duration: 0.4 }}
                    />
                    <AnimatePresence>
                      {isActive && (
                        <motion.text
                          key={`label-${t.from}-${t.to}`}
                          x={midX}
                          y={midY}
                          textAnchor="middle"
                          fontSize="9"
                          fill="#f59e0b"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 1, repeat: Infinity }}
                        >
                          {t.label}
                        </motion.text>
                      )}
                    </AnimatePresence>
                  </g>
                );
              })}

              {STATES.map((state) => {
                const isActive = activeStates.includes(state.id);
                return (
                  <g key={state.id}>
                    <motion.circle
                      cx={state.x}
                      cy={state.y}
                      r="46"
                      fill={isActive ? state.activeColor : state.color}
                      stroke={isActive ? "#fff" : state.color}
                      strokeWidth={isActive ? 3 : 2}
                      filter={isActive ? "url(#fsm-glow)" : "none"}
                      animate={{
                        fill: isActive ? state.activeColor : state.color,
                        scale: isActive ? 1.08 : 1,
                      }}
                      transition={{ duration: 0.4, type: "spring", stiffness: 200 }}
                    />
                    <motion.text
                      x={state.x}
                      y={state.y - 6}
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="700"
                      fill="#fff"
                    >
                      {state.label.split("\n")[0]}
                    </motion.text>
                    <motion.text
                      x={state.x}
                      y={state.y + 8}
                      textAnchor="middle"
                      fontSize="8"
                      fill="rgba(255,255,255,0.85)"
                    >
                      {state.label.split("\n")[1]}
                    </motion.text>
                    {/* ISO badge */}
                    {isActive && (
                      <motion.text
                        x={state.x}
                        y={state.y + 24}
                        textAnchor="middle"
                        fontSize="8"
                        fill="rgba(255,255,255,0.7)"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        ISO={ISO_PARAMS[state.id].iso}
                      </motion.text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Right panel */}
          <div className="w-full lg:w-[45%] space-y-3">
            {/* Current state header */}
            <div>
              <div className="mb-1 font-mono text-xs text-zinc-400 dark:text-zinc-500">Current State</div>
              <motion.div
                key={currentState}
                className="text-2xl font-bold"
                style={{ color: STATES.find(s => s.id === currentState)?.activeColor }}
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                {currentState.toUpperCase()}
              </motion.div>
            </div>

            {/* ISO + Exposure cards */}
            {params && (
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-center dark:border-zinc-700 dark:bg-zinc-800">
                  <div className="font-mono text-[10px] text-zinc-500">ISO</div>
                  <motion.div
                    key={`iso-${currentState}`}
                    className="font-mono text-xl font-bold text-blue-500"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {params.iso}
                  </motion.div>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-center dark:border-zinc-700 dark:bg-zinc-800">
                  <div className="font-mono text-[10px] text-zinc-500">Exposure</div>
                  <motion.div
                    key={`exp-${currentState}`}
                    className="font-mono text-xl font-bold text-amber-500"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {params.exposure}ms
                  </motion.div>
                </div>
              </div>
            )}

            {/* RSSI EMA chart */}
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800">
              <div className="mb-1 font-mono text-[10px] text-zinc-500">
                RSSI Signal — <span className="text-amber-400">EMA (β=0.7)</span>
                {" / "}
                <span className="text-zinc-400">Raw</span>
              </div>
              <RssiChart upToStep={currentStep} palette={palette} />
              <div className="mt-1 flex gap-4 font-mono text-[10px]">
                <span className="text-zinc-400">raw: <span className="text-zinc-200">{rssiRaw.toFixed(2)}</span></span>
                <span className="text-amber-400">ema: <span className="font-bold">{rssiEma.toFixed(2)}</span></span>
                <span className="text-green-400">target: 0.60</span>
              </div>
            </div>

            {/* Damping formula */}
            <AnimatePresence>
              {currentStep >= 3 && (
                <motion.div
                  key="formula"
                  className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="font-mono text-[10px] text-zinc-500 mb-1">Damping Formula</div>
                  <div className="font-mono text-[11px] text-blue-400">
                    ISO = 0.3 × {ISO_PARAMS[currentState].iso} + 0.7 × prev
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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
