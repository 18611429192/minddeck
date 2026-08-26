# Changelog

## V9.8.0-rc.1 — 架构收口

- Shared Runtime 从人工维护的 `shared-core.js` 拆成真正的 ES Modules：`model / platform / slide / view / portable`；`shared-core.js` 降级为构建生成物。
- 新增 `scripts/build-runtime.mjs`，从 ESM 源码确定性合成浏览器 Runtime；最终发布物继续保持单 HTML、无外部 JS/CSS 运行依赖。
- GitHub Pages Demo 不再维护独立的 slides / TOC / 折叠 / 翻页实现，改为进入正式应用 Showcase 模式并加载 `examples/demo.json`。
- Showcase 复用正式 `PresentationView`，同时禁用项目持久化，避免 Demo 覆盖用户本地项目。
- Portable HTML / CSS 外壳从导出 JS 抽离到 `src/portable/`，行为继续统一由 `MindDeckCore.Portable.mount()` 提供。
- `package.json` 成为版本单一来源；构建先生成同版本 Runtime，再生成最终 standalone HTML，禁止 App / Runtime 版本漂移。
- 架构门禁升级：检查真实 ESM import/export、model 层 DOM 边界、Demo/Portable 禁止第二套业务实现、生成 Runtime 与最终 HTML 完全一致。
- Shared Runtime 测试同时验证 ESM 源图和生成后的浏览器 Runtime。
- 新增手动 Playwright 浏览器回归，覆盖 Showcase、折叠后的播放序列、Portable 生成、母版和移动端固定 1600×900 舞台；不新增临时自动 Workflow。
- 原 `90-responsive.css` 的工作区、主题、自检、恢复、欢迎页、演示 chrome 等职责拆到 `91-workspace.css` / `92-components.css`。
- 新增 MIT License、CONTRIBUTING、SECURITY、Issue/PR 模板，并重写 V9.8 架构审计和文档入口。
- 历史 RC 与发布施工文档归档到 `docs/releases/archive/`，减少仓库根目录噪音。

## V9.5.0-rc.1 — Release Candidate

- 功能冻结，开始只修阻断性问题。
- 新增首次使用 3 步引导：结构 → 页面 → 演示。
- 桌面 `?` 和手机“更多 → 使用说明”可随时重新打开引导。
- `.minddeck` manifest 增加 `releaseChannel: rc`。
- 新增 RC 契约检查和正式发布清单。
- Portable Runtime 升级到 9.5。

## V9.4.0 — 大项目性能与恢复

- 浏览器自动保存改为 450ms 防抖，减少拖动和编辑时反复序列化大项目。
- 新增顶部保存状态：已保存 / 待保存 / 未保存。
- 新增一代恢复备份；导入新项目之前自动保存当前项目恢复点。
- 主存储损坏或不可读时可从恢复备份启动。
- 项目自检面板新增“恢复备份”。
- 大项目撤销栈按项目体积自动从 80 降到 20/6，减少图片视频项目的内存占用。
- 新增 10/50/120/250 节点性能回归。
- V9 使用新的 `minddeck-v9-data` 存储键，并兼容读取 V8/V6/V5 数据。

## V9.3.0 — 视觉系统

- 建立明亮、深色、商务、极简 4 套正式外观主题。
- 主题只影响 MindDeck 工作界面和导图，不改动 16:9 页面设计。
- 桌面新增外观入口，手机“更多”同步使用同一入口。
- 节点、工具栏、面板、手机底栏开始统一使用视觉 token。
- 纯思维导图与融合 HTML 继承项目主题，并可在 Portable 导图中切换。
- 项目数据新增 `uiTheme`，旧项目自动兼容为明亮主题。

## V9.2.0 — 交互收敛

- 新增统一 `APP_COMMANDS` / `runAppCommand()` 命令入口。
- 桌面工具栏、手机底栏、手机“更多”共用同一套重排、保存、打开、导出、演示、母版、自检逻辑。
- 手机“更多”删除重复的“编辑当前页面”入口，保留底栏和节点上下文入口。
- 新增 Interaction Contract CI 检查，防止同名入口再次分叉。
- Portable Runtime 升级到 9.2。

## V9.1.0 — 稳定性自检

- 应用内新增“项目自检”面板和健康评分。
- 正式导出前自动执行结构预检，严重错误会阻止导出。
- 检查节点/元素唯一性、页面几何、图层、媒体、演示顺序、布局、目录、项目序列化和 16:9 约束。
- 三种 Portable HTML 在自检中真实生成并进行脚本校验。
- 新增 `src/core/diagnostics.js`，把项目完整性规则变成可测试 Core。
- CI 新增 Portable Runtime 功能契约检查，防止重排、全开/全收、目录开关和折叠等导出能力回归。
- `npm test` 升级为完整 release check。

## V9.0 Stable

### 架构
- 三种 HTML 导出开始统一到 Portable Runtime 9.0。
- 项目数据加入 `schemaVersion`。
- `.minddeck` manifest 记录 Runtime / Schema 版本。
- 开始从单文件版抽离 `tree/layout/presentation/project` 四个共享核心模块。

### 思维导图
- 曲线连线。
- 左右展开、向右、向左、向下、自由放射 5 种布局。
- 重排只计算当前展开可见节点。
- 手机/桌面响应式工作区。

### 演示
- 固定 1600×900 虚拟舞台，只通过等比 contain 缩放。
- 演示过程中目录可随时显示/隐藏。
- 目录节点可实时展开/折叠，并重算播放序列。
- 手机目录抽屉和滑动翻页。

### 编辑器
- 桌面自由页面编辑。
- 手机专用底部工具、画布缩放/平移、多选、对齐、图层和属性操作。
