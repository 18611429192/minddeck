# MindDeck V9.6 统一业务架构

V9.6 的目标不是继续给 `index.html` 打补丁，而是让同一个业务规则只有一个实现源。

## 最终结构

```text
src/runtime/
├─ shared-core.js       # 浏览器、编辑器、Portable HTML 的唯一业务运行时
└─ shared-styles.css    # 动画等共享运行时样式

src/core/
├─ runtime.js           # Node/CI 载入 shared-core
├─ ids.js               # thin adapter
├─ tree.js              # thin adapter
├─ project.js           # thin adapter
├─ layout.js            # thin adapter
├─ commands.js          # thin adapter
├─ presentation.js      # thin adapter
├─ diagnostics.js       # thin adapter
└─ recovery.js          # thin adapter

index.html
├─ 内嵌 shared-core.js
├─ 内嵌 shared-styles.css
└─ Main Editor UI Adapter

导出的 HTML
├─ 内嵌同一个 shared-core.js
├─ 内嵌同一个 shared-styles.css
└─ 调用 MindDeckCore.Portable.mount(...)
```

## 单一实现源

| 能力 | 唯一实现 |
|---|---|
| ID 生成 | `Ids` |
| 树遍历 / 查父子 / 可见节点 | `Tree` |
| 项目规范化 / 默认母版 / 新节点 | `Project` |
| 五种导图布局 / 曲线 / 新节点位置 | `Layout` |
| 节点增删改 / 收放 / 键盘导航语义 | `Commands` |
| 演示顺序 / 折叠后回退 / 上下页 | `Presentation` |
| 演示运行状态 | `PresentationSession` |
| 目录树 DOM 结构 | `TocRenderer` |
| 导图节点/连线 DOM 结构 | `MapRenderer` |
| 16:9 contain 缩放 | `Stage` |
| 导图视口 fit/zoom | `MapViewport` |
| 动画解析 | `Animation` |
| text/image/video/shape 渲染 | `Element` |
| 母版 + 当前页合成 | `Slide` |
| 全屏 | `Fullscreen` |
| 键盘 / 滚轮 / swipe 语义 | `Input` |
| 导图内联文字编辑/IME | `InlineEditor` |
| 项目自检 | `Diagnostics` |
| 恢复包 / history 限制 | `Recovery` |
| mindmap/fusion 导出数据裁剪 | `ExportData` |
| Portable 运行逻辑 | `Portable` |

## 允许存在的 Adapter

以下不是“双实现”，因为它们不定义业务规则：

- Main Editor 的按钮、侧栏、选择框、拖拽 resize handles。
- Portable HTML 的顶部壳、移动端抽屉和本地存储 key。
- 浏览器文件选择、ZIP 打包、下载动作。
- 编辑器 undo/redo UI 生命周期。
- GitHub Pages 落地页和 Showcase Demo。

这些 Adapter 只能调用 Shared Runtime，不能重新实现 Tree/Layout/Presentation/Renderer 等规则。

## 防止重新分叉

`npm run release:check` 会执行 `scripts/verify-architecture.mjs`：

1. `src/runtime/shared-core.js` 必须和 `index.html` 内嵌 Runtime 完全一致。
2. `shared-styles.css` 必须和 `index.html` 内嵌样式完全一致。
3. Main Editor 必须调用共享 Map/Toc/Presentation/Slide/Diagnostics/Recovery。
4. Portable HTML 模板只能 `MindDeckCore.Portable.mount(...)`，禁止重新出现第二套 `renderMap / renderToc / autoLayout / rebuildPresentation / inlineEdit`。
5. `src/core/*.js` 必须是 thin adapter，不允许出现第二套函数实现。
6. 旧布局函数、旧播放顺序算法重新出现时 CI 直接失败。

## 开发规则

以后改业务逻辑：

```text
先改 src/runtime/shared-core.js
        ↓
npm run build:runtime
        ↓
npm run release:check
```

禁止直接在 `buildPortableHtml()` 里补一份算法。
