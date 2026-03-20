"use client";

import { motion } from "framer-motion";
import { useSteppedVisualization } from "@/hooks/useSteppedVisualization";
import { StepControls } from "@/components/visualizations/shared/step-controls";
import { useSvgPalette } from "@/hooks/useDarkMode";

const NODES = [
  { id: "target", label: "RSSI_target", x: 250, y: 30, w: 120, h: 36, type: "circle" as const },
  { id: "measure", label: "RSSI_current", x: 250, y: 110, w: 130, h: 36, type: "rect" as const },
  { id: "error", label: "e = target - current", x: 250, y: 200, w: 150, h: 44, type: "diamond" as const },
  { id: "gain", label: "ΔGain = Kp × e", x: 250, y: 300, w: 130, h: 36, type: "rect" as const },
  { id: "update", label: "ISO_new = ISO + ΔGain", x: 250, y: 390, w: 150, h: 36, type: "rect" as const },
  { id: "wait", label: "Wait Frame", x: 250, y: 480, w: 120, h: 36, type: "rect" as const },
];

const EDGES = [
  { from: "target", to: "measure" },
  { from: "measure", to: "error" },
  { from: "error", to: "gain", label: "e > 0" },
  { from: "gain", to: "update" },
  { from: "update", to: "wait" },
  { from: "wait", to: "measure", label: "next frame" },
];

const ACTIVE_NODES_PER_STEP = [
  [],
  ["target"],
  ["target", "measure"],
  ["target", "measure", "error"],
  ["error", "gain"],
  ["gain", "update"],
  ["update", "wait"],
  ["wait", "measure"],
  ["wait", "measure", "target"],
];

const ACTIVE_EDGES_PER_STEP = [
  [],
  [],
  ["target->measure"],
  ["measure->error"],
  ["error->gain"],
  ["gain->update"],
  ["update->wait"],
  ["wait->measure"],
  ["wait->measure"],
];

const STEP_INFO = [
  { title: "ISO 自适应控制", desc: "基于 RSSI 反馈的增益调节闭环，动态适应信道变化。" },
  { title: "设定目标", desc: "设定目标 RSSI 值，作为自适应控制的目标。" },
  { title: "测量当前值", desc: "从接收帧中测量当前信号强度 RSSI_current。" },
  { title: "计算误差", desc: "误差 e = RSSI_target - RSSI_current，决定增益调节方向。" },
  { title: "计算增益变化", desc: "ΔGain = Kp × e，比例控制器计算增益调整量。" },
  { title: "更新 ISO", desc: "ISO_new = ISO_old + ΔGain，应用新的增益值。" },
  { title: "等待下一帧", desc: "等待相机采集下一帧，继续循环。" },
  { title: "收敛过程", desc: "误差逐渐减小，ISO 趋于稳定。" },
  { title: "稳态", desc: "RSSI 接近目标值，系统进入稳态。" },
];

const TARGET = 180;
const TARGET_VALUES = [0, 180, 180, 180, 180, 180, 180, 180, 180];
const CURRENT_VALUES = [0, 80, 80, 80, 130, 130, 165, 175, 180];

function getNode(id: string) {
  return NODES.find((n) => n.id === id)!;
}

function edgePath(fromId: string, toId: string): string {
  const from = getNode(fromId);
  const to = getNode(toId);
  if (fromId === "wait" && toId === "measure") {
    return `M ${from.x} ${from.y + 18} L ${from.x} ${from.y + 40} L ${to.x} ${to.y - 18}`;
  }
  return `M ${from.x} ${from.y + 18} L ${to.x} ${to.y - 18}`;
}

export default function AdaptiveISO({ title }: { title?: string }) {
  const {
    currentStep,
    totalSteps,
    next,
    prev,
    reset,
    isPlaying,
    toggleAutoPlay,
  } = useSteppedVisualization({ totalSteps: 9, autoPlayInterval: 3000 });

  const palette = useSvgPalette();
  const activeNodes = ACTIVE_NODES_PER_STEP[currentStep];
  const activeEdges = ACTIVE_EDGES_PER_STEP[currentStep];
  const stepInfo = STEP_INFO[currentStep];
  const currentTarget = TARGET_VALUES[currentStep];
  const currentCurrent = CURRENT_VALUES[currentStep];
  const error = currentTarget - currentCurrent;
  const deltaGain = Math.round(error * 0.3);

  return (
    <section className="min-h-[500px] space-y-4">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        {title || "ISO 自适应控制"}
      </h2>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mb-2 font-mono text-xs text-zinc-400 dark:text-zinc-500">
          Adaptive ISO Control Loop
        </div>

        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="w-full">
            <svg
              viewBox="0 0 500 530"
              aria-label="ISO自适应控制流程图"
              className="w-full rounded-md border border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950"
              style={{ minHeight: 400 }}
            >
              <defs>
                <filter id="iso-glow">
                  <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#3b82f6" floodOpacity="0.8" />
                </filter>
                <marker id="iso-arrow" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
                  <polygon points="0 0, 7 2.5, 0 5" fill={palette.arrowFill} />
                </marker>
                <marker id="iso-arrow-active" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
                  <polygon points="0 0, 7 2.5, 0 5" fill={palette.activeEdgeStroke} />
                </marker>
              </defs>

              {EDGES.map((edge) => {
                const key = `${edge.from}->${edge.to}`;
                const isActive = activeEdges.includes(key);
                const d = edgePath(edge.from, edge.to);
                return (
                  <g key={key}>
                    <motion.path
                      d={d}
                      fill="none"
                      stroke={isActive ? palette.activeEdgeStroke : palette.edgeStroke}
                      strokeWidth={isActive ? 2.5 : 1.5}
                      markerEnd={isActive ? "url(#iso-arrow-active)" : "url(#iso-arrow)"}
                      animate={{ stroke: isActive ? palette.activeEdgeStroke : palette.edgeStroke }}
                      transition={{ duration: 0.4 }}
                    />
                    {edge.label && (
                      <text
                        x={getNode(edge.from).x}
                        y={getNode(edge.from).y + 28}
                        textAnchor="middle"
                        fontSize="9"
                        fill={palette.labelFill}
                      >
                        {edge.label}
                      </text>
                    )}
                  </g>
                );
              })}

              {NODES.map((node) => {
                const isActive = activeNodes.includes(node.id);
                if (node.type === "circle") {
                  return (
                    <g key={node.id}>
                      <motion.circle
                        cx={node.x}
                        cy={node.y}
                        r={node.w / 2}
                        fill={isActive ? "#10b981" : palette.nodeFill}
                        stroke={isActive ? "#10b981" : palette.nodeStroke}
                        strokeWidth="1.5"
                        filter={isActive ? "url(#iso-glow)" : "none"}
                        animate={{ fill: isActive ? "#10b981" : palette.nodeFill }}
                        transition={{ duration: 0.4 }}
                      />
                      <motion.text
                        x={node.x}
                        y={node.y + 4}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="700"
                        fontFamily="monospace"
                        animate={{ fill: isActive ? "#fff" : palette.nodeText }}
                        transition={{ duration: 0.3 }}
                      >
                        {node.label}
                      </motion.text>
                    </g>
                  );
                }
                if (node.type === "diamond") {
                  const cx = node.x;
                  const cy = node.y;
                  const hw = node.w / 2;
                  const hh = node.h / 2;
                  const pts = `${cx},${cy - hh} ${cx + hw},${cy} ${cx},${cy + hh} ${cx - hw},${cy}`;
                  return (
                    <g key={node.id}>
                      <motion.polygon
                        points={pts}
                        fill={isActive ? palette.activeNodeFill : palette.nodeFill}
                        stroke={isActive ? palette.activeNodeStroke : palette.nodeStroke}
                        strokeWidth="1.5"
                        filter={isActive ? "url(#iso-glow)" : "none"}
                        animate={{ fill: isActive ? palette.activeNodeFill : palette.nodeFill }}
                        transition={{ duration: 0.4 }}
                      />
                      <motion.text
                        x={cx}
                        y={cy + 4}
                        textAnchor="middle"
                        fontSize="9"
                        fontWeight="700"
                        fontFamily="monospace"
                        animate={{ fill: isActive ? palette.activeNodeText : palette.nodeText }}
                        transition={{ duration: 0.3 }}
                      >
                        {node.label}
                      </motion.text>
                    </g>
                  );
                }
                return (
                  <g key={node.id}>
                    <motion.rect
                      x={node.x - node.w / 2}
                      y={node.y - node.h / 2}
                      width={node.w}
                      height={node.h}
                      rx="8"
                      fill={isActive ? palette.activeNodeFill : palette.nodeFill}
                      stroke={isActive ? palette.activeNodeStroke : palette.nodeStroke}
                      strokeWidth="1.5"
                      filter={isActive ? "url(#iso-glow)" : "none"}
                      animate={{ fill: isActive ? palette.activeNodeFill : palette.nodeFill }}
                      transition={{ duration: 0.4 }}
                    />
                    <motion.text
                      x={node.x}
                      y={node.y + 4}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="700"
                      fontFamily="monospace"
                      animate={{ fill: isActive ? palette.activeNodeText : palette.nodeText }}
                      transition={{ duration: 0.3 }}
                    >
                      {node.label}
                    </motion.text>
                  </g>
                );
              })}

              {currentStep >= 1 && (
                <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
                  <rect x="390" y="20" width="100" height="60" rx="8" fill={palette.bgSubtle} stroke={palette.nodeStroke} strokeWidth="1" />
                  <text x="440" y="40" textAnchor="middle" fontSize="9" fill={palette.nodeText}>Target</text>
                  <text x="440" y="58" textAnchor="middle" fontSize="14" fontWeight="700" fill="#10b981">{currentTarget}</text>
                </motion.g>
              )}

              {currentStep >= 3 && (
                <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
                  <rect x="390" y="180" width="100" height="60" rx="8" fill={palette.bgSubtle} stroke={palette.nodeStroke} strokeWidth="1" />
                  <text x="440" y="200" textAnchor="middle" fontSize="9" fill={palette.nodeText}>Error</text>
                  <text x="440" y="218" textAnchor="middle" fontSize="14" fontWeight="700" fill={error < 0 ? "#ef4444" : "#10b981"}>
                    {error > 0 ? "+" : ""}{error}
                  </text>
                </motion.g>
              )}

              {currentStep >= 4 && (
                <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
                  <rect x="20" y="20" width="100" height="60" rx="8" fill={palette.bgSubtle} stroke={palette.nodeStroke} strokeWidth="1" />
                  <text x="70" y="40" textAnchor="middle" fontSize="9" fill={palette.nodeText}>ΔGain</text>
                  <text x="70" y="58" textAnchor="middle" fontSize="14" fontWeight="700" fill="#3b82f6">
                    {deltaGain > 0 ? "+" : ""}{deltaGain}
                  </text>
                </motion.g>
              )}
            </svg>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-center dark:border-zinc-700 dark:bg-zinc-800">
            <div className="font-mono text-[10px] text-zinc-500">Target</div>
            <div className="font-mono text-lg font-bold text-emerald-500">{currentTarget}</div>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-center dark:border-zinc-700 dark:bg-zinc-800">
            <div className="font-mono text-[10px] text-zinc-500">Current</div>
            <div className="font-mono text-lg font-bold text-amber-500">{currentCurrent}</div>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-center dark:border-zinc-700 dark:bg-zinc-800">
            <div className="font-mono text-[10px] text-zinc-500">Error</div>
            <div className="font-mono text-lg font-bold text-red-500">
              {currentStep >= 3 ? (error > 0 ? "+" : "") + error : "—"}
            </div>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-center dark:border-zinc-700 dark:bg-zinc-800">
            <div className="font-mono text-[10px] text-zinc-500">ΔGain</div>
            <div className="font-mono text-lg font-bold text-blue-500">
              {currentStep >= 4 ? (deltaGain > 0 ? "+" : "") + deltaGain : "—"}
            </div>
          </div>
        </div>

        {currentStep >= 1 && (
          <div className="mt-3">
            <div className="mb-1 font-mono text-[10px] text-zinc-400">RSSI Progress</div>
            <div className="h-4 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (currentCurrent / TARGET) * 100)}%` }}
                transition={{ duration: 0.5, type: "spring" }}
              />
            </div>
            <div className="mt-1 flex justify-between font-mono text-[10px] text-zinc-400">
              <span>0</span>
              <span>{TARGET} (target)</span>
              <span>200</span>
            </div>
          </div>
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
