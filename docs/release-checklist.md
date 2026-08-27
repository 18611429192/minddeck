# MindDeck V9.9 Stable 发布清单

本清单只在有自动测试、架构合同或真实浏览器回归证据后勾选。V9.9 最终收口 PR 的完整门禁基准为 GitHub Actions Run `33037045059`（PR #25）：`npm run release:check` 全绿，Playwright `17 passed / 3 intentional skipped`。移动端 skip 仅针对明确不存在于移动工具栏的桌面 DeckSpec/自由编辑入口；移动/桌面运行时与发布分辨率矩阵均有自动覆盖。

## 自动门禁

- [x] `npm run release:check` 全绿 — Run `33037045059`：`MindDeck release check: ALL OK`
- [x] `npm run e2e` 全绿（CI 使用 Chromium）— Run `33037045059`：17 passed / 3 intentional skipped
- [x] `verify-architecture.mjs` 报告只有一个 Composer / MapRenderer / PresentationView / Portable — `Architecture audit: OK (17 ESM source modules, one Composer/Renderer/PresentationView/Portable, 14 integration gates)`
- [x] package / Runtime / standalone HTML 版本全部为 9.9.0 stable — release contracts + source/build parity 自动验证
- [x] 根单 HTML 无外部 JS/CSS 运行依赖 — `Standalone single-HTML contract: OK`

## Composer / Smart Deck

- [x] `examples/deck-spec-v1.json` 可通过 DeckSpec 入口生成项目 — Playwright 真实文件入口生成 10 页 native Project
- [x] Markdown / 大纲可通过“智能组稿”生成 5+ 页项目 — Node + Playwright Smart Deck 流程自动覆盖
- [x] 24 个 SlideTemplate 全局唯一并通过 Capacity / Quality — `tests/composer.test.mjs`
- [x] 24 templates × 12 themes 自动编译回归通过 — 每组输出均做 deterministic + geometry/basic quality 校验
- [x] Matcher 不会选择容量超限模板 — 5-item/20-item 超载与 required media 无候选回归
- [x] Diversity Allocator 相同 seed 结果稳定 — 30 页模拟 deck deterministic 回归，且 family diversity 有断言
- [x] 页面方案 A/B/C 是不同结构模板候选，不只是切 Role — 每个 Role 编译候选并比较 deterministic `structuralSignature`
- [x] 手工修改后 `Provenance.isDirty()` 为 true — Node + Playwright 双重覆盖
- [x] dirty 页重新套版前必须确认 — Playwright 人工移动元素后实际走确认再 apply
- [x] 整套换主题默认跳过 dirty 页 — Node + Playwright 验证 elements 不被覆盖且生成 `COMPOSER_DIRTY` warning
- [x] Composer 输出仍是普通 `node.slideElements`，删除 composer metadata 后页面照常工作 — 兼容/Project 回归验证 Renderer/Presentation/Portable 只消费现有 Project 数据

## Editor / Presentation / Portable

- [x] Composer 项目可立即进入自由页面编辑器 — Smart Deck → Editor Playwright 全链路
- [x] 页面/母版进入退出、保存、文字/图片/视频/形状、拖动/缩放、多选/对齐正常 — 现有 interaction contracts（13 checks）+ editor E2E 保持全绿
- [x] 思维导图折叠继续改变正式 Presentation 播放序列 — Playwright showcase fold sequence 回归
- [x] Presentation 使用正式 `PresentationView` — architecture audit + browser presentation test
- [x] 独立演示 HTML 使用 `MindDeckCore.Portable.mount()` — portable contract + 浏览器生成/脚本语法验证
- [x] 纯导图 HTML 重排/折叠正常 — Playwright 直接执行导出的 mindmap HTML，验证 collapse / expand / reflow
- [x] 融合 HTML 两种模式切换正常 — Playwright 在独立 document realm 中验证 map → presentation → map
- [x] JSON 与 `.minddeck` 导出/重新导入正常 — `project-roundtrip.spec.mjs`：真实 JSON 下载 + 实际 exporter ZIP Blob → importer → order/children/Composer Quality 保持一致

## 数据安全与兼容

- [x] Smart Deck / DeckSpec 替换当前项目前建立恢复备份 — recovery contracts + UI host 路径回归
- [x] 非法 JSON / 非法 DeckSpec 不覆盖当前项目 — schema validation/recovery host contracts 自动检查
- [x] 旧项目没有 `node.composer` 也可正常编辑、演示、导出 — legacy Project / metadata-independent runtime 回归
- [x] 1920×1080 / 1366×768 / 1024×768 — Playwright release viewport matrix
- [x] 390×844 / 844×390 / 360×800 — Playwright release viewport matrix
- [x] 至少一个 50+ 节点真实项目 — 55 个一级章节（56+ nodes）Smart Deck 自动编译与 Quality 回归
- [x] 至少一个包含图片和视频的项目 — Composer media Project 自动编译/Quality 回归，现有 Editor/Portable media contracts 保持全绿

## 最终收口期间额外发现并修复的发布阻断问题

- Portable shell 原先使用字符串 `.replace('__PORTABLE_BOOTSTRAP__', bootstrap)` 注入 Shared Runtime；Runtime 内的 `$'` 字符序列会触发 JavaScript replacement string 的特殊展开，造成导出演示 HTML 的 bootstrap 被破坏并报 `Invalid or unexpected token`。
- 已改为函数 replacer，并在 `scripts/verify-portable-contracts.mjs` 增加 replacement-safe 静态门禁；`project-roundtrip.spec.mjs` 同时对真实 Portable script 做语法验证并完成 `.minddeck` 往返。

## V9.9 不允许发布的情况

以下条件继续由 architecture/release gates 阻止：

- 出现第二个 `src/composer/`、`MindDeckComposer` global 或第二 Composer Runtime；
- UI 复制 Matcher / Allocator / Compiler；
- Composer 内出现 DOM Renderer；
- Portable / Demo 出现第二套 Presentation、TOC、MapRenderer；
- Playwright 断言旧版本号；
- #5～#21 任一关键验收项失去自动/合同证据。

## 发布结论

PR 分支全部功能验收已自动闭环。只有在本清单提交后的最终 PR CI、合并后的 `main` CI 和 GitHub Pages 部署也全部成功后，Epic #4 才写入最终 `MindDeck V9.9 = 100% Complete` 验收评论。
