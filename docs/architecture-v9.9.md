# MindDeck V9.9 Architecture — Smart Deck

## 目标

V9.9 的目标不是再增加一套“模板播放器”，而是在 V9.8 Unified Runtime 上补齐 **内容到页面** 这一层：

```text
Outline → Structure → Page Role → Theme/Density → Native MindDeck Project
```

生成结果必须继续满足 V9.6–V9.8 的核心约束：

- 编辑器、演示、Portable 导出、融合 HTML 和 Pages Showcase 共享同一业务规则；
- Smart Deck 不允许拥有第二套 Slide Renderer、Presentation、TOC 或 Layout；
- Composer 输出普通 `node / slideElements / master`，而不是新的私有页面格式；
- 最终发布物仍然可以构建成一个离线 `index.html`；
- 版本号继续只从 `package.json` 产生。

## 与 DashiPPT 的融合边界

V9.9 参考 DashiPPT 的产品机制：

1. 先把内容整理成结构化大纲；
2. 根据内容职责选择页面角色，而不是所有页都套同一模板；
3. 主题、密度、重点可成套调整；
4. 生成结果必须能继续编辑，而不是一次性图片或不可维护 HTML。

但 MindDeck **不直接复制** DashiPPT 的 AGPL-3.0 代码、1020 个版式、主题素材、控制台实现或 PPTX 导出代码。V9.9 的 Composer、12 套主题和 12 种页面角色均在 MindDeck 现有 MIT 架构中独立实现。

这样既吸收机制，也避免引入新的许可证义务和第二套技术栈。

## Shared Runtime 新增 Composer

新增：

```text
src/runtime/modules/composer.js
```

它是纯业务模块，不访问 `document` / `window`，负责：

- `parseOutline(source)`：解析 Markdown / 缩进大纲；
- `inferRole(node)`：根据标题、正文、数字和要点结构推断页面角色；
- `compose(source, options)`：创建原生 MindDeck 项目；
- `buildSlideElements(node, options)`：生成原生自由画布元素；
- `relayoutNode(node, options)`：当前页重新套版；
- `rethemeProject(project, theme)`：整套智能页换主题；
- `describe(project)`：统计页面、角色和智能页覆盖情况。

Runtime 同时公开：

- `DECK_THEMES`：12 套演示主题；
- `PAGE_ROLES`：12 种页面角色；
- `Composer`：统一业务入口。

## 12 种页面角色

V9.9 首批角色：

- cover：封面
- section：章节
- statement：观点
- cards：卡片
- compare：对比
- process：流程
- metrics：指标
- trend：趋势
- timeline：时间轴
- quote：引用
- image：图文
- conclusion：结论

角色不是独立 HTML 模板。每个角色最终只生成 MindDeck 已经支持的 `text / shape / image / video` 元素数据，因此现有 Slide Renderer 可以直接渲染。

## 12 套主题

V9.9 主题为独立的颜色 token：背景、surface、正文、次级文字、accent、accent2、line、danger、success。

主题只影响 Smart Deck 生成的页面视觉和 master 背景，不替代 V9.3 的 UI Theme。也就是说：

- `uiTheme`：MindDeck 工作界面 / 导图外观；
- `deckTheme`：演示页面视觉主题。

两个概念保持独立，避免 UI 主题与内容页面设计重新耦合。

## Application UI

新增：

```text
src/app/modules/25-smart-compose.js
```

它只能做 UI：

- “智能组稿”入口；
- 大纲输入；
- 主题 / 密度 / 导图布局选择；
- 解析预览；
- 当前页“页面方案”；
- 整套换主题；
- 手机浮动入口。

它不得实现：

- Markdown 解析；
- 页面角色推断；
- slideElements 版式算法；
- Presentation / TOC / Portable 逻辑。

这些都必须调用 `Core.Composer`。

## 数据模型

V9.9 不引入新的必需 schema。Smart Deck 只增加可选元数据：

```text
deckTheme
deckDensity
deckRole
deckComposerVersion
deckSource
```

旧项目没有这些字段也完全可用。普通手工页面没有 `deckRole` 时，整套换主题不会强制重绘它们。

## 生成链

```text
用户大纲
  ↓
Composer.parseOutline
  ↓
Tree specs
  ↓
Composer.inferRole
  ↓
Composer.buildSlideElements
  ↓
Project.normalize + Layout.apply
  ↓
原生 MindDeck Project
  ↓
Editor / Presentation / Portable / Pages
```

因此 Smart Deck 只是项目数据的生产者，不是新的运行时。

## 架构门禁

`scripts/verify-architecture.mjs` 从 V9.9 开始额外检查：

- `composer.js` 必须是 Shared Runtime ESM 源模块；
- Composer 业务层不得访问 DOM；
- Smart Compose UI 必须通过 `Core.Composer`；
- App 中不得重新出现 `parseMarkdown / parseIndented / inferRole / buildSlideElements`；
- `src/core/composer.js` 必须是 thin adapter；
- 生成 Runtime 必须包含唯一 `Composer` 实现。

新增 `tests/composer.test.mjs` 覆盖：

- 大纲解析和页数；
- 自动页面角色；
- 12 主题 / 12 角色注册；
- 原生 slideElements 生成；
- 整套换主题；
- Smart Deck 元数据。

## 为什么不在 V9.9 直接做 PPTX

PPTX 是一个独立的 Office 输出模型。如果直接把 DashiPPT 的导出层复制进来，会同时带来许可证、浏览器兼容、字体、图表和布局还原的一整套新技术栈，也会破坏当前“单 HTML、本地优先、零后端”的核心边界。

V9.9 先完成最关键的一层：**从内容快速得到结构完整、视觉统一、还能继续编辑的 MindDeck 演示**。未来如果做 PPTX，应作为单独适配器消费同一 Project 数据，而不是改写现有 Slide / Presentation Runtime。
