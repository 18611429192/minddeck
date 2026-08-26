# MindDeck V9.8 架构审计

结论目标：**同一种业务规则只有一个实现源；不同运行形态只保留 Host / Shell 差异。**

V9.8 在 V9.6 的业务统一和 V9.7 的应用源码拆分基础上，进一步完成 Shared Runtime 源码模块化、Pages Demo 收口、Portable 外壳抽离、版本构建收口和 CSS 职责拆分。

## 当前单一业务源

| 能力 | 唯一源码位置 | 消费方 |
|---|---|---|
| Tree / Project / Theme | `src/runtime/modules/model.js` | 编辑器、Showcase、Portable |
| Layout / Presentation / Commands | `src/runtime/modules/model.js` | 编辑器、Showcase、Portable |
| Stage / MapViewport / Input / Fullscreen | `src/runtime/modules/platform.js` | 编辑器、PresentationView、Portable |
| Recovery / Diagnostics | `src/runtime/modules/platform.js` | 编辑器、自检 |
| Animation / Element / Slide | `src/runtime/modules/slide.js` | 编辑器、PresentationView、Portable |
| InlineEditor / MapRenderer / TOC | `src/runtime/modules/view.js` | 编辑器、Portable |
| PresentationSession / PresentationView | `src/runtime/modules/view.js` | 编辑器演示、Pages Showcase、Portable 演示 |
| ExportData / Portable | `src/runtime/modules/portable.js` | HTML 导出 |

`src/runtime/index.js` 只负责把这些模块组装为 `MindDeckCore`。

## `shared-core.js` 的身份已经改变

V9.7 以前：

```text
src/runtime/shared-core.js = 人工维护的唯一业务源码
```

V9.8：

```text
src/runtime/modules/*.js + src/runtime/index.js
                ↓ scripts/build-runtime.mjs
src/runtime/shared-core.js = GENERATED 浏览器 Runtime
                ↓ scripts/build-single-html.mjs
index.html = 单文件发布物
```

因此不再允许手工修改 `shared-core.js`。业务修改必须发生在标准 ES Modules 源码中。

## 为什么应用层仍是 application closure

`src/app/modules/` 仍按顺序合并进同一个编辑器闭包。这不是业务“双实现”，而是一个有意保留的 UI 状态边界：DOM 引用、当前选择、编辑器打开状态、撤销栈等高耦合 UI 状态保持单实例。

规则是：

- Application 可以调用 Runtime；
- Application 可以保存 UI 状态和绑定事件；
- Application **不能**重新实现 Tree / Layout / Presentation / TOC / Renderer 等算法。

所以 V9.8 不追求“每一个 JS 文件都必须独立 import/export”，而是把真正需要唯一性的业务规则模块化。

## Pages Demo：已消除第二套演示实现

旧 `site/demo.html` 曾经拥有自己的：

- `slides` 数组；
- visible/order 计算；
- TOC 渲染；
- step 翻页；
- 安全分支展开/折叠逻辑。

V9.8 后 `site/demo.html` 只进入 `app.html?showcase=1`。

正式应用 Showcase：

1. 加载 `examples/demo.json`；
2. 使用正式项目模型；
3. 进入正式 `PresentationView`；
4. 不把 Showcase 项目写进用户本地存储。

因此 Demo 与编辑器内演示已经不存在两套 Presentation 引擎。

## Portable：行为和外壳分离

Portable 现在分成两类职责：

```text
src/portable/shell.html
src/portable/portable.css
        ↓ 仅负责结构与视觉
MindDeckCore.Portable.mount()
        ↓ 负责真实行为
```

`src/app/modules/40-portable-export.js` 只负责：

- 取得项目数据；
- 取得 Shared Runtime；
- 注入 Portable shell；
- 生成最终独立 HTML。

它不再维护整份 HTML/CSS 字符串，也不能重新实现 `renderMap / renderToc / layout / presentation order`。

## 版本单一来源

唯一手工维护版本：

```text
package.json
```

构建顺序：

```text
package version
  → build-runtime.mjs
  → generated shared-core.js
  → build-single-html.mjs
  → index.html
```

`build-single-html.mjs` 会拒绝使用版本不匹配的 Runtime，防止 App / Runtime 漂移。

## CSS 职责拆分

原 `90-responsive.css` 曾同时承担：响应式、工作区视觉、手机主界面、主题、自检、恢复、欢迎页、演示模式、母版状态等职责。

V9.8 拆为：

- `90-responsive.css`：尺寸适配、固定 1600×900 舞台约束、移动页面编辑器和基础响应式；
- `91-workspace.css`：工作区、导图表面、桌面/平板/手机主界面与面板；
- `92-components.css`：主题、自检、恢复、欢迎页、演示 chrome、折叠面板、母版状态。

CSS 仍按 manifest 顺序合并，因此最终单 HTML 的级联行为保持可控。

## 自动门禁

`npm run release:check` 的构建顺序首先生成 Runtime 和最终 HTML，然后运行 Node 测试及契约检查。

`verify-architecture.mjs` 会检查：

- Runtime 源码存在真实 ESM `export`；
- 模块依赖通过显式 `import` 表达；
- model 层不得访问 `window / document`；
- 生成 Runtime 不残留 ESM 语法；
- 最终 HTML 内嵌 Runtime 与生成文件完全一致；
- 主编辑器必须调用 Shared Renderer / PresentationView / Diagnostics / Recovery；
- Pages Demo 不得重新出现 slides / TOC / step 实现；
- Portable exporter 和 shell 不得重新出现布局、TOC、播放顺序等业务实现；
- `src/core/*` 继续只是 Shared Runtime 兼容适配器。

Playwright 回归额外覆盖真实浏览器中的 Showcase、折叠播放序列、Portable 生成、母版与移动端固定 16:9 舞台。

## V9.8 不可退化规则

1. 不手改 `src/runtime/shared-core.js`。
2. 不在 `site/demo.html` 新建 Presentation 逻辑。
3. 不在 Portable exporter/shell 新建 Layout、Presentation、TOC、MapRenderer。
4. 不在 app UI 层复制 Runtime 算法。
5. 不让 App 和 Runtime 各自维护版本号。
6. 不为了“形式上的模块化”复制状态或制造第二套模型。
7. 最终发布物继续保持单 HTML、无外部 JS/CSS 运行依赖。

## 演进结论

- **V9.6**：解决编辑器 / 导出之间的业务双实现。
- **V9.7**：解决源码全部堆在一个巨大 HTML 中的问题。
- **V9.8**：解决 Runtime 源码单体、Demo 旁路实现、Portable 壳内嵌、版本漂移和 CSS 大杂烩。

当前架构的核心不是“文件越多越好”，而是：**业务规则只有一个来源，Host 只负责环境差异，构建产物可以重新合成一个文件。**
