# Web 动画指南

> *记录本项目如何使用 Framer Motion 构建交互动画可视化。*

## TL;DR

核心方案：**Framer Motion** 做动画，**`useSteppedVisualization` hook** 做状态管理。`currentStep` 变了，动画就跟着变——状态即动画。

## 技术栈

| 库 | 版本 | 用途 |
|---|------|------|
| `framer-motion` | 12.34.0 | 动画引擎 |
| `react` | 19.2.3 | UI 框架 |

## 架构

```
┌─────────────────────────────────────────────────────────────┐
│                    分步动画架构                              │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐  │
│  │  useSteppedVisualization                              │  │
│  │  ├── currentStep: number                               │  │
│  │  ├── next() / prev() / reset()                        │  │
│  │  ├── isPlaying / toggleAutoPlay()                    │  │
│  │  └── autoPlay via setInterval                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                 │
│                           ▼                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  React 组件 (framer-motion)                          │  │
│  │  ├── motion.svg.* → SVG 节点/边动画                   │  │
│  │  ├── motion.div → 滚动触发入场动画                   │  │
│  │  └── AnimatePresence → 列表增删动画                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                 │
│                           ▼                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  StepControls                                         │  │
│  │  ├── 播放 / 暂停 / 上一步 / 下一步 / 重置             │  │
│  │  └── 步骤指示点 + 进度文字                           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 核心 Hook: `useSteppedVisualization`

**文件**: `web/src/hooks/useSteppedVisualization.ts`

```typescript
interface SteppedVisualizationOptions {
  totalSteps: number;           // 总步数
  autoPlayInterval?: number;    // 自动播放间隔(ms)，默认 2000
}

interface SteppedVisualizationReturn {
  currentStep: number;           // 当前步骤 (0 ~ totalSteps-1)
  totalSteps: number;
  next: () => void;              // 下一步
  prev: () => void;              // 上一步
  reset: () => void;             // 重置到第 0 步
  goToStep: (step: number) => void;
  isPlaying: boolean;           // 是否正在自动播放
  toggleAutoPlay: () => void;   // 切换自动播放
  isFirstStep: boolean;
  isLastStep: boolean;
}
```

### 工作原理

- **状态**: `currentStep` + `isPlaying`
- **自动播放**: `isPlaying` 为 true 时，`setInterval` 每隔 `autoPlayInterval` ms 让 `currentStep` +1，到最后一步自动停止
- **手动控制**: `next()` / `prev()` / `reset()` / `goToStep()` 直接操作状态

### 关键实现细节

```typescript
useEffect(() => {
  if (isPlaying) {
    intervalRef.current = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= totalSteps - 1) {
          setIsPlaying(false);  // 到达末尾时自动停止
          return prev;
        }
        return prev + 1;
      });
    }, autoPlayInterval);
  }
  return () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };
}, [isPlaying, totalSteps, autoPlayInterval]);
```

**重要**: `setIsPlaying(false)` 写在 `setCurrentStep` 的更新函数里，而不是直接写在 `useEffect` 体内。这样可以避免闭包陷阱——`useEffect` 体内的 `isPlaying` 是创建时的初始值，直接调用 `setIsPlaying(false)` 会失效。

---

## 模式一：状态 → SVG 动画

**用于**: `s01-agent-loop.tsx`, `s09-agent-teams.tsx`

最常见的模式。每个步骤定义哪些节点/边是"活跃"的，Framer Motion 监听状态变化自动插值。

```tsx
const activeNodes = ACTIVE_NODES_PER_STEP[currentStep];

<motion.rect
  x={node.x - node.w / 2}
  y={node.y - node.h / 2}
  width={node.w}
  height={node.h}
  rx={8}
  animate={{
    fill: isActive ? palette.activeNodeFill : palette.nodeFill,
    stroke: isActive ? palette.activeNodeStroke : palette.nodeStroke,
  }}
  transition={{ duration: 0.4 }}
/>
```

### 模式：发光效果（条件 Filter）

```tsx
const filterAttr = isActive
  ? isEnd
    ? "url(#glow-purple)"   // 终态用紫色光晕
    : "url(#glow-blue)"      // 活跃态用蓝色光晕
  : "none";

<motion.rect
  filter={filterAttr}
  animate={{ filter: filterAttr }}
  transition={{ duration: 0.4 }}
/>
```

### 模式：脉冲动画

```tsx
const pulsing = step === 3 && agent.id === "coder";

<motion.circle
  cx={agent.cx}
  cy={agent.cy}
  r={AGENT_R}
  animate={{
    scale: pulsing ? [1, 1.08, 1] : 1,
    fill: glowing ? "#3b82f6" : palette.edgeStroke,
  }}
  transition={
    pulsing
      ? { duration: 0.8, repeat: Infinity, ease: "easeInOut" }
      : { duration: 0.4 }
  }
/>
```

---

## 模式二：路径动画（消息飞行的效果）

**用于**: `s09-agent-teams.tsx`

让一个元素沿路径移动（比如消息在两个 agent 之间飞过）。利用 `animate` 的数组值实现 x/y 的多关键帧。

```tsx
<motion.g
  initial={{ opacity: 0 }}
  animate={{
    opacity: [0, 1, 1, 0.8],           // 淡入 → 保持 → 淡出
    x: [fromX, fromX, toX, toX],       // 起点 → 移动到终点
    y: [fromY, fromY, toY, toY],
  }}
  transition={{
    duration: 1.4,
    delay,
    times: [0, 0.1, 0.7, 1],            // 控制每个关键帧的时间点
    ease: "easeInOut",
  }}
>
  <rect width={MSG_W} height={MSG_H} rx={4} fill="#f59e0b" />
  <text>...</text>
</motion.g>
```

`times: [0, 0.1, 0.7, 1]` 映射到各属性数组：

| 时间点 | opacity | x |
|--------|---------|---|
| 0 | 0 | fromX（起点，透明）|
| 0.1 | 1 | fromX（出现，停留）|
| 0.7 | 1 | toX（飞行中）|
| 1 | 0.8 | toX（到达，淡出）|

---

## 模式三：滚动触进入场动画

**用于**: `timeline.tsx`

`whileInView` + `viewport={{ once: true }}` 让元素进入视口时触发一次动画，之后不再重复。

```tsx
<motion.div
  initial={{ opacity: 0, x: 30 }}
  whileInView={{ opacity: 1, x: 0 }}
  viewport={{ once: true, margin: "-50px" }}
  transition={{ duration: 0.4, delay: 0.1 }}
/>
```

### 进度条动画

```tsx
<motion.div
  initial={{ width: 0 }}
  whileInView={{ width: `${widthPercent}%` }}
  viewport={{ once: true }}
  transition={{ duration: 0.6, delay: 0.05 * index }}
/>
```

---

## 模式四：AnimatePresence（列表动画）

**用于**: `s01-agent-loop.tsx`

`AnimatePresence` 让**新增/删除**的元素也能播放动画。`mode="popLayout"` 让其余元素自动挤过来填补空位。

```tsx
<AnimatePresence mode="popLayout">
  {visibleMessages.map((msg, i) => (
    <motion.div
      key={`${msg.role}-${msg.detail}-${i}`}
      initial={{ opacity: 0, y: 12, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.35, type: "spring", bounce: 0.3 }}
    />
  ))}
</AnimatePresence>
```

### 过渡类型

| 类型 | 效果 |
|------|------|
| `duration: 0.4` | 简单基于时间 |
| `type: "spring", bounce: 0.3` | 弹簧物理（带弹跳）|
| `ease: "easeInOut"` | 缓动曲线 |

---

## 模式五：条件渲染 + AnimatePresence

**用于**: `s09-agent-teams.tsx`

整个 SVG 分组只在特定步骤显示时使用：

```tsx
<AnimatePresence>
  {step === 3 && (
    <motion.g
      key="result-msg"
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.8, duration: 0.4 }}
    >
      <rect ... />
    </motion.g>
  )}
</AnimatePresence>
```

没有 `AnimatePresence`，进入的元素会直接出现没有动画。加上后，挂载时播放 `initial→animate`，卸载时播放 `exit`。

---

## StepControls 组件

**文件**: `web/src/components/visualizations/shared/step-controls.tsx`

可复用的分步动画控制栏，包含：
- 重置 / 上一步 / 播放-暂停 / 下一步按钮（Lucide 图标）
- 步骤指示点（当前=蓝色实心，已过=蓝色空心，未到=灰色）
- 步骤计数文字（`1/7`）
- 步骤标题 + 描述的注释卡片

```tsx
<StepControls
  currentStep={vis.currentStep}
  totalSteps={vis.totalSteps}
  onPrev={vis.prev}
  onNext={vis.next}
  onReset={vis.reset}
  isPlaying={vis.isPlaying}
  onToggleAutoPlay={vis.toggleAutoPlay}
  stepTitle={STEPS[step].title}
  stepDescription={STEPS[step].desc}
/>
```

---

## 暗色模式: `useSvgPalette`

**文件**: `web/src/hooks/useDarkMode.ts`

为 SVG 元素提供适配暗色/亮色模式的统一调色板，确保节点、边、文字在两种主题下都清晰可见。

```tsx
const palette = useSvgPalette();
// 返回: { nodeFill, nodeStroke, activeNodeFill, activeNodeStroke, ... }
```

---

## 文件结构

```
web/src/
├── hooks/
│   ├── useSteppedVisualization.ts   # 核心步进状态机
│   ├── useSimulator.ts              # Agent 循环模拟器状态
│   └── useDarkMode.ts               # 暗色/亮色模式调色板
├── components/
│   ├── visualizations/
│   │   ├── index.tsx                # 懒加载可视化组件注册表
│   │   ├── shared/
│   │   │   └── step-controls.tsx    # 播放/暂停/上一步/下一步 UI
│   │   ├── s01-agent-loop.tsx       # SVG 流程图
│   │   ├── s02-tool-dispatch.tsx
│   │   ├── s09-agent-teams.tsx      # 飞行消息动画
│   │   └── ... (s03-s12)
│   └── timeline/
│       └── timeline.tsx             # 滚动触发动画
```

---

## 懒加载

所有可视化组件通过 **`React.lazy` + `Suspense`** 懒加载，避免初始包过大：

```tsx
// web/src/components/visualizations/index.tsx
const visualizations: Record<string, React.LazyExoticComponent<...>> = {
  s01: lazy(() => import("./s01-agent-loop")),
  s02: lazy(() => import("./s02-tool-dispatch")),
  // ...
};

export function SessionVisualization({ version }: { version: string }) {
  return (
    <Suspense fallback={<div className="min-h-[500px] animate-pulse ..." />}>
      <Component title={t(version)} />
    </Suspense>
  );
}
```

---

## 核心要点

1. **状态即动画** — `animate` 属性监听 React 状态变化自动插值，无需手动管理动画帧。

2. **`currentStep` 是唯一真实来源** — 所有视觉状态（活跃节点、可见元素、颜色）都从 `currentStep` 派生。

3. **`AnimatePresence` 让挂载/卸载动画生效** — 条件渲染的动画元素必须用 `AnimatePresence` 包裹。

4. **`whileInView` 用于滚动触发** — `viewport={{ once: true }}` 确保动画只触发一次。

5. **`times` 数组控制关键帧时序** — 路径动画中，`times` 将你的关键帧值映射到动画时间轴上的精确位置。

6. **`setIsPlaying(false)` 写在 `setState` 更新函数里** — 避免自动播放 `useEffect` 中的闭包陷阱。
