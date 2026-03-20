"use client";

import { motion } from "framer-motion";
import { useSteppedVisualization } from "@/hooks/useSteppedVisualization";
import { StepControls } from "@/components/visualizations/shared/step-controls";
import { useSvgPalette } from "@/hooks/useDarkMode";

const STRATEGIES = [
  { id: "egc", label: "EGC", name: "等增益合并", color: "#3b82f6" },
  { id: "sc", label: "SC", name: "选择性合并", color: "#10b981" },
  { id: "mrc", label: "MRC", name: "最大比合并", color: "#f59e0b" },
];

const STEP_INFO = [
  { title: "MIMO 空间分集合并", desc: "双目相机双接收分支，通过三种合并策略对抗多径衰落。" },
  { title: "双分支接收", desc: "Branch A 和 Branch B 分别接收信号，SNR_A=10dB, SNR_B=15dB。" },
  { title: "EGC 等增益合并", desc: "各分支等权重、相位对齐后叠加：r = w₁·r₁ + w₂·r₂，|w|=1" },
  { title: "EGC 输出", desc: "合并增益中等，计算复杂度低，无需信道估计。" },
  { title: "SC 选择性合并", desc: "选择 SNR 最高的分支：r = r_k, k = argmax(SNR_i)。SNR_B > SNR_A。" },
  { title: "SC 输出", desc: "实现最简单，但浪费了另一分支的分集增益。" },
  { title: "MRC 最大比合并", desc: "按 SNR 加权：w_i = SNR_i / ΣSNR_j。w_A=0.4, w_B=0.6。" },
  { title: "MRC 输出", desc: "理论最优合并，需要精确估计各分支 SNR。" },
  { title: "策略对比", desc: "MRC 理论最优但计算最复杂；SC 最简单但增益最低；EGC 居中。" },
];

const SNR_A = 10;
const SNR_B = 15;
const TOTAL_SNR = SNR_A + SNR_B;
const W_A = SNR_A / TOTAL_SNR;
const W_B = SNR_B / TOTAL_SNR;

export default function MIMOCombining({ title }: { title?: string }) {
  const {
    currentStep,
    totalSteps,
    next,
    prev,
    reset,
    isPlaying,
    toggleAutoPlay,
  } = useSteppedVisualization({ totalSteps: 9, autoPlayInterval: 4000 });

  const palette = useSvgPalette();
  const stepInfo = STEP_INFO[currentStep];

  const showBranches = currentStep >= 1;
  const showEGC = currentStep >= 2 && currentStep <= 3;
  const showSC = currentStep >= 4 && currentStep <= 5;
  const showMRC = currentStep >= 6 && currentStep <= 7;
  const showCompare = currentStep === 8;

  return (
    <section className="min-h-[500px] space-y-4">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        {title || "MIMO 空间分集合并"}
      </h2>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mb-2 font-mono text-xs text-zinc-400 dark:text-zinc-500">
          MIMO Spatial Diversity Combining
        </div>

        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="w-full lg:w-[60%]">
            <svg
              viewBox="0 0 520 420"
              aria-label="MIMO合并策略可视化"
              className="w-full rounded-md border border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950"
              style={{ minHeight: 380 }}
            >
              <defs>
                <filter id="mimo-glow-blue">
                  <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#3b82f6" floodOpacity="0.7" />
                </filter>
                <filter id="mimo-glow-green">
                  <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#10b981" floodOpacity="0.7" />
                </filter>
                <filter id="mimo-glow-amber">
                  <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#f59e0b" floodOpacity="0.7" />
                </filter>
                <marker id="mimo-arrow" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
                  <polygon points="0 0, 7 2.5, 0 5" fill={palette.arrowFill} />
                </marker>
                <marker id="mimo-arrow-active" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
                  <polygon points="0 0, 7 2.5, 0 5" fill="#3b82f6" />
                </marker>
              </defs>

              {showBranches && (
                <>
                  <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
                    <rect x="30" y="60" width="100" height="50" rx="8" fill={palette.nodeFill} stroke={palette.nodeStroke} strokeWidth="1.5" />
                    <text x="80" y="89" textAnchor="middle" fontSize="11" fontWeight="700" fill={palette.nodeText}>Branch A</text>
                    <text x="80" y="104" textAnchor="middle" fontSize="9" fill={palette.nodeText}>左相机</text>
                  </motion.g>
                  <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.1 }}>
                    <rect x="30" y="200" width="100" height="50" rx="8" fill={palette.nodeFill} stroke={palette.nodeStroke} strokeWidth="1.5" />
                    <text x="80" y="229" textAnchor="middle" fontSize="11" fontWeight="700" fill={palette.nodeText}>Branch B</text>
                    <text x="80" y="244" textAnchor="middle" fontSize="9" fill={palette.nodeText}>右相机</text>
                  </motion.g>
                </>
              )}

              {showBranches && (
                <>
                  <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
                    <rect x="80" y="115" width="60" height="28" rx="6" fill="#1e40af" />
                    <text x="110" y="133" textAnchor="middle" fontSize="11" fontWeight="600" fill="#fff">SNR=10dB</text>
                  </motion.g>
                  <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.1 }}>
                    <rect x="80" y="255" width="60" height="28" rx="6" fill="#065f46" />
                    <text x="110" y="273" textAnchor="middle" fontSize="11" fontWeight="600" fill="#fff">SNR=15dB</text>
                  </motion.g>
                </>
              )}

              {(showEGC || showSC || showMRC) && (
                <>
                  <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
                    <rect
                      x="180" y="130" width="120" height="120" rx="10"
                      fill={palette.nodeFill} stroke={palette.nodeStroke} strokeWidth="1.5"
                      filter={`url(#mimo-glow-${showEGC ? "blue" : showSC ? "green" : "amber"})`}
                    />
                    <text x="240" y="158" textAnchor="middle" fontSize="13" fontWeight="700" fill={palette.nodeText}>
                      {showEGC ? "EGC" : showSC ? "SC" : "MRC"}
                    </text>
                    <text x="240" y="176" textAnchor="middle" fontSize="10" fill={palette.nodeText}>
                      {showEGC ? "等增益" : showSC ? "选择性" : "最大比"}
                    </text>
                    {showEGC && <>
                      <text x="240" y="200" textAnchor="middle" fontSize="9" fill={palette.nodeText}>w₁=w₂=1</text>
                      <text x="240" y="215" textAnchor="middle" fontSize="9" fill={palette.nodeText}>相位对齐</text>
                    </>}
                    {showSC && <>
                      <text x="240" y="200" textAnchor="middle" fontSize="9" fill={palette.nodeText}>选最佳</text>
                      <text x="240" y="215" textAnchor="middle" fontSize="9" fill={palette.nodeText}>SNR_B &gt; SNR_A</text>
                    </>}
                    {showMRC && <>
                      <text x="240" y="200" textAnchor="middle" fontSize="9" fill={palette.nodeText}>w_A={W_A.toFixed(2)}</text>
                      <text x="240" y="215" textAnchor="middle" fontSize="9" fill={palette.nodeText}>w_B={W_B.toFixed(2)}</text>
                    </>}
                  </motion.g>

                  <motion.path d="M 130 85 L 175 190" fill="none" stroke={showEGC ? "#3b82f6" : showSC ? "#10b981" : "#f59e0b"} strokeWidth="2" markerEnd="url(#mimo-arrow-active)" initial={{ opacity: 0, pathLength: 0 }} animate={{ opacity: 1, pathLength: 1 }} transition={{ duration: 0.5 }} />
                  <motion.path d="M 130 225 L 175 190" fill="none" stroke={showEGC ? "#3b82f6" : showSC ? "#10b981" : "#f59e0b"} strokeWidth="2" markerEnd="url(#mimo-arrow-active)" initial={{ opacity: 0, pathLength: 0 }} animate={{ opacity: 1, pathLength: 1 }} transition={{ duration: 0.5, delay: 0.1 }} />
                </>
              )}

              {(showEGC || showSC || showMRC) && (
                <>
                  <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.3 }}>
                    <rect x="340" y="155" width="120" height="70" rx="10" fill="#3b82f6" filter="url(#mimo-glow-blue)" />
                    <text x="400" y="180" textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff">Combined</text>
                    <text x="400" y="200" textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.8)">
                      {showEGC && "r = r_A + r_B"}
                      {showSC && "r = r_B"}
                      {showMRC && "r = 0.4·r_A + 0.6·r_B"}
                    </text>
                  </motion.g>
                  <motion.path d="M 300 190 L 335 190" fill="none" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#mimo-arrow-active)" initial={{ opacity: 0, pathLength: 0 }} animate={{ opacity: 1, pathLength: 1 }} transition={{ duration: 0.4, delay: 0.2 }} />
                </>
              )}

              {showCompare && (
                <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                  <rect x="40" y="60" width="440" height="300" rx="12" fill={palette.bgSubtle} stroke={palette.nodeStroke} strokeWidth="1.5" />
                  <text x="260" y="95" textAnchor="middle" fontSize="14" fontWeight="700" fill={palette.nodeText}>合并策略对比</text>

                  <rect x="60" y="115" width="100" height="30" rx="6" fill={STRATEGIES[0].color} />
                  <text x="110" y="134" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">EGC</text>
                  <rect x="180" y="115" width="100" height="30" rx="6" fill={STRATEGIES[1].color} />
                  <text x="230" y="134" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">SC</text>
                  <rect x="300" y="115" width="100" height="30" rx="6" fill={STRATEGIES[2].color} />
                  <text x="350" y="134" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">MRC</text>

                  <text x="60" y="170" fontSize="10" fill={palette.nodeText}>计算复杂度</text>
                  <rect x="60" y="180" width="80" height="12" rx="3" fill="#3b82f6" />
                  <rect x="180" y="180" width="50" height="12" rx="3" fill="#10b981" />
                  <rect x="300" y="180" width="100" height="12" rx="3" fill="#f59e0b" />

                  <text x="60" y="215" fontSize="10" fill={palette.nodeText}>SNR 增益</text>
                  <rect x="60" y="225" width="70" height="12" rx="3" fill="#3b82f6" />
                  <rect x="180" y="225" width="55" height="12" rx="3" fill="#10b981" />
                  <rect x="300" y="225" width="95" height="12" rx="3" fill="#f59e0b" />

                  <text x="60" y="260" fontSize="10" fill={palette.nodeText}>信道估计</text>
                  <text x="60" y="275" fontSize="9" fill={palette.nodeText}>不需要</text>
                  <text x="180" y="275" fontSize="9" fill={palette.nodeText}>需要(选分支)</text>
                  <text x="300" y="275" fontSize="9" fill={palette.nodeText}>需要(精确加权)</text>

                  <text x="60" y="310" fontSize="10" fill={palette.nodeText}>特点</text>
                  <text x="60" y="325" fontSize="9" fill={palette.nodeText}>等权相加</text>
                  <text x="180" y="325" fontSize="9" fill={palette.nodeText}>选最佳分支</text>
                  <text x="300" y="325" fontSize="9" fill={palette.nodeText}>按SNR加权</text>

                  <text x="60" y="345" fontSize="10" fill={palette.nodeText}>推荐度</text>
                  <text x="60" y="360" fontSize="9" fill={palette.nodeText}>★★★☆☆</text>
                  <text x="180" y="360" fontSize="9" fill={palette.nodeText}>★★☆☆☆</text>
                  <text x="300" y="360" fontSize="9" fill="#f59e0b">★★★★★</text>
                </motion.g>
              )}

              {!showBranches && (
                <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
                  <text x="260" y="200" textAnchor="middle" fontSize="16" fill={palette.nodeText}>双目相机双接收分支</text>
                  <text x="260" y="225" textAnchor="middle" fontSize="12" fill={palette.nodeText}>SNR_A = 10dB, SNR_B = 15dB</text>
                </motion.g>
              )}
            </svg>
          </div>

          <div className="w-full lg:w-[40%]">
            <div className="mb-3 font-mono text-xs text-zinc-400 dark:text-zinc-500">Branch SNR</div>
            <div className="mb-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-center dark:border-zinc-700 dark:bg-zinc-800">
                <div className="font-mono text-[10px] text-zinc-500">Branch A</div>
                <div className="font-mono text-xl font-bold text-blue-500">{SNR_A} dB</div>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-center dark:border-zinc-700 dark:bg-zinc-800">
                <div className="font-mono text-[10px] text-zinc-500">Branch B</div>
                <div className="font-mono text-xl font-bold text-emerald-500">{SNR_B} dB</div>
              </div>
            </div>

            <div className="mb-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800">
              <div className="mb-2 font-mono text-xs text-zinc-500">Total SNR</div>
              <div className="font-mono text-lg font-bold text-zinc-600 dark:text-zinc-300">{TOTAL_SNR} dB</div>
            </div>

            {(showEGC || showSC || showMRC) && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800"
              >
                <div className="mb-2 font-mono text-xs text-zinc-500">Active Strategy</div>
                <div className="text-lg font-bold" style={{ color: showEGC ? "#3b82f6" : showSC ? "#10b981" : "#f59e0b" }}>
                  {showEGC ? "EGC 等增益合并" : showSC ? "SC 选择性合并" : "MRC 最大比合并"}
                </div>
                <div className="mt-1 font-mono text-xs text-zinc-500">
                  {showEGC && "r = r_A + r_B"}
                  {showSC && "选择 Branch B (SNR_B > SNR_A)"}
                  {showMRC && `w_A=${W_A.toFixed(2)}, w_B=${W_B.toFixed(2)}`}
                </div>
              </motion.div>
            )}

            {showCompare && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800"
              >
                <div className="mb-2 font-mono text-xs text-zinc-500">Recommendation</div>
                <div className="text-sm font-bold text-amber-500">MRC 最优（需信道估计）</div>
                <div className="mt-1 font-mono text-xs text-zinc-500">EGC 适合信道估计困难场景</div>
              </motion.div>
            )}
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
