# MindDeck

**用思维导图保留整个演示结构，让每个节点又是一张真正可设计的 16:9 页面。**

> 当前版本：**V9.9.0** · Smart Deck Composer · 单 HTML · 本地优先 · Unified Runtime

[在线体验](https://18611429192.github.io/minddeck/app.html) · [交互 Demo](https://18611429192.github.io/minddeck/demo.html) · [项目首页](https://18611429192.github.io/minddeck/)

![MindDeck 动态演示](docs/assets/minddeck-demo.gif)

普通 PPT 很适合按页讲，但产品方案、技术架构、培训和评审本身往往是一棵树。MindDeck 保留这棵树：你可以从全局结构进入任意分支，每个节点又能拥有一张真正的 16:9 页面；演示时折叠一个分支，它的细节页会自动离开后续播放序列。

V9.9 在 V9.8 Unified Runtime 上补齐了**从内容到页面**这一层，而且仍然只维护一套 Project / Renderer / Presentation / Portable。

## V9.9：Smart Deck Composer

### 从大纲或 DeckSpec 生成

- **Markdown / 大纲直接成稿**：支持 `# / ## / ### / -` 和普通缩进大纲；
- **DeckSpec v1**：支持粘贴 JSON 或打开 `.json`，先校验再生成正式 MindDeck Project；
- **12 种页面角色**：封面、章节、观点、卡片、对比、流程、指标、趋势、时间轴、引用、图文、结论；
- **12 套演示主题**：结构模板与视觉 token 解耦；
- **信息密度**：精简 / 标准 / 丰富。

### 不再是“一种 Role 一个硬编码 layout”

V9.9 当前有 **24 个独立 SlideTemplate**。生成链变为：

```text
SlideContent
   ↓
Capacity / required slot
   ↓
Template Matcher
   ↓
Candidate A / B / C ...
   ↓
Diversity Allocator
   ↓
Template Compiler
   ↓
node.slideElements[]
```

- **Capacity**：先判断内容能不能装下；
- **Matcher**：按 role、容量余量、数字/媒体亲和和 priority 给出可解释候选；
- **Diversity Allocator**：从整稿角度减少相邻页面 template/family 重复；
- **A/B/C 页面方案**：同一份 `SlideContent` 推荐不同真实结构模板，而不只是切 Role；
- **Quality Validator**：在 Node 环境检查 Spec、容量、元素几何、重复 id、媒体和全稿质量。

### 保护人工编辑

Smart Deck 页面保存 `generatedHash`。重新套版前使用：

```js
Core.Composer.Provenance.isDirty(node)
```

判断当前 `slideElements` 是否已经被人工修改。

- 新生成页：`dirty=false`；
- 改字、移动、缩放、新增或删除元素：`dirty=true`；
- dirty 页换版式前必须确认；
- 整套换主题默认跳过 dirty 页；
- 应用新模板后重新记录 generatedHash；
- 删除 `node.composer` 后页面仍然可以正常编辑、演示和导出。

## 最重要的架构边界

```text
Outline / DeckSpec / SlideContent
              ↓
          Core.Composer
              ↓
MindDeck Project / slideElements
              ↓
          MindDeckCore
      ┌───────┼────────┐
      ↓       ↓        ↓
    Editor Presentation Portable
```

**Composer 只是项目数据生产者，不是第二个 Runtime。**

V9.9 最终没有采用旧设计中单独建立 `src/composer/ + global.MindDeckComposer` 的方案。第一版 Smart Deck 已经进入 Shared Runtime，所以现在只把内部职责模块化，公开入口继续只有 `Core.Composer`。

应用层 `25-smart-compose.js` 和 `26-deck-spec-import.js` 只是 UI Host，不允许实现 Matcher / Allocator / Compiler。

## 核心能力

- **思维导图**：左右、单侧、向下、放射布局；曲线连线；拖动；展开 / 折叠；按当前可见节点重排；
- **自由页面**：每个节点一张 1600 × 900 页面，支持文字、图片、视频、形状、母版、多选、对齐、图层和轻量动画；
- **Smart Deck**：大纲 / DeckSpec、SlideContent、24 个结构模板、Capacity、Matcher、Allocator、A/B/C、Provenance、Quality；
- **现场演示**：目录跳转、目录显隐、键盘 / 滚轮 / 触摸翻页，展开状态实时决定播放序列；
- **Portable 导出**：JSON、`.minddeck`、独立思维导图 HTML、独立演示 HTML、融合 HTML；
- **本地优先**：无需注册、无需后端，项目默认保存在浏览器本地。

## 两分钟开始

直接打开 [在线编辑器](https://18611429192.github.io/minddeck/app.html)。

- 想从普通文字开始：点 **“智能组稿”**，粘贴 Markdown / 大纲；
- 已有结构化数据：点 **“DeckSpec”**，粘贴或打开 `examples/deck-spec-v1.json`；
- 想完全手工制作：继续使用思维导图和自由页面编辑器。

本地开发：

```bash
npm install
npm run build
npm run serve
```

然后打开 `http://localhost:8080`。

自动发布检查：

```bash
npm run release:check
```

真实浏览器 E2E：

```bash
npx playwright install chromium
npm run e2e
```

## V9.8 → V9.9：架构怎么演进

- V9.6：统一编辑器与导出的业务规则；
- V9.7：把应用源码从巨型 HTML 拆出；
- V9.8：统一 Shared Runtime、Pages Demo、Portable、构建和样式职责；
- V9.9：在**同一个 Shared Runtime** 里增加 Composer，并把内容、模板、匹配、分配、编译、人工编辑保护和质量检查收口。

## 源码结构

```text
src/
├─ runtime/
│  ├─ modules/
│  │  ├─ composer.js              # Core.Composer 唯一 façade
│  │  ├─ composer/
│  │  │  ├─ base.js
│  │  │  ├─ schema.js
│  │  │  ├─ outline.js
│  │  │  ├─ templates.js
│  │  │  ├─ matcher.js
│  │  │  ├─ allocator.js
│  │  │  ├─ compiler.js
│  │  │  ├─ provenance.js
│  │  │  ├─ quality.js
│  │  │  └─ deck.js
│  │  ├─ model.js
│  │  ├─ platform.js
│  │  ├─ slide.js
│  │  ├─ view.js
│  │  └─ portable.js
│  └─ index.js
├─ app/
│  └─ modules/
│     ├─ 25-smart-compose.js
│     └─ 26-deck-spec-import.js
├─ core/
│  └─ composer.js                 # Shared Runtime thin adapter
└─ portable/

examples/
├─ demo.json
└─ deck-spec-v1.json

tests/
├─ composer.test.mjs
└─ e2e/minddeck.spec.mjs
```

构建后临时生成：

```text
src/runtime/shared-core.js
index.html
```

它们已 Git-ignore，版本只来自 `package.json`。

## Map Layout 与 SlideTemplate 不是一回事

- **Runtime `Layout` / Map Layout**：思维导图节点怎么排列；
- **SlideTemplate**：一张 1600×900 页面怎么组织内容。

V9.9 文档和代码明确区分这两个概念，避免模板系统和导图布局重新耦合。

## 架构门禁

`verify-architecture.mjs` 会阻止：

- 新建第二个 `src/composer/` 或 `MindDeckComposer` global；
- Composer 访问 DOM / localStorage；
- App UI 复制 normalize / matcher / allocator / compiler / role inference；
- 第二个 Composer / MapRenderer / PresentationView / Portable；
- Portable exporter/shell 重新实现布局、TOC、播放顺序；
- Pages Demo 再建立第二套演示逻辑。

## 当前限制

- V9.9 Smart Deck 是**本地确定性 Composer**，不会把内容上传到 AI 服务，也不会自动调用大模型；
- MindDeck 仍不是 PowerPoint 的完整替代品，V9.9 不新增 PPTX 导出；
- V9.9 不新增 chart/metric/list Runtime element type，模板仍只编译为 `text/image/video/shape`；
- 大量 Base64 图片 / 视频会显著增大项目和单 HTML；
- 浏览器 localStorage 容量有限，重要项目建议同时保存 `.minddeck` 或 JSON 备份。

## 文档

- [V9.9 Architecture](docs/architecture-v9.9.md)
- [V9.9 Regression](docs/regression-v9.9.md)
- [Architecture Audit](ARCHITECTURE_AUDIT.md)
- [Release Checklist](docs/release-checklist.md)

## License

MIT License。

V9.9 的内容 → 页面结构 → 可编辑交付机制受同类开源产品思路启发，但 Composer、24 个结构模板、主题 token、Matcher、Allocator、Compiler 均为 MindDeck 独立实现；仓库不复制 DashiPPT 的 AGPL 源码、模板坐标或主题资产。
