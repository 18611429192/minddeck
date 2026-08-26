# Shared Runtime

V9.8 起，`shared-core.js` 不再是人工维护的业务源码，而是 **生成产物**。

真正的 Runtime 源码位于：

- `modules/model.js`：Tree、Project、Theme、Layout、Presentation、Commands、ID 与业务常量。
- `modules/platform.js`：Stage、MapViewport、Fullscreen、Input、Recovery、Diagnostics。
- `modules/slide.js`：Animation、Element、Slide。
- `modules/view.js`：InlineEditor、PresentationSession、MapRenderer、TocRenderer、PresentationView。
- `modules/portable.js`：ExportData、Portable 与 Architecture 声明。
- `index.js`：把上述模块组装成 `MindDeckCore`。

这些文件使用标准 ES Modules 的 `import/export` 明确依赖。`scripts/build-runtime.mjs` 会进行确定性合成，生成浏览器可直接内嵌的 `shared-core.js`，随后 `scripts/build-single-html.mjs` 再把它内嵌进最终单文件 `index.html`。

因此同时保留两件事：

1. **源码是真模块**，业务依赖不再靠文件拼接顺序猜测。
2. **发布物仍是单 HTML**，离线运行能力不变。

约束：业务规则只能在 Runtime modules 中实现；编辑器、Pages Showcase 和 Portable 导出不得复制 Layout、Presentation、TOC、Map/Slide Renderer 等第二套实现。
