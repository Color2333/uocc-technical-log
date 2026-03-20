"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useSteppedVisualization } from "@/hooks/useSteppedVisualization";
import { StepControls } from "@/components/visualizations/shared/step-controls";
import { useSvgPalette } from "@/hooks/useDarkMode";

const COLS = 10;
const ROWS = 6;

// Which columns are "active" (being processed) at each step
function getActiveCols(step: number): number[] {
  if (step < 4) return [];
  if (step === 4) return [0, 1, 2];
  if (step === 5) return [0, 1, 2, 3, 4, 5];
  return Array.from({ length: COLS }, (_, i) => i);
}

function getDecodedCols(step: number): number[] {
  if (step < 7) return [];
  if (step === 7) return [0, 1, 2, 3];
  if (step === 8) return [0, 1, 2, 3, 4, 5, 6, 7];
  return Array.from({ length: COLS }, (_, i) => i);
}

const STEP_INFO = [
  { title: "CUDA 并行加速", desc: "Jetson Orin NX 上的 GPU 并行解调架构。" },
  { title: "接收帧到来", desc: "双目相机输出帧（1080p），进入 CPU 内存缓冲区。" },
  { title: "DMA 内存拷贝", desc: "cudaMemcpy 将帧数据从 CPU 拷贝到 GPU 显存，延迟约 1-2ms。" },
  { title: "OOK Kernel 启动", desc: "GPU 启动 kernel：每列像素分配一个线程块，线程内并行阈值判决。" },
  { title: "并行处理（25%）", desc: "前 3 列线程同时激活，对所有像素行并行执行阈值判决。" },
  { title: "并行处理（60%）", desc: "6 列并行运行，CPU 端此时可处理其他任务（重叠计算）。" },
  { title: "全列完成", desc: "所有 10 列完成解调，输出比特流。CPU 版需顺序处理约 100ms。" },
  { title: "RLL 解码 Kernel", desc: "4B6B 逆映射：每个 6-bit 符号并行查共享内存表，无依赖关系。" },
  { title: "解码完成", desc: "8 个符号块同时解码完成，输出 4-bit 数据。" },
  { title: "加速比总结", desc: "GPU 全流水线 < 10ms，CPU 基线 ~100ms，实测加速比 > 10×。" },
];

export default function CudaAcceleration({ title }: { title?: string }) {
  const { currentStep, totalSteps, next, prev, reset, isPlaying, toggleAutoPlay } =
    useSteppedVisualization({ totalSteps: 10, autoPlayInterval: 2800 });

  const palette = useSvgPalette();
  const activeCols = getActiveCols(currentStep);
  const decodedCols = getDecodedCols(currentStep);
  const showDma = currentStep >= 2;
  const showKernel = currentStep >= 3;
  const showRll = currentStep >= 7;
  const showSpeedup = currentStep === 9;

  const cellW = 36;
  const cellH = 22;
  const gridX = 20;
  const gridY = 60;

  return (
    <section className="min-h-[500px] space-y-4">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        {title || "CUDA 并行加速"}
      </h2>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mb-2 font-mono text-xs text-zinc-400 dark:text-zinc-500">
          Jetson Orin NX — GPU Kernel Visualization
        </div>

        <div className="flex flex-col gap-4 lg:flex-row">
          {/* GPU grid */}
          <div className="w-full lg:w-[60%]">
            <svg
              viewBox="0 0 400 260"
              className="w-full rounded-md border border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950"
              style={{ minHeight: 220 }}
            >
              {/* Frame label */}
              <text x="20" y="20" fontSize="9" fill={palette.nodeText} fontFamily="monospace">
                {currentStep >= 1 ? "INPUT FRAME (1080p)" : "待接收帧..."}
              </text>

              {/* Frame outline */}
              <motion.rect
                x={gridX} y={gridY - 35} width={COLS * cellW} height={28}
                rx="3" fill="none"
                stroke={currentStep >= 1 ? "#3b82f6" : palette.nodeStroke}
                strokeWidth="1"
                animate={{ opacity: currentStep >= 1 ? 1 : 0.3 }}
                transition={{ duration: 0.4 }}
              />
              <motion.text x={gridX + COLS * cellW / 2} y={gridY - 17}
                textAnchor="middle" fontSize="8" fill={currentStep >= 1 ? "#3b82f6" : palette.nodeText}
                animate={{ opacity: currentStep >= 1 ? 1 : 0.3 }}>
                CPU Memory Buffer
              </motion.text>

              {/* DMA arrow */}
              <AnimatePresence>
                {showDma && (
                  <motion.g key="dma"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    <motion.line
                      x1={gridX + COLS * cellW / 2} y1={gridY - 7}
                      x2={gridX + COLS * cellW / 2} y2={gridY - 1}
                      stroke="#f59e0b" strokeWidth="1.5"
                      animate={{ strokeDashoffset: [10, 0] }}
                      transition={{ duration: 0.5 }}
                    />
                    <text x={gridX + COLS * cellW / 2 + 4} y={gridY - 3}
                      fontSize="7" fill="#f59e0b">cudaMemcpy</text>
                  </motion.g>
                )}
              </AnimatePresence>

              {/* Pixel grid — OOK */}
              {Array.from({ length: ROWS }, (_, row) =>
                Array.from({ length: COLS }, (_, col) => {
                  const isActive = activeCols.includes(col);
                  const bit = (row * 3 + col * 7 + 2) % 2;
                  return (
                    <motion.rect
                      key={`cell-${row}-${col}`}
                      x={gridX + col * cellW + 1}
                      y={gridY + row * cellH + 1}
                      width={cellW - 2}
                      height={cellH - 2}
                      rx="2"
                      animate={{
                        fill: isActive
                          ? bit === 1 ? "#f59e0b" : "#1d4ed8"
                          : currentStep >= 1
                          ? bit === 1 ? "#d1d5db" : "#e5e7eb"
                          : palette.bgSubtle,
                        opacity: currentStep >= 1 ? 1 : 0.3,
                      }}
                      transition={{ duration: 0.25, delay: isActive ? col * 0.04 : 0 }}
                    />
                  );
                })
              )}

              {/* Column labels */}
              {activeCols.map((col) => (
                <motion.text
                  key={`colLabel-${col}`}
                  x={gridX + col * cellW + cellW / 2}
                  y={gridY + ROWS * cellH + 12}
                  textAnchor="middle"
                  fontSize="7"
                  fill="#f59e0b"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: col * 0.04 }}
                >
                  T{col}
                </motion.text>
              ))}

              {/* Kernel banner */}
              <AnimatePresence>
                {showKernel && (
                  <motion.g key="kernelbanner"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <rect x={gridX} y={gridY + ROWS * cellH + 18} width={COLS * cellW} height={16}
                      rx="3" fill="#1d4ed8" opacity="0.85" />
                    <text x={gridX + COLS * cellW / 2} y={gridY + ROWS * cellH + 29}
                      textAnchor="middle" fontSize="8" fill="#fff" fontWeight="700">
                      ook_demodulate_kernel &lt;&lt;&lt;{COLS}, {ROWS}&gt;&gt;&gt;
                    </text>
                  </motion.g>
                )}
              </AnimatePresence>

              {/* RLL row */}
              <AnimatePresence>
                {showRll && (
                  <motion.g key="rll"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    <text x={20} y={220} fontSize="8" fill={palette.nodeText}>RLL 解码 Kernel：</text>
                    {Array.from({ length: COLS }, (_, i) => (
                      <motion.rect key={`rll-${i}`}
                        x={20 + i * 34} y={226} width={30} height={18} rx="3"
                        animate={{
                          fill: decodedCols.includes(i) ? "#10b981" : palette.bgSubtle,
                        }}
                        transition={{ duration: 0.2, delay: decodedCols.includes(i) ? i * 0.06 : 0 }}
                      />
                    ))}
                    {Array.from({ length: COLS }, (_, i) => (
                      <text key={`rll-t-${i}`} x={35 + i * 34} y={238}
                        textAnchor="middle" fontSize="7"
                        fill={decodedCols.includes(i) ? "#fff" : palette.nodeText}>
                        {decodedCols.includes(i) ? "✓" : "…"}
                      </text>
                    ))}
                  </motion.g>
                )}
              </AnimatePresence>

              {/* Speedup badge */}
              <AnimatePresence>
                {showSpeedup && (
                  <motion.g key="speedup"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: "spring", stiffness: 280, damping: 18 }}
                  >
                    <rect x={310} y={10} width={78} height={50} rx="8"
                      fill="#10b981" opacity="0.9" />
                    <text x={349} y={30} textAnchor="middle" fontSize="10"
                      fill="#fff" fontWeight="700">加速比</text>
                    <text x={349} y={52} textAnchor="middle" fontSize="22"
                      fill="#fff" fontWeight="900">&gt;10×</text>
                  </motion.g>
                )}
              </AnimatePresence>
            </svg>
          </div>

          {/* Right panel */}
          <div className="w-full lg:w-[40%] space-y-3">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800">
              <div className="mb-2 font-mono text-[10px] text-zinc-500">Pipeline Stage</div>
              <div className="space-y-2">
                {[
                  { label: "CPU → GPU DMA", done: currentStep >= 2, color: "#f59e0b" },
                  { label: "OOK Kernel", done: currentStep >= 3, color: "#3b82f6" },
                  { label: "并行阈值判决", done: currentStep >= 6, color: "#6366f1" },
                  { label: "RLL Kernel", done: currentStep >= 7, color: "#10b981" },
                  { label: "输出比特流", done: currentStep >= 9, color: "#ec4899" },
                ].map((stage) => (
                  <div key={stage.label} className="flex items-center gap-2">
                    <motion.div
                      className="h-2 w-2 rounded-full flex-shrink-0"
                      animate={{ backgroundColor: stage.done ? stage.color : "#52525b" }}
                      transition={{ duration: 0.3 }}
                    />
                    <span className={`font-mono text-xs ${stage.done ? "text-zinc-200" : "text-zinc-500"}`}>
                      {stage.label}
                    </span>
                    {stage.done && (
                      <motion.span
                        className="ml-auto font-mono text-[10px]"
                        style={{ color: stage.color }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        ✓
                      </motion.span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800">
              <div className="mb-1 font-mono text-[10px] text-zinc-500">性能目标</div>
              <div className="space-y-1 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-400">GPU 延迟</span>
                  <span className="text-green-400">&lt; 10ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">帧率</span>
                  <span className="text-blue-400">≥ 30 fps</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">加速比</span>
                  <span className="text-amber-400">&gt; 10×</span>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {activeCols.length > 0 && (
                <motion.div
                  key="threads"
                  className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/40"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="font-mono text-[10px] text-blue-500">
                    活跃线程块：{activeCols.length} / {COLS}
                  </div>
                  <div className="mt-1 font-mono text-xs text-blue-300">
                    {activeCols.length * ROWS} 线程并行运行
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
        stepTitle={STEP_INFO[currentStep].title}
        stepDescription={STEP_INFO[currentStep].desc}
      />
    </section>
  );
}
