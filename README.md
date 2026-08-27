# MindDeck

**用思维导图保留整个演示结构，让每个节点又是一张真正可设计的 16:9 页面。**

> 当前版本：**V9.9.0** · Smart Deck · 单 HTML · 本地优先 · Unified Runtime

[在线体验](https://18611429192.github.io/minddeck/app.html) · [交互 Demo](https://18611429192.github.io/minddeck/demo.html) · [项目首页](https://18611429192.github.io/minddeck/)

![MindDeck 动态演示](docs/assets/minddeck-demo.gif)

普通 PPT 很适合按页讲，但产品方案、技术架构、培训和评审本身往往是一棵树。MindDeck 保留这棵树：你可以从全局结构进入任意分支，每个节点又能拥有一张真正的 16:9 页面；演示时折叠一个分支，它的细节页会自动离开后续播放序列。

V9.9 开始，MindDeck 不再只解决“怎么编辑和播放”，还加入了**从内容到演示结构**这一层：把 Markdown / 大纲粘进去，自动识别页面角色、选择整套主题和信息密度，然后生成仍然完全可编辑的 MindDeck 原生页面。

## V9.9 新增：Smart Deck

- **大纲直接成稿**：支持 `# / ## / ### / -` Markdown，也支持普通缩进大纲。
- **12 种页面角色**：封面、章节、观点、卡片、对比、流程、指标、趋势、时间轴、引用、图文、结论。
- **12 套演示主题**：晨光、深海蓝、森林、暖焰、紫曜、岩灰、沙金、墨黑、海盐、薄荷、玫瑰、黑白。
- **信息密度**：精简 / 标准 / 丰富，控制一页承载多少信息，而不是简单缩字体。
- **角色自动判断**：根据标题、正文、数字和要点结构自动选择指标、流程、趋势、对比、结论等版式。
- **页面方案**：在自由页面编辑器中可重新选择当前页角色、主题和密度并重新套版。
- **整套换主题**：只重绘由 Smart Deck 生成的页面；普通手工页面不会被强制覆盖。
- **原生数据输出**：所有结果最终仍然是普通 `node + slideElements + master`，因此可继续拖拽、改字、加图、加视频、做动画、改母版。
- **不新增第二套演示 / 导出架构**：编辑器、演示、Portable HTML、融合 HTML、Pages Showcase 继续共享同一 Shared Runtime。

这套能力参考了 DashiPPT “内容 → 页面角色 → 主题 → 可编辑交付”的产品思路，但 **MindDeck 没有复制其 AGPL 代码、模板或素材**；V9.9 的 Composer、版式和主题均在现有 MIT 项目架构中独立实现。

详见 [V9.9 Architecture](docs/architecture-v9.9.md)。

## 核心能力

- **思维导图**：左右、单侧、向下、放射布局；曲线连线；拖动；展开 / 折叠；按当前可见节点重排。
- **自由页面**：每个节点一张 1600 × 900 页面，支持文字、图片、视频、形状、母版、多选、对齐、图层和轻量动画。
- **智能组稿**：大纲解析、页面角色推断、主题生成、单页重新套版、整套换主题。
- **现场演示**：目录跳转、目录显隐、键盘 / 滚轮 / 触摸翻页，展开状态实时决定播放序列。
- **Portable 导出**：JSON、`.minddeck`、独立思维导图 HTML、独立演示 HTML、融合 HTML。
- **本地优先**：无需注册、无需后端；项目默认保存在浏览器本地。

## 两分钟开始

直接打开 [在线编辑器](https://18611429192.github.io/minddeck/app.html)。顶部点击 **“智能组稿”**，粘贴一份大纲即可生成完整演示；也可以像以前一样从思维导图手工搭建。

源码仓库只跟踪真正的源码，不提交容易过期的构建快照；本地执行 `npm run build` 会生成最新的 `src/runtime/shared-core.js` 和根目录 `index.html`，后者可以离线双击运行。

```bash
npm install
npm run build
npm run serve
```

然后打开 `http://localhost:8080`。

完整 Node / 架构检查：

```bash
npm run release:check
```

真实浏览器回归：

```bash
npx playwright install chromium
npm run e2e
```

## V9.8 → V9.9：架构怎么演进

V9.6 解决“编辑与导出两套业务逻辑”；V9.7 把应用源码从巨型 HTML 拆出来；V9.8 把 Shared Runtime、Demo、Portable、构建和样式职责真正收口。V9.9 在这套架构上新增 Composer，但仍坚持**业务只实现一次**。

```text
Markdown / Outline
        ↓
Shared Runtime Composer
        ↓
page role + theme + density
        ↓
MindDeck native node / slideElements / master
        ↓
┌──────────────┬──────────────┬──────────────┐
│ Main Editor  │ Presentation │ Portable HTML│
└──────────────┴──────────────┴──────────────┘
        ↓              ↓              ↓
      同一套 Slide / Presentation / Portable Runtime
```

Composer 不直接操作 DOM，也不拥有自己的播放器。应用层 `25-smart-compose.js` 只负责输入框、按钮、预览和调用 Shared Runtime。

## 源码结构

```text
src/
├─ runtime/
│  ├─ modules/
│  │  ├─ env.js
│  │  ├─ model.js
│  │  ├─ composer.js      # V9.9：大纲解析、角色推断、版式生成、整套换主题
│  │  ├─ platform.js
│  │  ├─ slide.js
│  │  ├─ view.js
│  │  └─ portable.js
│  └─ index.js
├─ app/
│  ├─ modules/
│  │  └─ 25-smart-compose.js  # 只做 Smart Deck UI
│  └─ styles/
├─ core/
│  └─ composer.js         # Shared Runtime thin adapter
└─ portable/

examples/                 # Showcase 项目数据
tests/                    # Node + Playwright 回归
site/                     # GitHub Pages 首页和入口
docs/                     # 架构、发布与说明文档
```

构建后临时生成：

```text
src/runtime/shared-core.js
index.html
```

它们均已 Git-ignore，Pages 和本地构建永远从当前源码生成，避免“源码和发布物不是同一版本”。

## 架构原则

**业务只实现一次。** Tree、Layout、Presentation、Composer、TOC、Map/Slide Renderer 等规则必须来自 Shared Runtime。编辑器、Portable 和 Pages Showcase 可以有不同 UI 外壳，但不能各自实现一套业务算法。

V9.9 特别增加了 Composer 架构门禁：应用层不允许重新实现大纲解析、页面角色推断或版式生成；Smart Deck 生成的结果只能通过原生项目数据进入现有编辑、演示和导出链。

## 浏览器支持

主要面向当前版本 Chrome / Edge / Safari / Firefox。移动端支持触摸浏览和页面编辑；Smart Deck 在手机端提供浮动入口。不同浏览器的全屏、媒体自动播放和本地存储配额可能存在差异。

## 当前限制

- V9.9 的“智能组稿”是**本地确定性 Composer**，不会把内容上传到 AI 服务，也不会自动调用大模型。你可以先让任意 AI Agent 产出 Markdown 大纲，再交给 MindDeck 生成页面。
- MindDeck 仍不是 PowerPoint 的完整替代品；Office 原生 PPTX 导出和复杂专业图表不是 V9.9 的核心目标。
- 自动套版会覆盖当前页的 `slideElements`；手工精排后的页面建议通过撤销、项目备份或只换整套主题来保护已有设计。
- 大量 Base64 图片 / 视频会显著增大项目和单 HTML 文件。
- 浏览器 localStorage 容量有限，重要项目建议同时保存 `.minddeck` 或 JSON 备份。

## 贡献与反馈

最有价值的问题是：**哪一步让你不敢在正式会议里用？自动组稿是否真的帮你减少了从大纲到页面的机械工作？编辑、演示和导出有没有行为不一致？**

贡献前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。安全说明见 [SECURITY.md](SECURITY.md)。

## License

MIT License。
