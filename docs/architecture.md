# MindDeck 当前架构

## 核心原则

**同一种业务规则只有一个实现源。** 不同运行形态只能保留 Host / Shell 差异。

V9.9 当前数据链：

```text
Outline / DeckSpec / SlideContent
              ↓
         Core.Composer
   normalize / template registry
   capacity / matcher / allocator
   compiler / provenance / quality
              ↓
       MindDeck Project
       node.slideElements
              ↓
          MindDeckCore
      ┌───────┼────────┐
      ↓       ↓        ↓
    Editor Presentation Portable
```

## 唯一业务源

- `src/runtime/modules/model.js`：Tree / Project / Map Layout / Presentation order；
- `src/runtime/modules/slide.js`：Animation / Element / Slide；
- `src/runtime/modules/view.js`：MapRenderer / TOC / PresentationView；
- `src/runtime/modules/portable.js`：Portable 行为；
- `src/runtime/modules/composer/`：V9.9 Composer 内部职责；
- `src/runtime/modules/composer.js`：唯一公开 Composer façade；
- `src/runtime/index.js`：组装唯一 `MindDeckCore`。

浏览器生成物 `src/runtime/shared-core.js` 和根 `index.html` 都由构建脚本生成，不手工维护。

## Composer 边界

Composer 是 **Project 数据生产者**，不是第二 Runtime：

```text
SlideContent
  ↓ Capacity + Matcher
Candidate[]
  ↓ Diversity Allocator
SlideTemplate assignment
  ↓ Template Compiler
slideElements[]
```

它不得实现 DOM Renderer、Presentation、TOC、Portable 或第二 Project schema。应用层只能调用 `Core.Composer` 公开 API。

## 命名边界

- `Layout` / Map Layout：思维导图节点排列；
- `SlideTemplate`：16:9 页面结构模板。

两者职责完全不同，后续代码和文档不得再用一个含糊的“layout”同时指代两者。

## 运行形态

- Editor App：正式编辑器 Host；
- Pages Showcase：进入正式 App/PresentationView，不维护 Demo 播放器；
- Portable HTML：外壳可独立，但行为来自 `MindDeckCore.Portable.mount()`；
- Fusion HTML：仍消费同一 Project 和 Shared Runtime。

## 自动门禁

`npm run release:check` 会构建并运行 Node/架构回归；CI 继续执行 Playwright 浏览器回归。

`verify-architecture.mjs` 重点阻止：

- 第二 Composer / `MindDeckComposer` global；
- 第二 Renderer / PresentationView / Portable；
- App UI 复制 Composer matcher/compiler/allocator；
- Composer 使用 DOM / localStorage；
- Pages Demo / Portable 复制运行时业务规则。

版本细节见：

- `docs/architecture-v9.8.md`
- `docs/architecture-v9.9.md`
- `ARCHITECTURE_AUDIT.md`
