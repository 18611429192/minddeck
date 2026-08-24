# Shared Runtime

MindDeck V9.7 继续以 `shared-core.js` 作为唯一业务 Runtime 实现源。Tree、Project、Layout、Presentation、TOC、Map/Slide/Element Renderer、Input、Fullscreen、Diagnostics、Recovery、Portable 等算法都从这里提供。

应用 Host 已移动到 `src/app/modules/`；最终构建由 `scripts/build-single-html.mjs` 把 Shared Runtime 与应用模块一起内联进单个 `index.html`。
