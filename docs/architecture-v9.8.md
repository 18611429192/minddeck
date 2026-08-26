# MindDeck V9.8 Architecture

## 目标

V9.8 的重点不是继续堆功能，而是彻底降低“双实现 / 多实现”的风险。

最终约束：

- 编辑器、演示、Portable 导出和 GitHub Pages Demo 共享同一套业务规则；
- 最终发布物仍然是一个可离线运行的 `index.html`；
- UI 可以有不同外壳，但布局、折叠、播放序列、目录、元素渲染等规则只能有一个来源；
- 架构检查需要阻止第二套实现重新出现。

## 当前推进方向

### Shared Runtime

Tree、Project、Layout、Presentation、PresentationView、MapRenderer、Slide、Portable 等属于业务与运行时能力，应继续从大文件中拆成明确模块。

### Application UI

`src/app/modules/` 负责编辑器 DOM、交互绑定和可变编辑状态。这里可以按职责拆文件，但不应该重新实现 Runtime 中已有的算法。

### Portable

Portable HTML 需要继续使用 Shared Runtime。HTML 壳、CSS 和业务行为应分离，避免在导出 JS 中维护一整套复制页面。

### Demo

`site/demo.html` 最终只负责进入正式应用的 Showcase 模式，项目数据由 `examples/demo.json` 提供。Demo 不再独立维护 slides、TOC、翻页和折叠逻辑。

### 测试

Node 回归负责纯业务逻辑和生成物契约；浏览器级回归负责中文输入、母版、演示、移动端、Portable HTML 等只有真实 DOM 环境才能发现的问题。

## 不可退化规则

- 不在 Demo 中重新实现 Presentation；
- 不在 Portable 中重新实现布局 / 播放顺序；
- 不在编辑器 UI 中复制 Tree / Layout / Presentation 算法；
- 构建后的单 HTML 不依赖外部 JS/CSS；
- 版本号最终只能有一个来源。
