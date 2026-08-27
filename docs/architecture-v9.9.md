# MindDeck V9.9 Architecture — Smart Deck Composer

## 最终架构

V9.9 在 V9.8 Unified Runtime 上增加“内容到页面数据”的编排能力，但没有增加第二套运行时：

```text
Outline / DeckSpec v1
        ↓
Core.Composer
  ├─ SlideContent normalize / role inference
  ├─ SlideTemplate Registry + Capacity
  ├─ Template Matcher
  ├─ Diversity Allocator
  ├─ Template Compiler
  ├─ Provenance / dirty protection
  └─ Quality Validator
        ↓
MindDeck Project / node.slideElements
        ↓
┌──────────────┬──────────────┬──────────────┐
│ Editor       │ Presentation │ Portable     │
└──────────────┴──────────────┴──────────────┘
        ↓              ↓              ↓
             同一个 MindDeckCore
```

**三层职责必须保持：**

- `DeckSpec / SlideContent / Core.Composer`：规划、匹配、分配、编译数据；
- `MindDeck Project`：唯一树结构和页面数据事实；
- `MindDeckCore`：唯一编辑、演示、Map/Slide Renderer 与 Portable Runtime。

Composer 不能渲染 DOM，Presentation/Portable 也不会读取 Composer metadata 来重新编译页面。

## 为什么没有采用旧 Issue 中的 `src/composer/ + MindDeckComposer global`

V9.9 第一版已经把 Composer 正确合入 Shared Runtime，并公开为 `Core.Composer`。最终实现保留这一方向，只把巨型 `composer.js` 的内部职责拆开：

```text
src/runtime/modules/
├─ composer.js                 # 唯一公开 Composer façade
└─ composer/
   ├─ base.js                  # token、角色、纯工具
   ├─ schema.js                # SlideContent / DeckSpec
   ├─ outline.js               # 大纲解析
   ├─ templates.js             # Registry / Capacity / ThemeRegistry
   ├─ matcher.js               # 单页候选评分
   ├─ allocator.js             # 全稿多样性分配
   ├─ compiler.js              # Template → slideElements
   ├─ provenance.js            # generatedHash / dirty
   ├─ quality.js               # Composer Quality
   └─ deck.js                  # Project bridge / apply / retheme
```

`src/runtime/modules/composer.js` 只组装公开 API。不存在第二个 `src/composer/`，也不存在 `global.MindDeckComposer`。

## SlideContent v1

模板不拥有业务文案。页面事实先规范化为：

```js
{
  title,
  subtitle,
  summary,
  takeaway,
  items: [{ id, label, value, detail, unit, image }],
  media: [{ id, type, src, alt }]
}
```

同一份 `SlideContent` 可以匹配多个结构模板。显式 role 优先；未指定时 `inferSlideRole()` 使用确定性规则兜底，不调用 AI。

## DeckSpec v1

DeckSpec 只描述“要讲什么”，不是第二个 Project：

```js
{
  schemaVersion: 1,
  title,
  goal,
  audience,
  theme,
  randomSeed,
  slides: [{ id, role, content }]
}
```

`compileDeck()` 最终创建现有 `Project.createNode()` 数据、调用现有 `Project.normalize()` 与 `Layout.apply()`，输出的仍是普通 MindDeck Project。

示例见 `examples/deck-spec-v1.json`。

## SlideTemplate Registry

V9.9 不再让一个 Role 只对应一个硬编码 layout。Registry 当前包含 **24 个独立结构模板**，覆盖 12 个页面角色，并允许一个模板支持多个相近角色。

模板 manifest 是可序列化的纯数据契约：

```text
id / label / family / roles / priority
capacity
slots
structure key
```

`family` 专门用于全稿多样性控制。

### Capacity

Capacity 在匹配前执行硬过滤，检查：

- 标题 / 摘要长度；
- items 数量；
- numeric items 数量；
- media 数量；
- required slot 是否有来源内容。

装不下的模板不会进入候选集，因此不靠“先渲染再看是否爆版”。

## Template Matcher

`matchTemplates()` 先执行 role、Capacity 和 required-slot 硬条件，然后用可解释规则评分：

- role 支持；
- 容量余量；
- 数字信息亲和；
- 媒体亲和；
- template priority；
- 当前模板轻量去重。

返回值包含 `score / reasons / warnings`，UI 只展示结果，不复制评分算法。

## Diversity Allocator

单页最高分不等于整稿最好。`allocateTemplates()` 在 Matcher 候选矩阵之上做确定性的全稿 greedy 分配：

- 相邻 template/family 重复惩罚；
- 全稿 template/family 使用次数惩罚；
- 候选不足时允许复用；
- seed 只用于稳定打破同分；
- Capacity 和 role 硬条件永远优先于多样性。

因此连续同类页面会尽量轮换结构，而不是整套演示反复出现同一个骨架。

## Theme 与结构解耦

`ThemeRegistry` 复用 V9.9 已有的 12 套 Deck Theme token。结构模板不复制主题版本；同一个模板可使用任意 deck theme 编译。

两个主题概念保持独立：

- `uiTheme`：编辑器 / 思维导图界面；
- `deckTheme`：Composer 生成页面的初始视觉 token。

## Template Compiler

`compileSlide()` 的唯一职责：

```text
SlideContent + SlideTemplate + Theme + density
                    ↓
text / image / video / shape
                    ↓
node.slideElements[]
```

编译器不能调用 `Element.create()`、`Slide.render()`、DOM API 或 Presentation。最终元素继续由正式 Runtime 渲染。

## Provenance 与人工编辑保护

Composer 页保存：

```js
node.composer = {
  schemaVersion: 1,
  role,
  content,
  selectedTemplateId,
  alternativeTemplateIds,
  generatedElementIds,
  generatedHash,
  generatedAtVersion: '9.9.0',
  generatedBy: 'Core.Composer'
}
```

`slideElements` 始终是页面最终事实。`Provenance.isDirty(node)` 只在重新套版/重新生成前比较当前元素 hash 与 `generatedHash`，不侵入每个拖拽和输入路径。

- 新生成页：`dirty=false`；
- 手工移动、改字、新增或删除元素：`dirty=true`；
- 应用新模板后刷新 generatedHash；
- 整套换主题默认跳过 dirty 页面并记录 `COMPOSER_DIRTY` warning。

删除 `node.composer` 不影响页面编辑、演示和 Portable。

## 页面方案 A / B / C

自由页面编辑器中的“页面方案”调用 `Core.Composer.recommendNodeTemplates()`，展示前三个真实结构候选：template、family、匹配原因。

选择方案后调用 `Core.Composer.applyTemplate()`。这不是切 Role 的伪推荐，也没有候选预览 Renderer；页面仍交给正式 Editor 渲染。

## DeckSpec Host

`src/app/modules/26-deck-spec-import.js` 是 application closure 内的薄 UI Host，支持：

- 粘贴 DeckSpec v1 JSON；
- 打开 `.json` 文件；
- `validateDeckSpec()` 错误反馈；
- `compileDeck()` 生成正式 Project；
- 生成前建立恢复备份。

它不实现 normalize、Capacity、Matcher、Allocator 或 Compiler。

## Composer Quality Validator

`Core.Composer.Quality` 在 Node 环境可执行，不依赖 DOM。检查范围包括：

- Spec / assignment 合法性；
- Capacity 与 template/role；
- 元素有限坐标、正尺寸、1600×900 边界；
- 页内元素 id 唯一；
- image/video src；
- text / fontSize；
- 全稿 template/family 集中度；
- presentationOrder 引用。

它只负责 Composer 生成质量，不复制 Runtime Diagnostics。

## Layout 与 SlideTemplate 的命名边界

V9.9 后必须区分：

- **Map Layout / Runtime `Layout`**：思维导图节点排列；
- **SlideTemplate**：1600×900 页面结构模板。

文档和代码不再用含糊的 `layout` 同时指这两个概念。

## 架构门禁

`scripts/verify-architecture.mjs` 自动阻止：

- `src/composer/` 或 `MindDeckComposer` 第二 Runtime 回归；
- Composer 子模块访问 `window/document/localStorage` 或 DOM renderer API；
- App UI 复制 normalize / matcher / allocator / compiler / role inference；
- 第二个 Composer、MapRenderer、PresentationView 或 Portable；
- Portable exporter/shell 重建 Layout、TOC 或 Presentation；
- Pages Demo 重建第二演示实现；
- `src/core/*` adapter 重新包含业务实现。

## 测试与发布链

Node regression 覆盖 24 templates × 12 themes、Capacity、Matcher、Allocator、DeckSpec、Provenance、Quality 和 Project bridge。

Playwright 覆盖：

```text
Smart Deck
 → 编辑
 → A/B/C 换结构
 → 人工修改产生 dirty
 → 整套换主题保护 dirty
 → Presentation
 → Portable
```

CI 在 `release:check` 后执行 Chromium E2E。

## License / 来源边界

V9.9 的内容→结构→可编辑交付流程受同类演示生成产品机制启发，但 Composer、24 个结构模板、主题 token、Matcher、Allocator、Compiler 均为 MindDeck 独立实现。仓库不复制 DashiPPT 的 AGPL 源码、模板坐标、主题资产或 PPTX 技术栈。
