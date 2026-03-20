"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useSteppedVisualization } from "@/hooks/useSteppedVisualization";
import { StepControls } from "@/components/visualizations/shared/step-controls";
import { useSvgPalette } from "@/hooks/useDarkMode";

// 四个层的位置（圆形布局）
const LAYERS = [
  { id: "sense", label: "感知层", sublabel: "双目相机", x: 250, y: 60, color: "#3b82f6", glow: "#1d4ed8" },
  { id: "algo", label: "算法层", sublabel: "自适应控制", x: 430, y: 220, color: "#10b981", glow: "#065f46" },
  { id: "exec", label: "执行层", sublabel: "LED / 增益", x: 250, y: 380, color: "#f59e0b", glow: "#92400e" },
  { id: "feedback", label: "反馈层", sublabel: "信道质量评估", x: 70, y: 220, color: "#8b5cf6", glow: "#4c1d95" },
];

// 箭头连接（顺时针）
const ARROWS = [
  { id: "s-a", from: "sense", to: "algo", label: "原始帧" },
  { id: "a-e", from: "algo", to: "exec", label: "控制指令" },
  { id: "e-f", from: "exec", to: "feedback", label: "执行结果" },
  { id: "f-s", from: "feedback", to: "sense", label: "参数调整" },
];

// 每一步激活的层和箭头
const ACTIVE_PER_STEP: { layers: string[]; arrows: string[]; highlight: string | null }[] = [
  { layers: [], arrows: [], highlight: null },
  { layers: ["sense"], arrows: [], highlight: "sense" },
  { layers: ["sense", "algo"], arrows: ["s-a"], highlight: "s-a" },
  { layers: ["algo"], arrows: ["s-a"], highlight: "algo" },
  { layers: ["algo", "exec"], arrows: ["a-e"], highlight: "a-e" },
  { layers: ["exec"], arrows: ["a-e"], highlight: "exec" },
  { layers: ["exec", "feedback"], arrows: ["e-f"], highlight: "e-f" },
  { layers: ["feedback"], arrows: ["e-f"], highlight: "feedback" },
  { layers: ["feedback", "sense"], arrows: ["f-s"], highlight: "f-s" },
  { layers: ["sense", "algo", "exec", "feedback"], arrows: ["s-a", "a-e", "e-f", "f-s"], highlight: null },
];

const STEP_INFO = [
  { title: "自适应通信闭环", desc: "UOCC 系统核心：感知-算法-执行-反馈四层闭环，动态适应水下信道变化。" },
  { title: "感知层：相机采集", desc: "双目相机连续采集接收帧，提取亮度、对比度等信道特征。" },
  { title: "感知 → 算法", desc: "原始帧数据传入算法层，包含当前 RSSI、帧质量等信息。" },
  { title: "算法层：自适应控制", desc: "阻尼多状态机计算最优 ISO/曝光参数，OOK 阈值判决，MIMO 合并策略选择。" },
  { title: "算法 → 执行", desc: "向发射端/接收端下发控制指令：切换 LED 功率支路、调整相机参数。" },
  { title: "执行层：LED/增益调整", desc: "发射端切换 10W/3.3W 支路，接收端更新 ISO 增益和曝光时间。" },
  { title: "执行 → 反馈", desc: "执行完成后，将实际 RSSI 和 BER 反馈给评估模块。" },
  { title: "反馈层：信道质量评估", desc: "对比目标 RSSI 与实际值，计算误差，决定是否需要进一步调整。" },
  { title: "反馈 → 感知", desc: "反馈结果指导下一帧的感知重点：更新阈值、调整采样策略。" },
  { title: "闭环稳态", desc: "系统进入稳态：所有四层持续协同工作，BER < 10⁻⁴，实时适应信道变化。" },
];

function getLayerById(id: string) {
  return LAYERS.find((l) => l.id === id)!;
}

function getArrowPath(fromId: string, toId: string): string {
  const from = getLayerById(fromId);
  const to = getLayerById(toId);
  // 用二次贝塞尔曲线，控制点指向中心
  const cx = 250;
  const cy = 220;
  const dx = (to.x - from.x) * 0.15;
  const dy = (to.y - from.y) * 0.15;
  const startX = from.x + (cx - from.x) * 0.45;
  const startY = from.y + (cy - from.y) * 0.45;
  const endX = to.x + (cx - to.x) * 0.45;
  const endY = to.y + (cy - to.y) * 0.45;
  return `M ${startX} ${startY} Q ${cx + dx} ${cy + dy} ${endX} ${endY}`;
}

// 计算箭头终点位置（用于 marker）
function getArrowEndpoint(fromId: string, toId: string): { x: number; y: number } {
  const cx = 250;
  const cy = 220;
  const to = getLayerById(toId);
  const endX = to.x + (cx - to.x) * 0.45;
  const endY = to.y + (cy - to.y) * 0.45;
  return { x: endX, y: endY };
}

// 信号粒子：沿箭头路径飞动的动画点
function SignalParticle({ fromId, toId, delay = 0 }: { fromId: string; toId: string; delay?: number }) {
  const from = getLayerById(fromId);
  const to = getLayerById(toId);
  const cx = 250;
  const cy = 220;
  const startX = from.x + (cx - from.x) * 0.45;
  const startY = from.y + (cy - from.y) * 0.45;
  const midX = cx + (to.x - from.x) * 0.15;
  const midY = cy + (to.y - from.y) * 0.15;
  const endX = to.x + (cx - to.x) * 0.45;
  const endY = to.y + (cy - to.y) * 0.45;

  return (
    <motion.circle
      r={4}
      fill={getLayerById(toId).color}
      filter="url(#particle-glow)"
      initial={{ opacity: 0 }}
      animate={{
        opacity: [0, 1, 1, 0],
        x: [startX, midX, endX],
        y: [startY, midY, endY],
      }}
      transition={{
        duration: 1.2,
        delay,
        repeat: Infinity,
        repeatDelay: 1.2,
        ease: "easeInOut",
      }}
    />
  );
}

export default function SystemOverview({ title }: { title?: string }) {
  const {
    currentStep, totalSteps, next, prev, reset, isPlaying, toggleAutoPlay,
  } = useSteppedVisualization({ totalSteps: 10, autoPlayInterval: 2800 });

  const palette = useSvgPalette();
  const active = ACTIVE_PER_STEP[currentStep];
  const stepInfo = STEP_INFO[currentStep];

  return (
    <section className="min-h-[500px] space-y-4">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        {title || "系统概览：自适应闭环"}
      </h2>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mb-2 font-mono text-xs text-zinc-400 dark:text-zinc-500">
          Adaptive Closed-Loop Control
        </div>

        <svg
          viewBox="0 0 500 440"
          className="w-full rounded-md border border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950"
          style={{ minHeight: 340 }}
        >
          <defs>
            <filter id="layer-glow">
              <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="currentColor" floodOpacity="0.7" />
            </filter>
            <filter id="particle-glow">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="white" floodOpacity="0.9" />
            </filter>
            <marker id="ov-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill={palette.arrowFill} />
            </marker>
            <marker id="ov-arrow-active" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#3b82f6" />
            </marker>
          </defs>

          {/* 中心标签 */}
          <motion.g
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            <circle cx={250} cy={220} r={52} fill={palette.bgSubtle} stroke={palette.nodeStroke} strokeWidth="1.5" strokeDasharray="4 3" />
            <text x={250} y={215} textAnchor="middle" fontSize="11" fontWeight="700" fill={palette.nodeText}>UOCC</text>
            <text x={250} y={231} textAnchor="middle" fontSize="9" fill={palette.labelFill}>自适应闭环</text>
          </motion.g>

          {/* 箭头路径 */}
          {ARROWS.map((arrow) => {
            const isActive = active.arrows.includes(arrow.id);
            const d = getArrowPath(arrow.from, arrow.to);
            // 标签位置：路径中点
            const fromL = getLayerById(arrow.from);
            const toL = getLayerById(arrow.to);
            const labelX = (fromL.x + toL.x) / 2 + (250 - (fromL.x + toL.x) / 2) * 0.3;
            const labelY = (fromL.y + toL.y) / 2 + (220 - (fromL.y + toL.y) / 2) * 0.3;
            return (
              <g key={arrow.id}>
                <motion.path
                  d={d}
                  fill="none"
                  strokeWidth={isActive ? 2.5 : 1.5}
                  markerEnd={isActive ? "url(#ov-arrow-active)" : "url(#ov-arrow)"}
                  animate={{
                    stroke: isActive ? "#3b82f6" : palette.edgeStroke,
                    strokeWidth: isActive ? 2.5 : 1.5,
                  }}
                  transition={{ duration: 0.4 }}
                />
                <AnimatePresence>
                  {isActive && (
                    <motion.text
                      key={`label-${arrow.id}`}
                      x={labelX}
                      y={labelY - 6}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="600"
                      fill="#3b82f6"
                      initial={{ opacity: 0, y: labelY }}
                      animate={{ opacity: 1, y: labelY - 6 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      {arrow.label}
                    </motion.text>
                  )}
                </AnimatePresence>
              </g>
            );
          })}

          {/* 信号粒子（最后一步全部激活） */}
          <AnimatePresence>
            {currentStep === 9 && (
              <motion.g key="particles" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {ARROWS.map((a, i) => (
                  <SignalParticle key={a.id} fromId={a.from} toId={a.to} delay={i * 0.6} />
                ))}
              </motion.g>
            )}
          </AnimatePresence>

          {/* 各层节点 */}
          {LAYERS.map((layer) => {
            const isActive = active.layers.includes(layer.id);
            const isFullActive = currentStep === 9;
            return (
              <motion.g key={layer.id}>
                {/* 外圈光晕 */}
                <AnimatePresence>
                  {isActive && (
                    <motion.circle
                      key={`glow-${layer.id}`}
                      cx={layer.x}
                      cy={layer.y}
                      r={46}
                      fill={layer.color}
                      fillOpacity={0.15}
                      initial={{ scale: 0.7, opacity: 0 }}
                      animate={{ scale: [1, 1.12, 1], opacity: [0.15, 0.3, 0.15] }}
                      exit={{ scale: 0.7, opacity: 0 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    />
                  )}
                </AnimatePresence>

                {/* 主圆 */}
                <motion.circle
                  cx={layer.x}
                  cy={layer.y}
                  r={40}
                  animate={{
                    fill: isActive ? layer.color : palette.nodeFill,
                    stroke: isActive ? layer.color : palette.nodeStroke,
                  }}
                  strokeWidth={isActive ? 2.5 : 1.5}
                  transition={{ duration: 0.4 }}
                />

                {/* 文字 */}
                <motion.text
                  x={layer.x}
                  y={layer.y - 7}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  animate={{ fill: isActive ? "#ffffff" : palette.nodeText }}
                  transition={{ duration: 0.3 }}
                >
                  {layer.label}
                </motion.text>
                <motion.text
                  x={layer.x}
                  y={layer.y + 10}
                  textAnchor="middle"
                  fontSize="9"
                  animate={{ fill: isActive ? "rgba(255,255,255,0.85)" : palette.labelFill }}
                  transition={{ duration: 0.3 }}
                >
                  {layer.sublabel}
                </motion.text>
              </motion.g>
            );
          })}
        </svg>

        {/* 进度指示 */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="mt-3 rounded-lg bg-zinc-50 px-4 py-3 dark:bg-zinc-800"
          >
            <div className="grid grid-cols-4 gap-2">
              {LAYERS.map((layer) => {
                const isActive = ACTIVE_PER_STEP[currentStep].layers.includes(layer.id);
                return (
                  <div
                    key={layer.id}
                    className="rounded-md px-2 py-1.5 text-center transition-all duration-300"
                    style={{
                      background: isActive ? `${layer.color}22` : undefined,
                      border: `1px solid ${isActive ? layer.color : "transparent"}`,
                    }}
                  >
                    <div className="font-mono text-[9px]" style={{ color: isActive ? layer.color : palette.labelFill }}>
                      {layer.label}
                    </div>
                    <div
                      className="mt-0.5 h-1 rounded-full transition-all duration-500"
                      style={{ background: isActive ? layer.color : "#e4e4e7" }}
                    />
                  </div>
                );
              })}
            </div>
          </motion.div>
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
        stepTitle={stepInfo.title}
        stepDescription={stepInfo.desc}
      />
    </section>
  );
}
