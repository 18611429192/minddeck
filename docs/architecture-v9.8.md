# MindDeck V9.8 Architecture

## 目标

V9.8 不再继续堆按钮，而是把“双实现 / 多实现”风险降到最低，同时保留单 HTML 离线发布能力。

最终约束：

- 编辑器、演示、Portable 导出和 GitHub Pages Showcase 共享同一套业务规则；
- 最终发布物仍然是一个可离线运行的 `index.html`；
- UI 可以有不同外壳，但 Tree、Layout、Presentation、TOC、Map/Slide Renderer 等规则只能有一个来源；
- 版本号只从 `package.json` 产生；
- 架构检查阻止第二套实现重新出现。

## Shared Runtime：真正的 ES Modules

V9.8 中 `src/runtime/shared-core.js` 已降级为**生成产物**，不再人工维护。

真正源码为：

```text
src/runtime/
├─ modules/
│  ├─ env.js
│  ├─ model.js       # Tree / Project / Theme / Layout / Presentation / Commands
│  ├─ platform.js    # Stage / MapViewport / Input / Fullscreen / Recovery / Diagnostics
│  ├─ slide.js       # Animation / Element / Slide
│  ├─ view.js        # InlineEditor / PresentationSession / MapRenderer / TocRenderer / PresentationView
│  └─ portable.js    # ExportData / Portable / Architecture
├─ index.js           # createMindDeckCore()
└─ shared-core.js     # GENERATED
```

这些源文件使用标准 `import/export` 明确依赖。`scripts/build-runtime.mjs` 使用仓库自身的确定性合成逻辑生成浏览器 IIFE Runtime，不引入额外 bundler 依赖。

这样同时满足：源码可维护、依赖显式；最终 Runtime 又能被内嵌到一个 HTML 中。

## Application UI

`src/app/modules/` 是同一个编辑器 application closure 中的 UI 职责切片，负责 DOM 绑定和可变编辑状态。它们不伪装成独立业务模块，也不得重新实现 Runtime 已有算法。

这条边界是有意保留的：业务规则模块化，UI 状态仍在一个应用作用域内，避免为了“形式上的模块”制造循环依赖和多份状态。

## Portable

Portable 的结构和样式已经从导出 JS 抽离到：

- `src/portable/shell.html`
- `src/portable/portable.css`

`40-portable-export.js` 只负责把项目数据、Shared Runtime 和 Portable shell 组装成最终单 HTML。运行行为仍由 `MindDeckCore.Portable.mount()` 提供。

## Pages Showcase

`site/demo.html` 不再维护 `slides / TOC / step / collapse` 第二套实现，只进入 `app.html?showcase=1`。

Showcase 从 `examples/demo.json` 加载项目，并调用正式应用的 `PresentationView`；Showcase 模式不会把示例写入用户本地项目存储。

## 构建链

```text
package.json version
        ↓
scripts/build-runtime.mjs
        ↓
src/runtime/shared-core.js
        ↓
scripts/build-single-html.mjs
        ↓
index.html
```

`build-single-html.mjs` 会检查 Shared Runtime 版本是否与 `package.json` 一致，避免生成物偷偷使用旧 Runtime。

## 测试与门禁

Node 回归负责业务规则和生成物契约；Playwright 负责真实浏览器行为，包括 Showcase、折叠后的播放序列、Portable、母版和移动端 1600×900 舞台。

`verify-architecture.mjs` 还会检查：

- Runtime modules 必须存在标准 ESM export；
- 模块间必须使用显式 import；
- model 层不得依赖 DOM/window；
- Demo 不得重建演示引擎；
- Portable exporter / shell 不得重建布局、TOC 或播放逻辑；
- 最终 `index.html` 内嵌 Runtime 必须与生成的 `shared-core.js` 完全一致。

## 不可退化规则

- 不在 Demo 中重新实现 Presentation；
- 不在 Portable 中重新实现 Layout / Presentation / TOC；
- 不在编辑器 UI 中复制 Tree / Layout / Presentation 算法；
- 不手改 `shared-core.js`；
- 构建后的单 HTML 不依赖外部 JS/CSS；
- 版本号不允许在多个源文件手工维护。
