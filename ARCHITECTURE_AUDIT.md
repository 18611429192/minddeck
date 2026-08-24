# V9.6 最终架构审计

结论：**业务层未发现双实现 / 多实现。演示视图层也已由 `PresentationView` 统一。**

审计口径：同一个 Tree / Layout / Presentation / TOC / Map Renderer / Slide Renderer / Animation / Viewport / Input / Fullscreen / Project / Diagnostics / Recovery 规则，在代码库中只能有一个实现源。UI Adapter 可以存在，但不能重新解释业务。

## V9.6 阶段完成情况

| 阶段 | 目标 | 状态 |
|---|---|---|
| V9.6.0 | Tree + Project Core 接管 | ✅ |
| V9.6.1 | Layout：编辑导图 / 导出导图统一 | ✅ |
| V9.6.2 | Presentation + TOC + Input + Fullscreen | ✅ |
| V9.6.3 | Element + Slide Renderer | ✅ |
| V9.6.4 | Viewport + Animation + Theme + Recovery/Diagnostics | ✅ |
| V9.6.5 | Portable 只保留壳，业务全部来自 Shared Runtime | ✅ |

## 已删除/收口的重复实现

- Portable 自己的树遍历、find/parent、visibleIds。
- Portable 自己的 hLayout / dLayout / radial layout。
- Portable 自己的演示顺序和 pIndex/pList 重建规则。
- Portable 自己的 renderMap 业务实现。
- Portable 自己的 renderToc 业务实现。
- Portable 自己的 inlineEdit IME 处理。
- Main/Portable 两套 TOC 树生成规则。
- Main/Portable 两套思维导图节点/曲线生成规则。
- Main/Portable 两套页面元素渲染。
- Main/Portable 两套母版 + 页面合成。
- Main 的项目诊断算法与 `src/core/diagnostics.js` 双实现。
- Main 的 history 容量算法与 recovery Core 双实现。
- 新节点默认结构/默认页面模型的分叉。
- Core 测试模块与浏览器 Runtime 的算法分叉。

## 自动化证明

运行：

```bash
npm run audit:architecture
npm run release:check
```

当前结果：

```text
Architecture audit: OK
MindDeck release check: ALL OK
```

架构检查会拒绝 Portable 模板重新出现第二套业务算法。


## V9.6.6 PresentationView 收口

编辑器内演示与 Portable 演示现在共同使用 `PresentationView`：

- 页面刷新、TOC 渲染、TOC 展开/收起、舞台缩放统一。
- 舞台边距统一为 20px。
- TOC 缩进统一为 8 + depth × 15，展开符号统一为 `＋ / −`。
- 键盘、滚轮、触摸输入统一由 PresentationView 调用 Shared Input。
- Host 只保留退出目的地、全屏目标、Portable 顶部壳等环境差异。


## V9.7 工程模块化

V9.7 在不改变业务 Runtime 的前提下，把根目录巨型 `index.html` 从“源码 + 产物混在一起”改为“模块源码 → 单 HTML 产物”：

- `src/app/shell.html`：静态页面壳。
- `src/app/modules/*`：按 Bootstrap / Map / Slide Editor / Presentation / Portable Export / Bindings 分层。
- `src/app/styles/*`：按 UI 职责拆分。
- `src/runtime/shared-core.js`：仍然是唯一业务实现源。
- `scripts/build-single-html.mjs`：唯一发布组装器。

新的发布门禁：

```text
V9.7 modular source/build parity: OK
Standalone single-HTML contract: OK
Architecture audit: OK
MindDeck release check: ALL OK
```

因此“源码模块化”不等于“发布多文件化”；用户拿到的仍然可以只有一个 HTML。
