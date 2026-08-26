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

直接打开 [在线编辑器](https://18611429192.github.io/minddeck/app.html)，或下载仓库根目录的 `index.html` 离线双击运行。

本地开发：

```bash
npm run build
npm run serve
```

然后打开 `http://localhost:8080`。

完整检查：

```bash
npm run release:check
```

## V9.8 正在解决什么

V9.6 解决了“编辑与导出两套业务逻辑”；V9.7 把大部分源码从单个 HTML 中拆出来；V9.8 的目标是继续消灭剩余的旁路实现，并让架构边界可检查。

重点包括：

- Pages Demo 不再维护独立的 slides / TOC / 翻页 / 折叠实现；
- Shared Runtime 继续拆分，避免 `shared-core.js` 变成新的巨型文件；
- Portable HTML / CSS 壳与业务 Runtime 分离；
- 引入真实浏览器级回归，覆盖母版、移动端、演示和导出；
- `package.json` 逐步成为版本号唯一来源。

最终发布优势不会改变：**根目录 `index.html` 仍然是完整单文件，离线可运行。**

详见 [V9.8 Architecture](docs/architecture-v9.8.md) 和 [Architecture Audit](ARCHITECTURE_AUDIT.md)。

## 浏览器支持

主要面向当前版本 Chrome / Edge / Safari / Firefox。移动端支持触摸浏览和页面编辑；不同浏览器的全屏、媒体自动播放和本地存储配额可能存在差异。

## 当前限制

- MindDeck 不是 PowerPoint 的完整替代品；复杂图表、Office 原生格式和高级时间轴动画不是当前重点。
- 大量 Base64 图片 / 视频会显著增大项目和单 HTML 文件。
- 浏览器 localStorage 容量有限，重要项目建议同时保存 `.minddeck` 或 JSON 备份。

## 项目结构

```text
src/runtime/          Shared Runtime 与业务规则
src/app/              编辑器 UI 与应用状态
examples/             Demo / Showcase 项目数据
tests/                回归测试
site/                 GitHub Pages 首页和入口
docs/                 架构、发布与说明文档
```

## 贡献与反馈

最有价值的问题是：**哪一步让你不敢在正式会议里用？编辑、演示和导出有没有行为不一致？**

贡献前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。安全说明见 [SECURITY.md](SECURITY.md)。

## License

MIT License。
