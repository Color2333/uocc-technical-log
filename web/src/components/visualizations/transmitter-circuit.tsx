"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useSteppedVisualization } from "@/hooks/useSteppedVisualization";
import { StepControls } from "@/components/visualizations/shared/step-controls";
import { useSvgPalette } from "@/hooks/useDarkMode";

// ─── Step metadata ────────────────────────────────────────────────────────

const STEP_INFO = [
  {
    title: "发射端电路设计",
    desc: "LED驱动电路两个版本：v1 简单 NMOS 原型，v3.0 光耦隔离 P-MOS 最终方案。",
    badge: "",
  },
  {
    title: "v1 简单电路",
    desc: "Jetson GPIO(3.3V) 通过 R1(10kΩ) 驱动 N-MOSFET 栅极，导通后点亮蓝光 LED。结构简单，适合初期原型验证。",
    badge: "v1",
  },
  {
    title: "v1 电流路径",
    desc: "GPIO=HIGH → NMOS 导通 → 电流：5V → 蓝光 LED → R_lim → MOSFET → GND。\n⚠ 问题：控制地与电源地共地，电源噪声可反串到 Jetson。",
    badge: "v1 ⚠",
  },
  {
    title: "v3.0 — 光耦隔离",
    desc: "EL817 光电耦合器将 Jetson 控制信号与 10W 大功率驱动电路完全隔离。Jetson GND ≠ 电源 GND，保护主控安全。",
    badge: "v3.0 ✓",
  },
  {
    title: "控制路径：GPIO → R1 → EL817",
    desc: "Jetson GPIO(3.3V) → R1(300Ω) 限流 → EL817 内部 LED 导通 → 发出红外光，驱动内部光电晶体管。",
    badge: "控制侧",
  },
  {
    title: "栅极驱动：EL817 → R2 → Gate",
    desc: "光电晶体管导通时，集电极经 R2(2kΩ) 将 P-MOS 栅极拉低；R3(10kΩ) 从 12V 上拉，确保默认关断（安全状态）。",
    badge: "栅极",
  },
  {
    title: "P-MOSFET 高边开关",
    desc: "P-MOS 源极接 12V（高边开关），默认 Gate ≈ 12V → 截止；GPIO 激活后 Gate 被拉低 → 导通 → 电流从 12V 流向负载。",
    badge: "MOSFET",
  },
  {
    title: "电源路径：CC Driver → 10W LED",
    desc: "恒流驱动器稳定 LED 工作电流（~700mA），抑制 12V 波动影响。10W 大功率 LED 作为水下光源，亮度稳定可控。",
    badge: "电源侧",
  },
  {
    title: "完整电路动态演示",
    desc: "GPIO HIGH → EL817 激活 → 栅极拉低 → P-MOS 导通 → 12V 经恒流驱动点亮 10W LED。",
    badge: "全流程",
  },
  {
    title: "设计总结",
    desc: "三项核心设计决策：\n① EL817 光耦（控制/电源隔离）\n② P-MOS 高边（低边 N-MOS 不够安全）\n③ 恒流驱动（亮度稳定 ≠ 稳压）",
    badge: "总结",
  },
];

// ─── Color palette ────────────────────────────────────────────────────────

const C = {
  ctrl:    "#3b82f6",  // blue — control path
  iso:     "#10b981",  // green — isolated signal (EL817 output side)
  power:   "#f59e0b",  // amber — power path (12V, LED)
  gate:    "#8b5cf6",  // purple — gate drive (R2, R3)
  gnd:     "#6b7280",  // gray — GND
  warn:    "#ef4444",  // red — warning highlight
  box:     "#1e3a5f",  // dark blue box fill
  text:    "#e2e8f0",  // light text
  dim:     "#374151",  // dim element
};

// ─── Wire path helper ─────────────────────────────────────────────────────

type Pt = { x: number; y: number };
function H(p: Pt, x2: number): string {
  return `M ${p.x} ${p.y} H ${x2}`;
}
function V2(p: Pt, y2: number): string {
  return `M ${p.x} ${p.y} V ${y2}`;
}
function L(pts: Pt[]): string {
  return "M " + pts.map((p) => `${p.x} ${p.y}`).join(" L ");
}

// ─── Animated current wire ────────────────────────────────────────────────

function CurrentWire({
  d,
  color,
  delay = 0,
  visible = true,
}: {
  d: string;
  color: string;
  delay?: number;
  visible?: boolean;
}) {
  if (!visible) return null;
  return (
    <motion.path
      d={d}
      stroke={color}
      strokeWidth={2.5}
      fill="none"
      strokeLinecap="round"
      strokeDasharray="10 6"
      animate={{ strokeDashoffset: [32, 0] }}
      transition={{ duration: 1.0, repeat: Infinity, ease: "linear", delay }}
    />
  );
}

// ─── Static wire ─────────────────────────────────────────────────────────

function Wire({
  d,
  color,
  width = 1.5,
  dash = false,
}: {
  d: string;
  color: string;
  width?: number;
  dash?: boolean;
}) {
  return (
    <path
      d={d}
      stroke={color}
      strokeWidth={width}
      fill="none"
      strokeLinecap="round"
      strokeDasharray={dash ? "4 3" : undefined}
    />
  );
}

// ─── Component box ────────────────────────────────────────────────────────

function CompBox({
  x, y, w, h,
  label,
  sublabel,
  color = C.ctrl,
  glow = false,
}: {
  x: number; y: number; w: number; h: number;
  label: string;
  sublabel?: string;
  color?: string;
  glow?: boolean;
}) {
  return (
    <g>
      <motion.rect
        x={x} y={y} width={w} height={h}
        rx={4}
        fill={color + "22"}
        stroke={color}
        strokeWidth={1.5}
        animate={glow ? { opacity: [0.7, 1, 0.7] } : { opacity: 1 }}
        transition={glow ? { duration: 1.2, repeat: Infinity } : undefined}
      />
      <text x={x + w / 2} y={y + h / 2 - (sublabel ? 5 : 0)} textAnchor="middle" dominantBaseline="middle" fontSize="8.5" fontFamily="monospace" fill={color} fontWeight="600">
        {label}
      </text>
      {sublabel && (
        <text x={x + w / 2} y={y + h / 2 + 8} textAnchor="middle" dominantBaseline="middle" fontSize="7.5" fontFamily="monospace" fill={color + "cc"}>
          {sublabel}
        </text>
      )}
    </g>
  );
}

// ─── Ground symbol ────────────────────────────────────────────────────────

function GndSymbol({ x, y, label, color = C.gnd }: { x: number; y: number; label?: string; color?: string }) {
  return (
    <g>
      <line x1={x} y1={y} x2={x} y2={y + 8} stroke={color} strokeWidth={1.5} />
      <line x1={x - 8} y1={y + 8} x2={x + 8} y2={y + 8} stroke={color} strokeWidth={1.5} />
      <line x1={x - 5} y1={y + 12} x2={x + 5} y2={y + 12} stroke={color} strokeWidth={1.5} />
      <line x1={x - 2} y1={y + 16} x2={x + 2} y2={y + 16} stroke={color} strokeWidth={1.5} />
      {label && (
        <text x={x + 12} y={y + 12} fontSize="7.5" fontFamily="monospace" fill={color}>
          {label}
        </text>
      )}
    </g>
  );
}

// ─── V1 Simple NMOS circuit ───────────────────────────────────────────────

function V1Circuit({ step }: { step: number }) {
  const showFlow = step === 2;
  const showLabels = step >= 1;

  // Layout for v1 (right-side power path + left control)
  // Power path: x=290, VCC(y=30) → LED(y=60-90) → R_lim(y=100-125) → NMOS drain(y=150) → source(y=205) → GND(y=235)
  // Control path: GPIO(x=30,y=177) → R1(x=75-160,y=167-187) → NMOS gate(x=230,y=177)
  const vccX = 290, ledY1 = 45, ledY2 = 80, rlimY1 = 90, rlimY2 = 120;
  const mosX = 250, mosY = 135, mosW = 80, mosH = 70;
  const gndY = 245;

  return (
    <g>
      {/* VCC label */}
      <text x={vccX} y={28} textAnchor="middle" fontSize="9" fontFamily="monospace" fill={C.power} fontWeight="bold">+5V</text>
      <Wire d={`M ${vccX} 32 V ${ledY1}`} color={C.power} width={2} />

      {/* Blue LED */}
      <AnimatePresence>
        {showLabels && (
          <motion.g key="led" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
            <CompBox x={vccX - 30} y={ledY1} w={60} h={ledY2 - ledY1} label="LED" sublabel="蓝光" color="#818cf8" />
          </motion.g>
        )}
      </AnimatePresence>
      <Wire d={`M ${vccX} ${ledY2} V ${rlimY1}`} color={C.power} />

      {/* R_lim */}
      <AnimatePresence>
        {showLabels && (
          <motion.g key="rlim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            <CompBox x={vccX - 30} y={rlimY1} w={60} h={rlimY2 - rlimY1} label="R_lim" color={C.iso} />
          </motion.g>
        )}
      </AnimatePresence>
      <Wire d={`M ${vccX} ${rlimY2} V ${mosY}`} color={C.power} />

      {/* N-MOSFET box */}
      <AnimatePresence>
        {showLabels && (
          <motion.g key="mosfet" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <CompBox x={mosX} y={mosY} w={mosW} h={mosH} label="N-MOSFET" sublabel="NMOS" color={C.gate} />
            <text x={mosX + 2} y={mosY + 20} fontSize="7" fontFamily="monospace" fill={C.gate + "bb"}>D</text>
            <text x={mosX + 2} y={mosY + mosH - 5} fontSize="7" fontFamily="monospace" fill={C.gate + "bb"}>S</text>
            <text x={mosX + 2} y={mosY + mosH / 2} fontSize="7" fontFamily="monospace" fill={C.gate + "bb"}>G</text>
          </motion.g>
        )}
      </AnimatePresence>

      {/* Drain wire */}
      <Wire d={`M ${vccX} ${mosY} H ${mosX + mosW / 2}`} color={C.power} />

      {/* Source → GND */}
      <Wire d={`M ${mosX + mosW / 2} ${mosY + mosH} V ${gndY - 16}`} color={C.gnd} />
      <GndSymbol x={mosX + mosW / 2} y={gndY - 16} label="GND" />

      {/* Control path */}
      <AnimatePresence>
        {showLabels && (
          <motion.g key="ctrl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            {/* GPIO label */}
            <CompBox x={15} y={mosY + mosH / 2 - 14} w={60} h={28} label="GPIO" sublabel="3.3V" color={C.ctrl} />
            {/* Wire from GPIO to R1 */}
            <Wire d={`M 75 ${mosY + mosH / 2} H 105`} color={C.ctrl} />
            {/* R1 */}
            <CompBox x={105} y={mosY + mosH / 2 - 11} w={60} h={22} label="R1=10kΩ" color={C.ctrl} />
            {/* Wire from R1 to gate */}
            <Wire d={`M 165 ${mosY + mosH / 2} H ${mosX}`} color={C.ctrl} />
          </motion.g>
        )}
      </AnimatePresence>

      {/* Current flow animation (step 2) */}
      {showFlow && (
        <>
          {/* Control current */}
          <CurrentWire d={`M 40 ${mosY + mosH / 2} H 165 H ${mosX}`} color={C.ctrl} />
          {/* Power current through LED */}
          <CurrentWire
            d={`M ${vccX} 32 V ${ledY1} V ${ledY2} V ${rlimY1} V ${rlimY2} V ${mosY} H ${mosX + mosW / 2}`}
            color={C.power}
            delay={0.3}
          />
          {/* Through MOSFET to GND */}
          <CurrentWire
            d={`M ${mosX + mosW / 2} ${mosY + mosH} V ${gndY - 16}`}
            color={C.gnd}
            delay={0.6}
          />
        </>
      )}

      {/* Warning label (step 2) */}
      {step === 2 && (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          <rect x={20} y={gndY - 30} width={130} height={20} rx={3} fill={C.warn + "22"} stroke={C.warn} strokeWidth={1} />
          <text x={85} y={gndY - 17} textAnchor="middle" fontSize="7.5" fontFamily="monospace" fill={C.warn}>
            ⚠ 共地 — 电源噪声反串 Jetson
          </text>
        </motion.g>
      )}
    </g>
  );
}

// ─── V3.0 Full circuit ────────────────────────────────────────────────────

function V3Circuit({ step }: { step: number }) {
  const show = {
    gpioR1:    step >= 4,
    el817:     step >= 3,
    r2r3gate:  step >= 5,
    mosfet:    step >= 6,
    power:     step >= 7,
    flow:      step === 8,
    isolation: step >= 3,
  };

  // Layout reference (viewBox ~460×380):
  // EL817 box: x=60, y=130, w=120, h=155 → right edge x=180
  // Anode (pin1): (60, 165) left side
  // Cathode (pin2): (60, 265) left side
  // Collector (pin4): (180, 165) right side
  // Emitter (pin3): (180, 265) right side
  //
  // R1: horizontal from (10,165) to (60,165) [GPIO to anode]
  // R2: horizontal from (180,165) to (235,165) [collector to gate junc]
  // Gate junction: (235, 165) → (300, 165) [to MOSFET gate]
  // R3: vertical from (235, 25) to (235, 165) [12V pull-up to gate]
  //
  // 12V node: (235, 25) → wire right to (345, 25) → down to (345, 120) [MOSFET source]
  //
  // P-MOSFET: x=305, y=120, w=80, h=90
  //   Source: (345, 120) top
  //   Gate: (305, 165) left
  //   Drain: (345, 210) bottom
  //
  // CC Driver: x=305, y=230, w=80, h=32
  // 10W LED: x=305, y=278, w=80, h=34
  // Power GND: (345, 360) ← via emitter also

  const el = {
    box: { x: 60, y: 130, w: 120, h: 155 },
    anode: { x: 60, y: 165 },
    cathode: { x: 60, y: 265 },
    collector: { x: 180, y: 165 },
    emitter: { x: 180, y: 265 },
    barrierX: 120,
  };
  const mos = { x: 305, y: 120, w: 82, h: 90, srcY: 120, gateX: 305, gateY: 165, drainY: 210, cx: 346 };
  const ccY1 = 230, ccY2 = 262, ledY1 = 278, ledY2 = 312;
  const gndPwrX = 346, gndPwrY = 360;
  const gateJunc = { x: 235, y: 165 };
  const vcc12X = 235, vcc12Y = 20;
  const vccMosX = 346, vccMosY = 25;

  return (
    <g>
      {/* ── 12V rail ── */}
      <text x={vcc12X} y={15} textAnchor="middle" fontSize="9" fontFamily="monospace" fill={C.power} fontWeight="bold">+12V</text>
      {/* 12V → R3 (already drawn via R3 component) */}
      {/* 12V → MOSFET source rail */}
      {show.mosfet && (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Wire d={L([{ x: vcc12X, y: vcc12Y + 5 }, { x: vccMosX, y: vcc12Y + 5 }, { x: vccMosX, y: mos.srcY }])} color={C.power} width={2} />
          <text x={vccMosX + 5} y={18} fontSize="8" fontFamily="monospace" fill={C.power}>+12V</text>
        </motion.g>
      )}

      {/* ── R3: gate pull-up ── */}
      {show.r2r3gate && (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* Wire from 12V down to R3 */}
          <Wire d={`M ${vcc12X} ${vcc12Y + 5} V 55`} color={C.gate} />
          <CompBox x={222} y={55} w={26} h={48} label="R3" sublabel="10kΩ" color={C.gate} />
          {/* Wire from R3 to gate junction */}
          <Wire d={`M ${vcc12X} 103 V ${gateJunc.y}`} color={C.gate} />
        </motion.g>
      )}

      {/* ── EL817 Optocoupler ── */}
      {show.el817 && (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* Outer box */}
          <rect
            x={el.box.x} y={el.box.y} width={el.box.w} height={el.box.h}
            rx={5} fill="#0f1a2e" stroke="#334155" strokeWidth={1.5}
          />
          {/* Isolation barrier */}
          <line
            x1={el.barrierX} y1={el.box.y + 8}
            x2={el.barrierX} y2={el.box.y + el.box.h - 8}
            stroke="#475569" strokeWidth={1} strokeDasharray="3 2"
          />

          {/* Internal LED symbol (left side) */}
          <circle cx={100} cy={el.box.y + 60} r={12} fill="none" stroke={C.ctrl + "55"} strokeWidth={1} />
          <text x={100} y={el.box.y + 64} textAnchor="middle" fontSize="9" fill={C.ctrl + "99"}>↗</text>

          {/* Internal transistor (right side) */}
          <text x={148} y={el.box.y + 64} textAnchor="middle" fontSize="8" fontFamily="monospace" fill={C.iso + "99"}>NPN</text>
          <line x1={140} y1={el.box.y + 45} x2={140} y2={el.box.y + 95} stroke={C.iso + "66"} strokeWidth={1.5} />
          <line x1={140} y1={el.box.y + 57} x2={155} y2={el.box.y + 45} stroke={C.iso + "66"} strokeWidth={1.5} />
          <line x1={140} y1={el.box.y + 73} x2={155} y2={el.box.y + 85} stroke={C.iso + "66"} strokeWidth={1.5} />

          {/* Label */}
          <text x={el.box.x + el.box.w / 2} y={el.box.y + el.box.h - 10} textAnchor="middle" fontSize="8.5" fontFamily="monospace" fill="#64748b" fontWeight="bold">
            EL817
          </text>

          {/* Pin labels */}
          <text x={el.box.x + 3} y={el.anode.y + 4} fontSize="7" fontFamily="monospace" fill={C.ctrl + "99"}>①+</text>
          <text x={el.box.x + 3} y={el.cathode.y + 4} fontSize="7" fontFamily="monospace" fill={C.ctrl + "99"}>②−</text>
          <text x={el.box.x + el.box.w - 20} y={el.collector.y - 3} fontSize="7" fontFamily="monospace" fill={C.iso + "99"}>④C</text>
          <text x={el.box.x + el.box.w - 20} y={el.emitter.y + 9} fontSize="7" fontFamily="monospace" fill={C.iso + "99"}>③E</text>

          {/* "光耦" label + isolation badge */}
          {show.isolation && (
            <>
              <rect x={el.barrierX - 18} y={el.box.y + el.box.h - 26} width={36} height={14} rx={2} fill="#1e293b" stroke="#475569" strokeWidth={0.5} />
              <text x={el.barrierX} y={el.box.y + el.box.h - 15} textAnchor="middle" fontSize="7" fontFamily="monospace" fill="#64748b">隔离</text>
            </>
          )}
        </motion.g>
      )}

      {/* ── GPIO + R1: control input ── */}
      {show.gpioR1 && (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* GPIO box */}
          <CompBox x={2} y={el.anode.y - 13} w={50} h={26} label="GPIO" sublabel="3.3V" color={C.ctrl} />
          {/* Wire: GPIO → R1 */}
          <Wire d={`M 52 ${el.anode.y} H 58`} color={C.ctrl} />
          {/* R1 box */}
          <CompBox x={-2} y={el.anode.y + 15} w={62} h={22} label="R1=300Ω" color={C.ctrl} />
          {/* Wire from R1 up to anode y */}
          <Wire d={`M 30 ${el.anode.y + 15} V ${el.anode.y} H ${el.anode.x}`} color={C.ctrl} />
          {/* Cathode wire to Jetson GND */}
          <Wire d={`M ${el.cathode.x} ${el.cathode.y} H 30 V 310`} color={C.ctrl} />
          <GndSymbol x={30} y={310} label="Jetson GND" color={C.ctrl} />
        </motion.g>
      )}

      {/* ── R2 + gate junction + gate wire ── */}
      {show.r2r3gate && (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* Wire from EL817 collector to R2 */}
          <Wire d={`M ${el.collector.x} ${el.collector.y} H 182`} color={C.iso} />
          {/* R2 box */}
          <CompBox x={182} y={el.collector.y - 11} w={50} h={22} label="R2=2kΩ" color={C.iso} />
          {/* Wire from R2 to gate junction */}
          <Wire d={`M 232 ${gateJunc.y} H ${gateJunc.x}`} color={C.iso} />
          {/* Gate junction dot */}
          <circle cx={gateJunc.x} cy={gateJunc.y} r={3} fill={C.gate} />
          {/* Wire from gate junction to MOSFET gate */}
          {show.mosfet && (
            <Wire d={`M ${gateJunc.x} ${gateJunc.y} H ${mos.gateX}`} color={C.gate} width={2} />
          )}
          {/* EL817 emitter → Power GND */}
          <Wire d={L([
            el.emitter,
            { x: 200, y: el.emitter.y },
            { x: 200, y: gndPwrY },
            { x: gndPwrX, y: gndPwrY },
          ])} color={C.gnd} />
        </motion.g>
      )}

      {/* ── P-MOSFET ── */}
      {show.mosfet && (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <CompBox x={mos.x} y={mos.y} w={mos.w} h={mos.h} label="P-MOSFET" sublabel="高边开关" color={C.gate} glow />
          {/* Pin labels */}
          <text x={mos.x + mos.w + 2} y={mos.srcY + 10} fontSize="7" fontFamily="monospace" fill={C.gate + "99"}>S</text>
          <text x={mos.gateX - 10} y={mos.gateY + 4} fontSize="7" fontFamily="monospace" fill={C.gate + "99"}>G</text>
          <text x={mos.x + mos.w + 2} y={mos.drainY + 10} fontSize="7" fontFamily="monospace" fill={C.gate + "99"}>D</text>
          {/* Gate connection on MOSFET left side */}
          <circle cx={mos.gateX} cy={mos.gateY} r={2.5} fill={C.gate} />
          {/* Wire from drain to CC driver */}
          <Wire d={`M ${mos.cx} ${mos.drainY} V ${ccY1}`} color={C.power} />
        </motion.g>
      )}

      {/* ── Power path: CC driver + 10W LED ── */}
      {show.power && (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <CompBox x={305} y={ccY1} w={82} h={ccY2 - ccY1} label="CC Driver" sublabel="恒流驱动" color={C.power} />
          <Wire d={`M ${mos.cx} ${ccY2} V ${ledY1}`} color={C.power} />
          <CompBox x={305} y={ledY1} w={82} h={ledY2 - ledY1} label="10W LED" sublabel="大功率光源" color="#f472b6" glow />
          <Wire d={`M ${mos.cx} ${ledY2} V ${gndPwrY - 18}`} color={C.gnd} />
          <GndSymbol x={gndPwrX} y={gndPwrY - 18} label="电源GND" color={C.gnd} />
        </motion.g>
      )}

      {/* ── Animated current flow (step 8) ── */}
      {show.flow && (
        <>
          {/* Control current: GPIO → R1 → EL817 anode */}
          <CurrentWire d={`M 30 ${el.anode.y} H ${el.anode.x}`} color={C.ctrl} delay={0} />
          {/* EL817 internal (implied, glow on box) */}
          {/* Isolated signal: collector → R2 → gate junction */}
          <CurrentWire d={`M ${el.collector.x} ${el.collector.y} H ${gateJunc.x}`} color={C.iso} delay={0.3} />
          {/* Gate pull to ground via MOSFET channel */}
          <CurrentWire d={`M ${gateJunc.x} ${gateJunc.y} H ${mos.gateX}`} color={C.gate} delay={0.5} />
          {/* Power path: 12V → MOSFET → CC → LED → GND */}
          <CurrentWire
            d={L([
              { x: vccMosX, y: 25 },
              { x: vccMosX, y: mos.srcY },
              { x: mos.cx, y: mos.srcY },
              { x: mos.cx, y: mos.drainY },
              { x: mos.cx, y: ccY1 },
              { x: mos.cx, y: ccY2 },
              { x: mos.cx, y: ledY1 },
              { x: mos.cx, y: ledY2 },
              { x: mos.cx, y: gndPwrY - 18 },
            ])}
            color={C.power}
            delay={0.7}
          />
        </>
      )}

      {/* ── Isolation barrier label ── */}
      {show.isolation && (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          <text
            x={el.barrierX}
            y={el.box.y - 6}
            textAnchor="middle"
            fontSize="7"
            fontFamily="monospace"
            fill="#475569"
          >
            ╌╌ 隔离屏障 ╌╌
          </text>
        </motion.g>
      )}

      {/* ── Summary design callouts (step 9) ── */}
      {step === 9 && (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          {/* Callout 1: Isolation */}
          <rect x={2} y={100} width={55} height={24} rx={3} fill={C.ctrl + "22"} stroke={C.ctrl} strokeWidth={1} />
          <text x={29} y={114} textAnchor="middle" fontSize="7" fontFamily="monospace" fill={C.ctrl}>①光耦隔离</text>
          <line x1={57} y1={112} x2={70} y2={215} stroke={C.ctrl + "66"} strokeWidth={0.8} strokeDasharray="2 2" />

          {/* Callout 2: P-MOS high-side */}
          <rect x={392} y={130} width={62} height={24} rx={3} fill={C.gate + "22"} stroke={C.gate} strokeWidth={1} />
          <text x={423} y={144} textAnchor="middle" fontSize="7" fontFamily="monospace" fill={C.gate}>②P-MOS高边</text>

          {/* Callout 3: CC driver */}
          <rect x={392} y={238} width={62} height={24} rx={3} fill={C.power + "22"} stroke={C.power} strokeWidth={1} />
          <text x={423} y={252} textAnchor="middle" fontSize="7" fontFamily="monospace" fill={C.power}>③恒流驱动</text>
        </motion.g>
      )}
    </g>
  );
}

// ─── Main component ───────────────────────────────────────────────────────

export default function TransmitterCircuit({ title }: { title?: string }) {
  const { currentStep, totalSteps, next, prev, reset, isPlaying, toggleAutoPlay } =
    useSteppedVisualization({ totalSteps: 10, autoPlayInterval: 3200 });

  const palette = useSvgPalette();
  const info = STEP_INFO[currentStep];
  const version = currentStep < 3 ? "v1" : "v3.0";
  const versionColor = version === "v1" ? C.warn : C.iso;

  return (
    <section className="min-h-[500px] space-y-4">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        {title || "发射端电路设计"}
      </h2>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mb-2 flex items-center gap-2 font-mono text-xs text-zinc-400 dark:text-zinc-500">
          <span>LED Driver Circuit</span>
          <span
            className="rounded px-1.5 py-0.5 text-[10px] font-bold"
            style={{ background: versionColor + "22", color: versionColor, border: `1px solid ${versionColor}` }}
          >
            {version}
          </span>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row">
          {/* Circuit SVG */}
          <div className="w-full lg:w-[62%]">
            <svg
              viewBox={currentStep < 3 ? "0 0 400 280" : "0 0 460 385"}
              className="w-full rounded-md border border-zinc-100 bg-zinc-950 dark:border-zinc-800"
              style={{ minHeight: 260 }}
            >
              <AnimatePresence mode="wait">
                {currentStep < 3 ? (
                  <motion.g key="v1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <V1Circuit step={currentStep} />
                  </motion.g>
                ) : (
                  <motion.g key="v3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <V3Circuit step={currentStep} />
                  </motion.g>
                )}
              </AnimatePresence>
            </svg>
          </div>

          {/* Right info panel */}
          <div className="flex w-full flex-col gap-3 lg:w-[38%]">
            {/* Step title + badge */}
            <div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                      {info.title}
                    </span>
                    {info.badge && (
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                        style={{ background: versionColor + "22", color: versionColor, border: `1px solid ${versionColor}` }}
                      >
                        {info.badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                    {info.desc}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Component specs table */}
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-2 text-xs dark:border-zinc-700 dark:bg-zinc-800/50">
              <div className="mb-1.5 font-mono text-[10px] font-bold text-zinc-400 dark:text-zinc-500">
                {currentStep < 3 ? "V1 元件规格" : "V3.0 元件规格"}
              </div>
              {currentStep < 3 ? (
                <table className="w-full font-mono text-[10px]">
                  <tbody>
                    <tr><td className="text-zinc-400 pr-2">GPIO</td><td className="text-zinc-200">Jetson 3.3V</td></tr>
                    <tr><td className="text-zinc-400 pr-2">R1</td><td className="text-zinc-200">10kΩ 栅极限流</td></tr>
                    <tr><td className="text-zinc-400 pr-2">MOSFET</td><td className="text-zinc-200">N-CH (2N7002)</td></tr>
                    <tr><td className="text-zinc-400 pr-2">LED</td><td className="text-zinc-200">蓝光 3.3V 20mA</td></tr>
                    <tr><td className="text-zinc-400 pr-2">VCC</td><td className="text-zinc-200">+5V 电源</td></tr>
                  </tbody>
                </table>
              ) : (
                <table className="w-full font-mono text-[10px]">
                  <tbody>
                    <tr><td className="text-zinc-400 pr-2">R1</td><td className="text-zinc-200">300Ω 光耦限流</td></tr>
                    <tr><td className="text-zinc-400 pr-2">EL817</td><td className="text-zinc-200">光电耦合器 CTR≥50%</td></tr>
                    <tr><td className="text-zinc-400 pr-2">R2</td><td className="text-zinc-200">2kΩ 栅极驱动</td></tr>
                    <tr><td className="text-zinc-400 pr-2">R3</td><td className="text-zinc-200">10kΩ 栅极上拉</td></tr>
                    <tr><td className="text-zinc-400 pr-2">P-MOS</td><td className="text-zinc-200">P-CH IRF9540</td></tr>
                    <tr><td className="text-zinc-400 pr-2">LED</td><td className="text-zinc-200">10W 大功率</td></tr>
                    <tr><td className="text-zinc-400 pr-2">VCC</td><td className="text-zinc-200">+12V 电源</td></tr>
                  </tbody>
                </table>
              )}
            </div>

            {/* Color legend */}
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-800/50">
              <div className="mb-1 font-mono text-[10px] font-bold text-zinc-400 dark:text-zinc-500">色彩图例</div>
              <div className="flex flex-col gap-0.5 font-mono text-[10px]">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-4 rounded" style={{ background: C.ctrl }} />
                  <span className="text-zinc-400">控制信号 (Jetson侧)</span>
                </div>
                {currentStep >= 3 && (
                  <>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block h-2 w-4 rounded" style={{ background: C.iso }} />
                      <span className="text-zinc-400">隔离侧信号 (EL817输出)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block h-2 w-4 rounded" style={{ background: C.gate }} />
                      <span className="text-zinc-400">栅极驱动 (R2/R3)</span>
                    </div>
                  </>
                )}
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-4 rounded" style={{ background: C.power }} />
                  <span className="text-zinc-400">电源路径 (12V/5V)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-4 rounded" style={{ background: C.gnd }} />
                  <span className="text-zinc-400">地线</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step controls */}
        <div className="mt-4">
          <StepControls
            currentStep={currentStep}
            totalSteps={totalSteps}
            onNext={next}
            onPrev={prev}
            onReset={reset}
            isPlaying={isPlaying}
            onToggleAutoPlay={toggleAutoPlay}
            stepTitle={info.title}
            stepDescription={info.desc}
          />
        </div>
      </div>
    </section>
  );
}
