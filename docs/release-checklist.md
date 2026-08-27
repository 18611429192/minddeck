# MindDeck V9.9 Stable 发布清单

## 自动门禁

- [ ] `npm run release:check` 全绿
- [ ] `npm run e2e` 全绿（CI 使用 Chromium）
- [ ] `verify-architecture.mjs` 报告只有一个 Composer / MapRenderer / PresentationView / Portable
- [ ] package / Runtime / standalone HTML 版本全部为 9.9.0 stable
- [ ] 根单 HTML 无外部 JS/CSS 运行依赖

## Composer / Smart Deck

- [ ] `examples/deck-spec-v1.json` 可通过 DeckSpec 入口生成项目
- [ ] Markdown / 大纲可通过“智能组稿”生成 5+ 页项目
- [ ] 24 个 SlideTemplate 全局唯一并通过 Capacity / Quality
- [ ] 24 templates × 12 themes 自动编译回归通过
- [ ] Matcher 不会选择容量超限模板
- [ ] Diversity Allocator 相同 seed 结果稳定
- [ ] 页面方案 A/B/C 是不同结构模板候选，不只是切 Role
- [ ] 手工修改后 `Provenance.isDirty()` 为 true
- [ ] dirty 页重新套版前必须确认
- [ ] 整套换主题默认跳过 dirty 页
- [ ] Composer 输出仍是普通 `node.slideElements`，删除 composer metadata 后页面照常工作

## Editor / Presentation / Portable

- [ ] Composer 项目可立即进入自由页面编辑器
- [ ] 页面/母版进入退出、保存、文字/图片/视频/形状、拖动/缩放、多选/对齐正常
- [ ] 思维导图折叠继续改变正式 Presentation 播放序列
- [ ] Presentation 使用正式 `PresentationView`
- [ ] 独立演示 HTML 使用 `MindDeckCore.Portable.mount()`
- [ ] 纯导图 HTML 重排/折叠正常
- [ ] 融合 HTML 两种模式切换正常
- [ ] JSON 与 `.minddeck` 导出/重新导入正常

## 数据安全与兼容

- [ ] Smart Deck / DeckSpec 替换当前项目前建立恢复备份
- [ ] 非法 JSON / 非法 DeckSpec 不覆盖当前项目
- [ ] 旧项目没有 `node.composer` 也可正常编辑、演示、导出
- [ ] 1920×1080 / 1366×768 / 1024×768
- [ ] 390×844 / 844×390 / 360×800
- [ ] 至少一个 50+ 节点真实项目
- [ ] 至少一个包含图片和视频的项目

## V9.9 不允许发布的情况

- 出现第二个 `src/composer/`、`MindDeckComposer` global 或第二 Composer Runtime；
- UI 复制 Matcher / Allocator / Compiler；
- Composer 内出现 DOM Renderer；
- Portable / Demo 出现第二套 Presentation、TOC、MapRenderer；
- Playwright 仍断言旧版本号；
- #5～#21 尚未完成或 Epic #4 尚未闭环。
