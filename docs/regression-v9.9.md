# MindDeck V9.9 Regression — Smart Deck Composer

## 自动回归

### Node / release:check

必须覆盖：

- DeckSpec v1 normalize/validate 幂等与错误码；
- SlideContent normalize、role inference、content facts；
- 24 个 SlideTemplate id 唯一；
- Capacity 边界与 required slot；
- Matcher 候选稳定、可解释、无候选错误；
- 24 个结构模板 × 12 套主题均可确定性编译；
- 编译结果只包含 `text/image/video/shape`；
- Quality geometry / duplicate id / missing media 检查；
- Diversity Allocator 相同 seed 稳定，30 页场景可轮换 family；
- DeckSpec → Project bridge 输出合法 `presentationOrder / master / slideElements`；
- `generatedHash` 与 `Provenance.isDirty()`；
- dirty 页面不被无提示重新套版或整套换主题覆盖；
- `verify-architecture.mjs` 保证只有一份 Composer / Renderer / PresentationView / Portable。

执行：

```bash
npm run release:check
```

### Browser / Playwright

必须覆盖真实浏览器链：

```text
打开正式应用
 → Smart Deck 生成 5+ 页
 → 进入真实自由页面编辑器
 → 获取 A/B/C SlideTemplate 推荐
 → 应用不同结构模板
 → 人工移动元素
 → Provenance 变 dirty
 → 再打开页面方案显示 dirty 警告
 → 整套换主题跳过 dirty 页
 → 进入正式 PresentationView
 → 生成 Portable HTML
```

同时保留 V9.8 已有 Showcase、折叠播放序列、母版固定 1600×900 和移动端回归。

执行：

```bash
npx playwright install chromium
npm run e2e
```

## 手工验收

- 从“智能组稿”粘贴 Markdown / 缩进大纲，生成后每页仍可编辑；
- 从 “DeckSpec” 入口粘贴或打开 `examples/deck-spec-v1.json`；
- 非法 JSON 显示 `JSON_PARSE_ERROR`；
- 非法 DeckSpec 显示 schema/path/code，而不覆盖当前项目；
- 页面方案 A/B/C 显示不同 template id / family 与匹配理由；
- 手工精排后换版式必须确认；
- 整套换主题默认不覆盖 dirty 页面；
- 思维导图展开/折叠和 Presentation 顺序仍一致；
- 独立演示 HTML 与融合 HTML 都只使用正式 Portable Runtime；
- 删除 `node.composer` 后页面仍可编辑和演示。

## 架构回归禁止项

以下任一出现即视为 V9.9 回归失败：

- 新建 `src/composer/` 或 `global.MindDeckComposer`；
- UI 中复制 `matchTemplates / allocateTemplates / compileSlide / inferSlideRole`；
- Composer 使用 DOM API；
- Portable 根据 composer metadata 重新编译页面；
- 新建第二套 Slide Renderer、Presentation 或 TOC；
- 用“只换颜色/只切 Role”冒充新的 SlideTemplate 方案。
