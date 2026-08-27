# MindDeck V9.9 架构审计

结论：**V9.9 Smart Deck 已加入内容编排能力，但没有形成第二 Composer Runtime、第二 Renderer、第二 Presentation 或第二 Portable。**

## 单一数据链

```text
Outline / DeckSpec / SlideContent
              ↓
          Core.Composer
              ↓
MindDeck Project / slideElements
              ↓
          MindDeckCore
    Editor / Presentation / Portable
```

`slideElements` 仍是页面最终事实；`node.composer` 只保存重新推荐/重新编译所需的内容与 Provenance 元数据。

## 当前单一业务源

| 能力 | 唯一源码位置 | 消费方 |
|---|---|---|
| Tree / Project / Map Layout / Presentation order | `src/runtime/modules/model.js` | 编辑器、Composer bridge、Showcase、Portable |
| Platform / Input / Recovery / Diagnostics | `src/runtime/modules/platform.js` | 编辑器、PresentationView |
| Animation / Element / Slide | `src/runtime/modules/slide.js` | 编辑器、PresentationView、Portable |
| MapRenderer / TOC / PresentationView | `src/runtime/modules/view.js` | 编辑器、Showcase、Portable |
| Portable | `src/runtime/modules/portable.js` | HTML 导出 |
| Composer public façade | `src/runtime/modules/composer.js` | Smart Deck UI、DeckSpec Host、core adapter |
| Composer internal modules | `src/runtime/modules/composer/*` | `Core.Composer` façade |

## Composer 内部模块化

V9.9 把原先巨型 `composer.js` 拆为：

- `base.js`
- `schema.js`
- `outline.js`
- `templates.js`
- `matcher.js`
- `allocator.js`
- `compiler.js`
- `provenance.js`
- `quality.js`
- `deck.js`

但公开入口仍只有：

```js
MindDeckCore.Composer
```

仓库明确禁止重新出现：

```text
src/composer/
global.MindDeckComposer
```

## SlideTemplate / Capacity / Matcher / Allocator

当前 Registry 有 24 个独立结构模板。模板是纯数据 manifest，不含 DOM renderer。

匹配链：

```text
SlideContent
 → Capacity / required slot 硬过滤
 → Matcher 可解释评分
 → Candidate[]
 → Diversity Allocator 全稿去重
 → TemplateCompiler
 → slideElements[]
```

Allocator 不创建元素，Compiler 不渲染 DOM，UI 不复制任何评分/分配逻辑。

## Provenance

Composer 生成页记录 `generatedHash`。重新套版前使用 `Provenance.isDirty(node)` 比较当前 `slideElements`：

- 未修改：可直接重新编译；
- 已修改：UI 必须确认；
- 整套换主题：默认跳过 dirty 页并记录 warning。

人工编辑保护因此不侵入现有拖拽/输入实现，也不修改 Presentation/Portable。

## Project Bridge

`compileDeck()` 和大纲组稿使用现有：

- `Project.createNode()`
- `Project.normalize()`
- `Layout.apply()`
- `Tree.walkAll()`

Composer 不维护第二 Project / Tree / Map Layout 算法。

## Application Host

`25-smart-compose.js` 负责：

- Markdown / 大纲输入；
- Smart Deck 参数；
- A/B/C 推荐展示；
- dirty 确认；
- 调用 `Core.Composer`。

`26-deck-spec-import.js` 负责：

- DeckSpec JSON 粘贴/文件读取；
- 调用 `validateDeckSpec()`；
- 调用 `compileDeck()`；
- 错误展示和恢复备份。

两个文件都属于同一个 application closure，仅是 UI Host；不得实现 matcher/compiler/allocator。

## Renderer / Presentation / Portable 审计

V9.8 的门禁继续保留：

- 主导图调用 Shared `MapRenderer`；
- 正式演示和 Showcase 调用 Shared `PresentationView`；
- Portable exporter 只注入项目数据、Shared Runtime 和 shell；
- Portable 行为来自 `MindDeckCore.Portable.mount()`；
- `site/demo.html` 只进入正式 Showcase，不实现 slides/TOC/step；
- `src/core/*` 继续只是 Shared Runtime adapter。

## 生成物与版本

唯一版本源：`package.json`。

```text
ESM runtime modules
      ↓ build-runtime.mjs
src/runtime/shared-core.js  (GENERATED)
      ↓ build-single-html.mjs
index.html                  (GENERATED)
```

V9.9 Composer 子模块随唯一 Shared Runtime 一起构建，不存在第二 bundle/version/global。

## 自动门禁

`verify-architecture.mjs` 当前检查：

1. Runtime/Composer 子模块必须是真实 ESM；
2. Composer 禁止访问 `window/document/localStorage`；
3. Composer 禁止 `createElement/innerHTML/insertAdjacentHTML` renderer API；
4. 禁止 `src/composer/` 和 `MindDeckComposer`；
5. UI 必须调用 `Core.Composer` 的 compose/recommend/apply/validate/compile API；
6. UI 禁止复制 normalize / Capacity / Matcher / Allocator / Compiler / role inference；
7. Runtime 中 `Composer / MapRenderer / PresentationView / Portable` 各只能定义一次；
8. Portable exporter/shell 禁止重新实现 map/presentation；
9. Pages Demo 禁止重新实现演示；
10. core adapter 禁止重新拥有业务实现。

## 测试门禁

Node regression 覆盖：

- DeckSpec / SlideContent；
- 24 templates Registry；
- Capacity / Matcher；
- 24 templates × 12 themes 编译；
- Quality；
- Allocator seed 与 30 页场景；
- generatedHash / dirty；
- DeckCompiler Project bridge。

Playwright 覆盖：

```text
Smart Deck → 编辑 → A/B/C 换版式 → dirty
→ 整套换主题保护人工修改 → Presentation → Portable
```

## V9.9 不可退化规则

1. `Core.Composer` 继续是唯一 Composer 公开入口。
2. 不再建立 `src/composer/` 或另一份 Composer build/global。
3. SlideTemplate 只生成数据，不渲染 DOM。
4. Map `Layout` 与 `SlideTemplate` 必须明确区分。
5. App UI 不复制 Composer 算法。
6. Composer 不复制 Renderer / Presentation / Portable。
7. Portable 不根据 composer metadata 重新编译页面。
8. `slideElements` 始终是页面最终事实。
9. 最终发布物继续保持单 HTML、无外部 JS/CSS 运行依赖。

## 演进结论

- **V9.6**：统一编辑/导出的业务规则；
- **V9.7**：拆分应用源码；
- **V9.8**：统一 Runtime、Demo、Portable、构建；
- **V9.9**：在同一个 Runtime 内加入可解释、可保护人工编辑的 Smart Deck Composer。
