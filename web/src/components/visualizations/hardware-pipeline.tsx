"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useSteppedVisualization } from "@/hooks/useSteppedVisualization";
import { StepControls } from "@/components/visualizations/shared/step-controls";
import { useSvgPalette } from "@/hooks/useDarkMode";

// 发射端模块
const TX_STAGES = [
  { id: "text", label: "文字输入", sublabel: "\"Hello\"", x: 60, color: "#3b82f6" },
  { id: "utf8", label: "UTF-8", sublabel: "编码", x: 160, color: "#8b5cf6" },
  { id: "ook", label: "OOK", sublabel: "调制", x: 260, color: "#10b981" },
  { id: "rll", label: "RLL", sublabel: "4B6B", x: 360, color: "#f59e0b" },
];

// 接收端模块
const RX_STAGES = [
  { id: "camera", label: "双目相机", sublabel: "采集", x: 60, color: "#3b82f6" },
  { id: "gain", label: "自适应增益", sublabel: "ISO/曝光", x: 180, color: "#10b981" },
  { id: "demod", label: "OOK 解调", sublabel: "阈值判决", x: 300, color: "#f59e0b" },
  { id: "decode", label: "RLL 解码", sublabel: "4B6B逆变换", x: 400, color: "#ef4444" },
];

// LED 功率支路
const LED_BRANCHES = [
  { id: "10w", label: "10W LED", sublabel: "远距/强光", color: "#f59e0b", power: 10 },
  { id: "3w", label: "3.3W LED", sublabel: "近距/省电", color: "#3b82f6", power: 3.3 },
];

// 每步激活的元素
interface StepCfg {
  txActive: string[];
  rxActive: string[];
  ledActive: string | null;
  showBeam: boolean;
  showMimo: boolean;
}

const STEP_CONFIG: StepCfg[] = [
  { txActive: [], rxActive: [], ledActive: null, showBeam: false, showMimo: false },
  { txActive: ["text"], rxActive: [], ledActive: null, showBeam: false, showMimo: false },
  { txActive: ["text", "utf8"], rxActive: [], ledActive: null, showBeam: false, showMimo: false },
  { txActive: ["utf8", "ook"], rxActive: [], ledActive: null, showBeam: false, showMimo: false },
  { txActive: ["ook", "rll"], rxActive: [], ledActive: null, showBeam: false, showMimo: false },
  { txActive: ["rll"], rxActive: [], ledActive: "10w", showBeam: false, showMimo: false },
  { txActive: [], rxActive: [], ledActive: "10w", showBeam: true, showMimo: false },
  { txActive: [], rxActive: ["camera"], ledActive: null, showBeam: true, showMimo: false },
  { txActive: [], rxActive: ["camera", "gain"], ledActive: null, showBeam: false, showMimo: false },
  { txActive: [], rxActive: ["gain", "demod"], ledActive: null, showBeam: false, showMimo: false },
  { txActive: [], rxActive: ["demod", "decode"], ledActive: null, showBeam: false, showMimo: false },
  { txActive: [], rxActive: ["decode"], ledActive: null, showBeam: false, showMimo: true },
];

const STEP_INFO = [
  { title: "UOCC 硬件全链路", desc: "发射端 → LED → 水下信道 → 接收端，端到端信号流演示。" },
  { title: "文字输入", desc: "发送\"Hello\"等文字，进入 UTF-8 编码模块。" },
  { title: "UTF-8 编码", desc: "将文字转换为字节序列：H=0x48, e=0x65, l=0x6C, l=0x6C, o=0x6F。" },
  { title: "OOK 调制", desc: "字节序列调制为 LED 开关控制信号：bit=1 开，bit=0 关。" },
  { title: "RLL 4B6B 编码", desc: "4B6B 编码保证直流平衡，防止连续相同比特造成时钟丢失。" },
  { title: "LED 功率选择", desc: "根据水体浑浊度和距离，自动选择 10W 支路（远距）或 3.3W 支路（近距省电）。当前：10W 支路。" },
  { title: "LED 光信号发射", desc: "LED 按 OOK 时序闪烁，光信号进入水下信道，穿越最多 3m 水柱。" },
  { title: "双目相机采集", desc: "接收端 Jetson Orin NX 驱动双目相机，连续采集帧，提取 LED 区域亮度。" },
  { title: "自适应增益控制", desc: "阻尼多状态机根据 RSSI 动态调整 ISO/曝光，确保信号不过曝/欠曝。" },
  { title: "OOK 解调", desc: "对每帧做阈值判决，亮度 > threshold → bit=1，否则 bit=0。" },
  { title: "RLL 解码 → 文字输出", desc: "4B6B 逆变换恢复原始字节流，再经 UTF-8 解码还原为文字。" },
  { title: "MIMO 双路合并", desc: "左右摄像头独立解调后通过 MRC/EGC/SC 合并，提升抗干扰能力。" },
];

// 光束粒子组件
function LightBeam({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <AnimatePresence>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 8,
            height: 8,
            background: "#fbbf24",
            top: "50%",
            left: "10%",
            boxShadow: "0 0 8px 4px #fbbf2480",
          }}
          initial={{ opacity: 0, x: 0, y: -4 }}
          animate={{
            opacity: [0, 1, 1, 0],
            x: ["0%", "80%"],
            y: ["-50%", "-50%"],
          }}
          transition={{
            duration: 1.4,
            delay: i * 0.45,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </AnimatePresence>
  );
}

export default function HardwarePipeline({ title }: { title?: string }) {
  const {
    currentStep, totalSteps, next, prev, reset, isPlaying, toggleAutoPlay,
  } = useSteppedVisualization({ totalSteps: 12, autoPlayInterval: 2400 });

  const palette = useSvgPalette();
  const cfg = STEP_CONFIG[currentStep];
  const stepInfo = STEP_INFO[currentStep];

  return (
    <section className="min-h-[500px] space-y-4">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        {title || "硬件全链路：发射端 → 接收端"}
      </h2>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mb-3 font-mono text-xs text-zinc-400 dark:text-zinc-500">
          Transmitter → Underwater Channel → Receiver
        </div>

        {/* 发射端 */}
        <div className="mb-4">
          <div className="mb-2 font-mono text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
            TX  发射端
          </div>
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {TX_STAGES.map((stage, i) => {
              const isActive = cfg.txActive.includes(stage.id);
              return (
                <div key={stage.id} className="flex items-center">
                  <motion.div
                    className="flex min-w-[68px] flex-col items-center gap-0.5 rounded-lg px-2 py-2"
                    animate={{
                      backgroundColor: isActive ? `${stage.color}22` : "transparent",
                      borderColor: isActive ? stage.color : palette.nodeStroke,
                      scale: isActive ? 1.06 : 1,
                    }}
                    style={{ border: "1.5px solid" }}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.div
                      className="font-mono text-xs font-bold"
                      animate={{ color: isActive ? stage.color : palette.nodeText }}
                      transition={{ duration: 0.25 }}
                    >
                      {stage.label}
                    </motion.div>
                    <div className="font-mono text-[9px] text-zinc-400">{stage.sublabel}</div>
                    {isActive && (
                      <motion.div
                        className="mt-0.5 h-0.5 w-full rounded-full"
                        style={{ background: stage.color }}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.3 }}
                      />
                    )}
                  </motion.div>
                  {i < TX_STAGES.length - 1 && (
                    <motion.div
                      className="mx-0.5 text-sm"
                      animate={{
                        color: cfg.txActive.includes(TX_STAGES[i].id) && cfg.txActive.includes(TX_STAGES[i + 1].id)
                          ? "#3b82f6" : palette.edgeStroke,
                      }}
                    >
                      →
                    </motion.div>
                  )}
                </div>
              );
            })}

            {/* LED 功率选择 */}
            <div className="ml-2 flex items-center gap-1">
              <span className="text-sm" style={{ color: palette.edgeStroke }}>→</span>
              <div className="flex flex-col gap-1">
                {LED_BRANCHES.map((branch) => {
                  const isActive = cfg.ledActive === branch.id;
                  return (
                    <motion.div
                      key={branch.id}
                      className="flex items-center gap-1 rounded-lg px-2 py-1"
                      animate={{
                        backgroundColor: isActive ? `${branch.color}22` : "transparent",
                        borderColor: isActive ? branch.color : palette.nodeStroke,
                        scale: isActive ? 1.08 : 0.96,
                      }}
                      style={{ border: "1.5px solid" }}
                      transition={{ duration: 0.3, type: "spring", stiffness: 300 }}
                    >
                      {/* LED 灯泡图标 */}
                      <motion.div
                        className="h-3.5 w-3.5 rounded-full"
                        animate={{
                          backgroundColor: isActive ? branch.color : palette.nodeFill,
                          boxShadow: isActive ? `0 0 8px 3px ${branch.color}80` : "none",
                        }}
                        transition={{ duration: 0.25 }}
                      />
                      <div>
                        <div className="font-mono text-[10px] font-bold" style={{ color: isActive ? branch.color : palette.nodeText }}>
                          {branch.label}
                        </div>
                        <div className="font-mono text-[8px] text-zinc-400">{branch.sublabel}</div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 水下信道 */}
        <div className="relative mb-4 overflow-hidden rounded-xl" style={{ height: 52 }}>
          <div className="absolute inset-0 rounded-xl" style={{ background: "linear-gradient(90deg, #0369a122 0%, #0ea5e944 50%, #0369a122 100%)", border: "1px solid #0ea5e933" }} />
          <div className="absolute inset-0 flex items-center justify-between px-4">
            <span className="font-mono text-[10px] text-sky-500/70 dark:text-sky-400/60">发射端</span>
            <div className="flex flex-1 items-center justify-center gap-2">
              <motion.span
                className="font-mono text-[10px] font-semibold text-sky-500 dark:text-sky-400"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                ～ 水下信道（≤ 3m）～
              </motion.span>
            </div>
            <span className="font-mono text-[10px] text-sky-500/70 dark:text-sky-400/60">接收端</span>
          </div>
          {/* 光束动画 */}
          <div className="absolute inset-0 flex items-center">
            <LightBeam active={cfg.showBeam} />
          </div>
        </div>

        {/* 接收端 */}
        <div className="mb-2">
          <div className="mb-2 font-mono text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
            RX  接收端
          </div>
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {RX_STAGES.map((stage, i) => {
              const isActive = cfg.rxActive.includes(stage.id);
              return (
                <div key={stage.id} className="flex items-center">
                  <motion.div
                    className="flex min-w-[80px] flex-col items-center gap-0.5 rounded-lg px-2 py-2"
                    animate={{
                      backgroundColor: isActive ? `${stage.color}22` : "transparent",
                      borderColor: isActive ? stage.color : palette.nodeStroke,
                      scale: isActive ? 1.06 : 1,
                    }}
                    style={{ border: "1.5px solid" }}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.div
                      className="text-center font-mono text-[10px] font-bold"
                      animate={{ color: isActive ? stage.color : palette.nodeText }}
                    >
                      {stage.label}
                    </motion.div>
                    <div className="font-mono text-[8px] text-zinc-400">{stage.sublabel}</div>
                    {isActive && (
                      <motion.div
                        className="mt-0.5 h-0.5 w-full rounded-full"
                        style={{ background: stage.color }}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.3 }}
                      />
                    )}
                  </motion.div>
                  {i < RX_STAGES.length - 1 && (
                    <motion.div
                      className="mx-0.5 text-sm"
                      animate={{
                        color: cfg.rxActive.includes(RX_STAGES[i].id) && cfg.rxActive.includes(RX_STAGES[i + 1].id)
                          ? "#3b82f6" : palette.edgeStroke,
                      }}
                    >
                      →
                    </motion.div>
                  )}
                </div>
              );
            })}

            {/* MIMO 输出 */}
            <AnimatePresence>
              {cfg.showMimo && (
                <motion.div
                  key="mimo"
                  className="ml-2 flex items-center gap-1"
                  initial={{ opacity: 0, x: 12, scale: 0.85 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, type: "spring", bounce: 0.3 }}
                >
                  <span className="text-sm text-emerald-400">→</span>
                  <div className="rounded-lg border border-emerald-400 bg-emerald-50 px-2 py-1.5 dark:border-emerald-700 dark:bg-emerald-950/40">
                    <div className="font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400">MIMO 合并</div>
                    <div className="font-mono text-[8px] text-emerald-500">MRC/EGC/SC</div>
                  </div>
                  <span className="text-sm text-emerald-400">→</span>
                  <motion.div
                    className="rounded-lg border border-emerald-300 bg-emerald-100 px-2 py-1.5 dark:border-emerald-700 dark:bg-emerald-900/40"
                    animate={{ scale: [1, 1.06, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <div className="font-mono text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                      \"Hello\" ✓
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* 关键参数卡片 */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            className="mt-3 grid grid-cols-3 gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {[
              { label: "发射功率", value: cfg.ledActive === "10w" ? "10W" : cfg.ledActive === "3w" ? "3.3W" : "—", color: "#f59e0b" },
              { label: "信道距离", value: "≤ 3m", color: "#0ea5e9" },
              { label: "目标 BER", value: "< 10⁻⁴", color: "#10b981" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-center dark:border-zinc-700 dark:bg-zinc-800">
                <div className="font-mono text-[9px] text-zinc-400">{stat.label}</div>
                <div className="font-mono text-sm font-bold" style={{ color: stat.color }}>{stat.value}</div>
              </div>
            ))}
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
