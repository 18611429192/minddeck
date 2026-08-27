# MindDeck 固定回归矩阵

每个候选版本至少验证：

| 类别 | 必须通过 |
|---|---|
| Core | 节点遍历、可见树、折叠、5 种 Map Layout、曲线、动态演示序列 |
| Project | schema normalize、ID 唯一性、页面几何、图层、媒体、目录配置 |
| Composer Schema | DeckSpec v1 / SlideContent normalize、validate、role inference、确定性 |
| SlideTemplate | 24 个结构模板 id 唯一；Capacity / required slot；同一内容存在合理 A/B/C 候选 |
| Matcher / Allocator | 硬容量过滤、稳定评分、seed 确定性、相邻 family/template 去重、候选不足可复用 |
| Compiler / Quality | 只输出 text/image/video/shape；24×12 编译；geometry、duplicate id、missing media 检查 |
| Provenance | generatedHash；人工改字/位置/尺寸/增删元素后 dirty；重套版/换主题保护人工修改 |
| 编辑 | 页面/母版进入退出、保存、文字/图片/视频/形状、拖动/缩放、多选/对齐、A/B/C 页面方案 |
| DeckSpec Host | JSON 粘贴/文件导入、validate 错误反馈、compileDeck 后进入正式 Project |
| 导图 | 单节点收放、全开/全收、按当前可见节点重排、布局切换 |
| 演示 | 目录显隐、目录节点收放、动态播放序列、16:9 contain、键盘/触摸翻页 |
| 导出 | JSON、纯导图 HTML、演示 HTML、融合 HTML、.minddeck |
| Portable | 重排、布局、全开/全收、节点折叠、目录开关；不得包含第二 Composer/Renderer |
| E2E | Smart Deck → 编辑 → A/B/C → dirty → Presentation → Portable |
| 分辨率 | 1920×1080、1366×768、1024×768、834×1194、390×844、844×390、360×800 |
| CI | `npm run release:check` + `npm run e2e` 全绿 |

V9.9 专项细节见 `docs/regression-v9.9.md`。
