# Learn Claude Code — Web 架构与设计总结

> 本文档解析 learn-claude-code 项目的 web 前端架构设计，可作为搭建类似学习记录网站的技术参考。

---

## 一、技术选型

| 技术 | 版本 | 用途 |
|------|------|------|
| **Next.js** | 16.1.6 | React 框架 + App Router + SSG |
| **React** | 19.2.3 | UI 渲染 |
| **Framer Motion** | 12.34.0 | 交互动画（核心特色）|
| **Tailwind CSS** | 4 | 样式框架 + CSS 变量暗色模式 |
| **TypeScript** | 5 | 类型安全 |
| **Unified / Remark** | 11.x | Markdown → HTML 渲染 |
| **Lucide React** | 0.564.0 | 图标库 |

### 部署方式

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  output: "export",   // 静态导出（SSG），无需服务器
  images: { unoptimized: true },
  trailingSlash: true,
};
```

---

## 二、目录结构

```
web/
├── src/
│   ├── app/
│   │   ├── [locale]/              # 国际化路由：/en/, /zh/, /ja/
│   │   │   ├── layout.tsx          # 根布局（含暗色模式脚本注入）
│   │   │   ├── page.tsx            # 首页
│   │   │   └── (learn)/            # Route Group：学习路径页面
│   │   │       ├── layout.tsx      # Sidebar 布局
│   │   │       ├── [version]/      # 动态路由：/zh/s01
│   │   │       │   ├── page.tsx    # 服务端：获取版本数据
│   │   │       │   ├── client.tsx  # 客户端：Tab 内容渲染
│   │   │       │   └── diff/       # 代码对比页面
│   │   │       ├── timeline/        # 学习时间线
│   │   │       ├── layers/         # 分层总览
│   │   │       └── compare/         # 版本对比工具
│   │   ├── globals.css             # 全局样式 + CSS 变量
│   │   └── page.tsx                # 首页重定向
│   │
│   ├── components/
│   │   ├── visualizations/        # ★ 核心动画组件（s01-s12）
│   │   │   ├── index.tsx           # React.lazy 懒加载注册表
│   │   │   ├── shared/
│   │   │   │   └── step-controls.tsx  # 播放/暂停/上一步/下一步
│   │   │   ├── s01-agent-loop.tsx  # SVG 流程图动画
│   │   │   ├── s09-agent-teams.tsx # 消息飞行动画
│   │   │   └── ...（s02-s12）
│   │   ├── timeline/               # 滚动触发动画
│   │   │   └── timeline.tsx
│   │   ├── simulator/              # 交互式模拟器（非动画，是真实逻辑）
│   │   │   ├── agent-loop-simulator.tsx
│   │   │   ├── simulator-controls.tsx
│   │   │   └── simulator-message.tsx
│   │   ├── architecture/           # 架构图组件
│   │   │   ├── arch-diagram.tsx    # 类层次图（随版本递增）
│   │   │   ├── execution-flow.tsx
│   │   │   ├── design-decisions.tsx
│   │   │   └── message-flow.tsx
│   │   ├── diff/                   # 代码 diff 展示
│   │   │   ├── code-diff.tsx
│   │   │   └── whats-new.tsx
│   │   ├── code/                   # 源码阅读器
│   │   │   └── source-viewer.tsx   # 自定义语法高亮（无外部库）
│   │   ├── docs/                   # Markdown 渲染
│   │   │   └── doc-renderer.tsx    # unified/remark 管道
│   │   ├── layout/                 # 页面布局
│   │   │   ├── header.tsx          # 顶部导航 + 暗色切换 + 语言切换
│   │   │   └── sidebar.tsx         # 左侧目录（按 Layer 分组）
│   │   └── ui/                     # 基础组件
│   │       ├── badge.tsx
│   │       ├── card.tsx
│   │       └── tabs.tsx
│   │
│   ├── hooks/                      # React Hooks
│   │   ├── useSteppedVisualization.ts  # ★ 核心：分步动画状态机
│   │   ├── useSimulator.ts         # Agent 循环模拟器状态
│   │   └── useDarkMode.ts          # SVG 调色板
│   │
│   ├── lib/
│   │   ├── constants.ts            # VERSION_META、LAYERS 定义
│   │   ├── i18n.tsx                # 国际化 Context + useTranslations
│   │   ├── i18n-server.ts          # 服务端翻译获取
│   │   └── utils.ts                # cn() 等工具函数
│   │
│   ├── data/
│   │   ├── generated/               # 由 extract-content.ts 自动生成
│   │   │   ├── versions.json        # 所有版本的代码结构数据
│   │   │   └── docs.json            # 所有语言的文档内容
│   │   ├── scenarios/               # 模拟器场景 JSON
│   │   │   └── s01.json ... s12.json
│   │   ├── annotations/            # 未知
│   │   └── execution-flows.ts
│   │
│   ├── i18n/
│   │   └── messages/
│   │       ├── en.json
│   │       ├── zh.json
│   │       └── ja.json
│   │
│   └── types/
│       └── agent-data.ts           # 核心数据类型定义
│
├── scripts/
│   └── extract-content.ts          # 构建时从 agents/ 和 docs/ 提取数据
│
├── next.config.ts
└── package.json
```

---

## 三、核心设计模式

### 1. 内容与代码分离（Content/Code Split）

**代码逻辑**（agents/*.py）和**文档**（docs/）是独立的原始文件，通过 `scripts/extract-content.ts` 在构建时提取合并成 `data/generated/versions.json`。

```
docs/en/s01-the-agent-loop.md   ─┐
agents/s01_agent_loop.py       ─┼─► extract-content.ts ─► versions.json
docs/zh/s01-the-agent-loop.md  ─┤                          docs.json
...                             ─┘
```

这样做的好处：
- 文档用 Markdown 写，不需要懂 React
- 代码更新后，LOC/tools/classes 自动重新计算
- 支持多语言（en/zh/ja）文档

### 2. SSG + 静态导出（Static Export）

Next.js 配置了 `output: "export"`，整个网站编译成纯静态文件：
- 每个版本页面 `/en/s01`、`/zh/s01` 都是静态 HTML
- 可以部署到 GitHub Pages、Vercel、Netlify 或任何静态托管

### 3. 国际化（i18n）路由

```
/en/s01    → English
/zh/s01    → 中文
/ja/s01    → 日语
```

实现方式：
- URL 结构：`/src/app/[locale]/` 动态路由段
- Context 注入：`I18nProvider` 在 root layout 中包住整个应用
- 语言文件：`src/i18n/messages/*.json`
- 切换语言：`window.location.href` 替换 locale 前缀

```typescript
// src/app/[locale]/layout.tsx
export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

// 客户端使用
export function useTranslations(namespace?: string) {
  const { messages } = useContext(I18nContext);
  return (key: string) => messages[namespace]?.[key] || key;
}
```

### 4. 懒加载可视化组件

```typescript
// src/components/visualizations/index.tsx
const visualizations: Record<string, React.LazyExoticComponent<...>> = {
  s01: lazy(() => import("./s01-agent-loop")),
  s02: lazy(() => import("./s02-tool-dispatch")),
  // ...
};

export function SessionVisualization({ version }: { version: string }) {
  return (
    <Suspense fallback={<div className="animate-pulse ..." />}>
      <Component title={t(version)} />
    </Suspense>
  );
}
```

### 5. 服务端数据获取 + 客户端渲染分离

```
/[locale]/[version]/page.tsx  (Server Component)
    │
    ├── 从 versions.json 读取元数据（服务端）
    └── 传递给 VersionDetailClient (Client Component)
            │
            └── Tabs: learn / simulate / code / deep-dive
```

页面顶部的 header/metadata/navigation 是服务端渲染保证 SEO；交互内容（Tabs、动画、模拟器）是客户端渲染。

---

## 四、动画系统（核心特色）

### 设计哲学

> **状态即动画**。一个 `currentStep` 状态驱动所有视觉变化，Framer Motion 负责插值，不需要手写动画帧。

### 架构

```
useSteppedVisualization (Hook)
    │
    ├── currentStep: number    ← 单一真实来源
    ├── next() / prev()
    ├── isPlaying + toggleAutoPlay()
    │
    ▼
React Component (render)
    │
    ├── 读取 currentStep
    ├── 计算当前步骤的"活跃"数据
    │     (activeNodes, visibleMessages, etc.)
    │
    ▼
Framer Motion (animate)
    │
    ├── animate={{ fill, stroke, x, y }}
    ├── transition={{ duration: 0.4 }}
    └── AnimatePresence (列表增删动画)
```

### 五种动画模式

| 模式 | 用途 | 代表组件 |
|------|------|---------|
| **状态 → SVG** | 节点/边颜色随 step 变化 | `s01-agent-loop.tsx` |
| **路径动画** | 元素沿路径"飞过" | `s09-agent-teams.tsx` |
| **滚动触发** | `whileInView` 入场动画 | `timeline.tsx` |
| **AnimatePresence** | 列表增删动画 + `popLayout` | `s01-agent-loop.tsx` (message list) |
| **脉冲/重复** | `repeat: Infinity` 的持续动画 | `s09-agent-teams.tsx` (coder pulsing) |

### 关键 Hook：`useSteppedVisualization`

```typescript
// src/hooks/useSteppedVisualization.ts
export function useSteppedVisualization({
  totalSteps,
  autoPlayInterval = 2000,
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 关键：在 setState 更新函数里调用 setIsPlaying(false)
  // 避免 useEffect 闭包陷阱
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= totalSteps - 1) {
            setIsPlaying(false);  // ← 正确：在 updater 函数里
            return prev;
          }
          return prev + 1;
        });
      }, autoPlayInterval);
    }
    return () => clearInterval(intervalRef.current);
  }, [isPlaying, totalSteps, autoPlayInterval]);

  return { currentStep, next, prev, reset, isPlaying, toggleAutoPlay, ... };
}
```

### 控制栏组件：`StepControls`

独立可复用组件，包含：
- 重置 / 上一步 / 播放-暂停 / 下一步
- 步骤指示点（已过/当前/未到三种状态）
- 当前步骤标题 + 描述卡片

---

## 五、页面结构

### 首页 `/`（重定向）

```
/ → 重定向到 /en
```

### 学习路径首页 `/[locale]`

`src/app/[locale]/page.tsx` — 展示 12 个版本的学习路径概览。

### 版本详情页 `/[locale]/[version]`

每个版本的详情页，四层 Tab 内容：

```
┌──────────────────────────────────────────────────────┐
│  Hero 可视化：SessionVisualization (分步动画)         │
├──────────────────────────────────────────────────────┤
│  Tab: Learn │ Simulate │ Code │ Deep Dive           │
├──────────────────────────────────────────────────────┤
│  Learn      → DocRenderer (Markdown 渲染)            │
│  Simulate   → AgentLoopSimulator (交互模拟器)        │
│  Code       → SourceViewer (语法高亮源码)            │
│  Deep Dive  → ExecutionFlow + ArchDiagram           │
│              + WhatsNew (版本 diff)                 │
│              + DesignDecisions                      │
└──────────────────────────────────────────────────────┘
```

### 导航页面

| 路径 | 页面 | 功能 |
|------|------|------|
| `/[locale]/timeline` | 时间线 | 滚动触发动画，展示学习路径 |
| `/[locale]/layers` | 分层视图 | 按 Layer（tools/planning/memory/concurrency/collaboration）分组展示 |
| `/[locale]/compare` | 版本对比 | 选择两个版本，对比架构图、代码 diff、工具/类/函数变化 |

---

## 六、数据流

```
构建时（scripts/extract-content.ts）
─────────────────────────────────────
agents/*.py     →  提取 classes, functions, tools, LOC
docs/{en,zh,ja}/*.md  →  提取文档内容
                                    ↓
                          src/data/generated/
                          ├── versions.json  （代码结构）
                          └── docs.json      （多语言文档）

运行时
─────────────────────────────────────
用户请求 /zh/s01
        │
        ├── Next.js SSG 生成静态 HTML
        │
        └── 浏览器加载后：
             ├── I18nProvider(locale="zh")   → 中文界面
             ├── DocRenderer(version="s01")  → 读取 docs.json
             ├── SessionVisualization         → s01-agent-loop.tsx
             └── SourceViewer                  → 读取 versions.json
```

---

## 七、CSS 设计

### 暗色模式

使用 **CSS 变量**（非 Tailwind `dark:` 类）：

```css
/* globals.css */
:root {
  --color-bg: #ffffff;
  --color-text: #09090b;
  --color-border: #e4e4e7;
}
.dark {
  --color-bg: #09090b;
  --color-text: #fafafa;
  --color-border: #27272a;
}

/* HTML 注入脚本（避免闪烁）*/
<script dangerouslySetInnerHTML={{
  __html: `(function() {
    var theme = localStorage.getItem('theme');
    if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  })();`
}} />
```

### Layer 颜色系统

```css
/* globals.css */
:root {
  --color-layer-tools: #3B82F6;
  --color-layer-planning: #10B981;
  --color-layer-memory: #8B5CF6;
  --color-layer-concurrency: #F59E0B;
  --color-layer-collaboration: #EF4444;
}
```

---

## 八、如果你要复刻这个网站

### 最简路径

```
1. 搭建框架
   git clone learn-claude-code
   cd web && npm install && npm run dev

2. 修改内容
   docs/zh/           → 换成你的文档
   agents/            → 换成你的代码（如果有）
   scripts/extract-content.ts  → 适配你的数据提取逻辑

3. 修改可视化
   src/components/visualizations/
   参考现有的 s01-agent-loop.tsx 写你自己的 SVG 分步动画

4. 部署
   npm run build   → 输出 static/ 目录
   部署 to Vercel / GitHub Pages
```

### 你最需要继承的部分

| 部分 | 评价 | 是否复用 |
|------|------|---------|
| `useSteppedVisualization` hook | 非常干净，可直接用 | ✅ 推荐复用 |
| `StepControls` 组件 | 可直接复用或改样式 | ✅ 推荐复用 |
| CSS 变量暗色模式 | 简单有效，无闪烁 | ✅ 推荐复用 |
| 国际化方案 | 轻量，满足 3 种语言 | ✅ 可选复用 |
| `extract-content.ts` | 只有 280 行，逻辑清晰 | ⚠️ 如果你的原始文件不是 Python + Markdown 需要重写 |
| 整体路由结构 | 适合"版本迭代"类内容 | ⚠️ 如果内容不是分版本的需调整 |
| 动画可视化架构 | **核心资产**，最具特色 | ✅ 完全可迁移到你的主题 |

### 你可能不需要的部分

- Agent Loop 模拟器（`simulator/`）— 如果你的内容不是 agent 循环
- 代码对比工具（`compare/`）— 如果你的版本不是代码演进
- 12 层 Layer 分类 — 换成你自己的主题分类
- 三语言（en/zh/ja）— 如果你只需要一种语言

---

## 九、架构图（整体）

```
                          ┌─────────────────────────────────────┐
                          │          Browser / Static Host       │
                          └─────────────────────────────────────┘
                                              │
                          ┌─────────────────────────────────────┐
                          │   Next.js App (SSG + Static Export)  │
                          ├─────────────────────────────────────┤
                          │  [locale]/                           │
                          │    ├── page.tsx          (首页)      │
                          │    └── (learn)/                     │
                          │         ├── [version]/  (版本详情)  │
                          │         │     ├── page.tsx (SSR数据) │
                          │         │     └── client.tsx (动画)  │
                          │         ├── timeline/               │
                          │         ├── layers/                  │
                          │         └── compare/                 │
                          └─────────────────────────────────────┘
                                              │
          ┌─────────────────────────────────────┼─────────────────────────────────────┐
          │                                     │                                     │
          ▼                                     ▼                                     ▼
┌─────────────────────┐            ┌─────────────────────┐            ┌─────────────────────┐
│   Components         │            │   Hooks              │            │   Data               │
├─────────────────────┤            ├─────────────────────┤            ├─────────────────────┤
│ visualizations/     │            │ useSteppedViz       │            │ generated/          │
│   (Framer Motion)   │            │ useSimulator        │            │   versions.json     │
│                     │            │ useDarkMode         │            │   docs.json         │
│ simulator/          │            └─────────────────────┘            │ scenarios/          │
│   (真实逻辑，非动画) │                                                    └─────────────────────┘
│                     │
│ architecture/       │
│ diff/               │
│ code/               │
│ docs/               │
│ layout/             │
│ ui/                 │
└─────────────────────┘
```

---

*文档版本：v1.0 | 基于 learn-claude-code 项目源码分析*
