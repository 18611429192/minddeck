# MindDeck

**用思维导图保留整个演示结构，让每个节点又是一张真正可设计的 16:9 页面。**

> 当前开发版本：**V9.8.0 RC** · 单 HTML · 本地优先 · Unified Runtime

[在线体验](https://18611429192.github.io/minddeck/app.html) · [交互 Demo](https://18611429192.github.io/minddeck/demo.html) · [项目首页](https://18611429192.github.io/minddeck/)

![MindDeck 动态演示](docs/assets/minddeck-demo.gif)

普通 PPT 很适合按页讲，但产品方案、技术架构、培训和评审本身往往是一棵树。MindDeck 保留这棵树：你可以从全局结构进入任意分支，每个节点又能拥有一张真正的 16:9 页面；演示时折叠一个分支，它的细节页会自动离开后续播放序列。

## 核心能力

- **思维导图**：左右、单侧、向下、放射布局；曲线连线；拖动；展开 / 折叠；按当前可见节点重排。
- **自由页面**：每个节点一张 1600 × 900 页面，支持文字、图片、视频、形状、母版、多选、对齐、图层和轻量动画。
- **现场演示**：目录跳转、目录显隐、键盘 / 滚轮 / 触摸翻页，展开状态实时决定播放序列。
- **Portable 导出**：JSON、`.minddeck`、独立思维导图 HTML、独立演示 HTML、融合 HTML。
- **本地优先**：无需注册、无需后端；项目默认保存在浏览器本地。

## 两分钟开始

直接打开 [在线编辑器](https://18611429192.github.io/minddeck/app.html)。源码仓库保留单 HTML 构建能力，本地执行 `npm run build` 后会生成最新的根目录 `index.html`，可以离线双击运行。

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

真实浏览器回归（手动运行，不绑定额外自动 Workflow）：

```bash
npx playwright install chromium
npm run e2e
```

## V9.8 完成了什么

V9.6 解决“编辑与导出两套业务逻辑”；V9.7 把应用源码从巨型 HTML 拆出来；V9.8 继续把**业务源码、Demo、Portable、构建和样式职责真正收口**。

- Shared Runtime 已从人工维护的 `shared-core.js` 拆为标准 ES Modules：`model / platform / slide / view / portable`；`shared-core.js` 现在只是构建产物。
- Runtime 模块使用显式 `import/export`，构建时再合成为浏览器 IIFE，因此发布物仍然可以是一个离线 HTML。
- Pages Demo 不再维护独立 slides / TOC / 翻页 / 折叠实现，而是加载 `examples/demo.json` 后进入正式 `PresentationView`。
- Showcase 不写入用户项目存储，避免查看 Demo 覆盖本地项目。
- Portable HTML / CSS 外壳已从导出 JS 中抽离，业务行为仍只由 `MindDeckCore.Portable.mount()` 提供。
- `package.json` 是版本单一来源；构建会先生成同版本 Runtime，再生成最终 HTML。
- 原本持续膨胀的响应式 CSS 已拆为响应式、工作区和组件/主题三层文件。
- Playwright 浏览器回归已加入，可手动覆盖桌面 / 手机、Showcase、母版和 Portable。
- License、贡献规范、Issue / PR 模板与历史发布文档已经整理。

详见 [V9.8 Architecture](docs/architecture-v9.8.md) 和 [Architecture Audit](ARCHITECTURE_AUDIT.md)。

## 源码结构

```text
src/
├─ runtime/
│  ├─ modules/
│  │  ├─ env.js
│  │  ├─ model.js
│  │  ├─ platform.js
│  │  ├─ slide.js
│  │  ├─ view.js
│  │  └─ portable.js
│  ├─ index.js
│  └─ shared-core.js      # generated
├─ app/
│  ├─ modules/            # editor application closure responsibilities
│  └─ styles/
└─ portable/              # portable shell / styles

examples/                 # Showcase 项目数据
tests/                    # Node + Playwright 回归
site/                     # GitHub Pages 首页和入口
docs/                     # 架构、发布与说明文档
```

## 架构原则

**业务只实现一次。** Tree、Layout、Presentation、TOC、Map/Slide Renderer 等规则必须来自 Shared Runtime。编辑器、Portable 和 Pages Showcase 可以有不同 UI 外壳，但不能各自实现一套业务算法。

`src/app/modules/` 仍然共享一个编辑器 application closure，这是有意保留的 UI 状态边界；它们是职责切片，不是第二套业务 Runtime。

## 浏览器支持

主要面向当前版本 Chrome / Edge / Safari / Firefox。移动端支持触摸浏览和页面编辑；不同浏览器的全屏、媒体自动播放和本地存储配额可能存在差异。

## 当前限制

- MindDeck 不是 PowerPoint 的完整替代品；复杂图表、Office 原生格式和高级时间轴动画不是当前重点。
- 大量 Base64 图片 / 视频会显著增大项目和单 HTML 文件。
- 浏览器 localStorage 容量有限，重要项目建议同时保存 `.minddeck` 或 JSON 备份。

## 贡献与反馈

最有价值的问题是：**哪一步让你不敢在正式会议里用？编辑、演示和导出有没有行为不一致？**

贡献前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。安全说明见 [SECURITY.md](SECURITY.md)。

## License

MIT License。
