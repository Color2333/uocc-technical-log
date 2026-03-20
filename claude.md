# Claude Code 项目开发规范

## 构建与部署

### 构建验证（强制）
- **每次 push 前必须在本地通过 `npm run build`**：本地构建通过是最低标准
- 本地构建卡住 ≠ 内存问题，**必须找到根因**
- 诊断方法：禁用可疑模块（二分法）→ 隔离测试 → 定位具体文件/函数

### Vercel 部署
- Root Directory 设置为 `web/`
- `vercel.json` 中无需配置 `rootDirectory`，Vercel CLI 从工作目录推断
- push 后可直接 `npx vercel --yes --prod` 部署

## 代码规范

### TypeScript
- **禁止 `any`**：所有类型必须显式声明
- **禁止 `@ts-ignore` / `@ts-expect-error`**：用类型断言或重新设计解决
- 条件分支中的类型 narrowing 后不要重新赋值给窄化变量，否则 TypeScript 会报 `"types have no overlap"` 错误。解决：`const sec = section as string`

### 注释与代码洁癖
- **禁止不必要的注释**：代码应自解释
- 调试用的注释（如 `// .use(...)`）必须**立即删除**，不要留在代码中
- hook 触发时需说明理由：已有注释、BDD注释、必要注释

### 无限循环防护（Parser 编写规范）
- **Parser 必须有推进索引的条件**：循环处理时必须确保索引前进
- **每个分支都要有 `continue` 或 `i++`**
- **处理子结构时（如 YAML children / 嵌套块），必须明确边界条件**，子项被正确消费后外层循环不能重复处理
- 边界判断示例：
  ```typescript
  // 缩进 < 4 spaces 表示 sibling，>= 4 spaces 表示 child
  if (leadingSpaces < 4) break;  // 退出子结构，回到父级
  ```
- 写 Parser 后**立即单独测试**（不经过框架），确认不卡死、不抛异常

## Markdown 内容迁移

### `:::diagram` 语法
- 原始 ASCII 框图迁移到 ` ```diagram ` 代码块
- Parser (`src/lib/diagram-parser.ts`) 同步维护，有 bug 会导致 build 挂死
- 修改 Parser 后**必须**：
  1. 单独测试所有 docs 中的图能否解析（不卡死、不报错）
  2. `npm run build` 通过
  3. 才算完成

### 迁移检查清单
- [ ] 所有 ASCII 框图（`┌─┐└─└│▼►` 等字符）迁移到 ` ```diagram ` 代码块
- [ ] `npx tsx scripts/extract-docs.ts` 重新生成 `docs.json`
- [ ] 测试 parser 能解析所有图块（独立测试，不走 unified pipeline）
- [ ] `npm run build` 通过
- [ ] commit 并 push

## 调试方法论

### Build 卡住的诊断流程
1. **禁用可疑模块**（在 doc-renderer 中注释掉 plugin）→ 快速定位是否 plugin 导致
2. **隔离测试**：单独运行 `parseDiagram(block)` 确认 parser 不卡死
3. **确认不是 OOM**：CPU 99% 长时间运行 = 无限循环，不是内存不足
4. **逐步二分**：逐个测试每个 doc 文件的图，找出具体哪个图的 parser 有问题

### 关键原则
- **先诊断，再动手**：盲目改代码只会引入更多 bug
- **小步提交**：每个 fix 独立 commit，便于回溯
- **push 前必须 build**：本地 build 通过才能 push，避免 CI 失败浪费构建资源

## 项目结构

```
uocc-technical-log/
├── docs/                  # 毕设 Markdown 源文档（不参与构建）
│   ├── _meta.json        # 章节配置
│   └── **/*.md           # 章节内容
└── web/                  # Next.js 16 + Framer Motion 网站
    ├── src/
    │   ├── components/
    │   │   ├── docs/
    │   │   │   ├── doc-renderer.tsx       # Markdown 渲染入口
    │   │   │   └── diagrams/             # :::diagram SVG 渲染
    │   │   └── visualizations/           # 动画组件 (u04/u05/u06)
    │   ├── data/generated/
    │   │   ├── docs.json                # 从 docs/ 提取的内容
    │   │   └── versions.json            # 版本元数据
    │   ├── lib/
    │   │   └── diagram-parser.ts        # YAML-like diagram 语法解析器
    │   └── plugins/
    │       └── remark-diagram.ts        # unified plugin
    └── scripts/
        └── extract-docs.ts             # 从 docs/ 生成 docs.json
```

## 常见问题

### Build 卡在 "Generating static pages"
- 大概率是 **Parser 无限循环**
- 检查 `diagram-parser.ts` 中的循环是否有推进索引的出口
- 检查 `remark-diagram.ts` plugin 是否在 `processSync` 中阻塞

### TypeScript "types have no overlap"
- 在条件分支中赋值给 narrow 后的变量导致 TypeScript 丢失 narrowing
- 解决：用临时变量 `const sec = section as string` 保存值再比较

### doc-renderer 中 dangerouslySetInnerHTML 警告
- 这是处理 Markdown HTML 的标准方式，**不是 bug**
- LSP 误报，可以忽略
