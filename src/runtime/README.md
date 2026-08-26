# Shared Runtime

V9.8 起，`shared-core.js` 不再是人工维护的业务源码，而是 **构建生成产物，并且不再提交到 Git**。

真正的 Runtime 源码位于：

- `modules/model.js`：Tree、Project、Theme、Layout、Presentation、Commands、ID 与业务常量。
- `modules/platform.js`：Stage、MapViewport、Fullscreen、Input、Recovery、Diagnostics。
- `modules/slide.js`：Animation、Element、Slide。
- `modules/view.js`：InlineEditor、PresentationSession、MapRenderer、TocRenderer、PresentationView。
- `modules/portable.js`：ExportData、Portable 与 Architecture 声明。
- `index.js`：把上述模块组装成 `MindDeckCore`。

这些文件使用标准 ES Modules 的 `import/export` 明确依赖。`scripts/build-runtime.mjs` 会进行确定性合成，在工作区生成浏览器可直接内嵌的 `shared-core.js`；`scripts/build-single-html.mjs` 随后生成根目录 `index.html`。两者都在 `.gitignore` 中，避免生成快照与源码版本再次漂移。

`src/core/*` 兼容适配器直接消费 ESM 源码图；回归测试则同时验证 ESM 源码和构建后浏览器 Runtime。

因此同时保留三件事：

1. **源码是真模块**，业务依赖不再靠文件拼接顺序猜测。
2. **Git 中没有过期生成快照**，版本只来自 `package.json` 和源码。
3. **发布物仍是单 HTML**，Pages / 本地构建时生成，离线运行能力不变。

约束：业务规则只能在 Runtime modules 中实现；编辑器、Pages Showcase 和 Portable 导出不得复制 Layout、Presentation、TOC、Map/Slide Renderer 等第二套实现。
