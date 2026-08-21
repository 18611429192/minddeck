# MindDeck

**MindDeck 是一个把思维导图和演示页面放在一起的浏览器工具。**

> 当前版本：**V9.6.6 RC**  
> 先看清整件事，再讲清每一页。

普通 PPT 很适合一页一页讲，但很多内容本身不是一条直线，而是一棵树。

产品方案、技术架构、培训课程、项目汇报都经常这样：你既需要看见完整结构，又希望某个节点能像 PPT 一样认真排版；真正演示时，还会根据现场问题决定某个分支要不要继续展开。

MindDeck 就是为这种情况做的。

**[在线体验](https://18611429192.github.io/minddeck/app.html) · [先看 Demo](https://18611429192.github.io/minddeck/demo.html) · [项目首页](https://18611429192.github.io/minddeck/)**

![MindDeck 动态演示](docs/assets/minddeck-demo.gif)

上面的 Demo 里，“安全”下面还有权限、数据、审计三个细节页。演示时把“安全”收起来，这三个页面会直接离开后续播放序列；重新展开，又会回来。

这也是 MindDeck 最想解决的问题：**结构不丢，现场又不必被固定页序绑住。**

## 它是怎么工作的

MindDeck 把一份演示拆成三层：

- **思维导图**负责整个内容的结构。
- **每个节点**都是一张真正的 16:9 页面。
- **演示模式**根据当前展开 / 折叠状态决定实际播放顺序。

所以演示不一定永远是：

```text
1 → 2 → 3 → 4 → 5
```

也可以是：

```text
产品方案
├─ 为什么做
├─ 用户问题
│  ├─ 效率
│  └─ 安全
│     ├─ 权限
│     ├─ 数据
│     └─ 审计
├─ 方案
├─ 实施
└─ 结果
```

如果现场没人追问安全细节，就把“安全”收起来；如果有人临时问到数据保护，再把它展开继续讲。

不需要另一份 PPT，也不需要提前准备一堆隐藏备用页。

## 先试一下

最省事的方式是直接打开：

- **项目首页**：<https://18611429192.github.io/minddeck/>
- **在线 Demo**：<https://18611429192.github.io/minddeck/demo.html>
- **在线编辑器**：<https://18611429192.github.io/minddeck/app.html>

不需要注册。

仓库里的 `examples/demo.json` 是一份完整的产品方案 Showcase，可以直接导入 MindDeck 继续编辑。当前 Demo 按 **V9.6.6 RC** 验证，包含母版、章节配色、不同页面布局、轻量动画和三级分支。

建议体验时专门试一下“安全”分支：进入演示后把它收起，观察权限 / 数据 / 审计从后续序列里消失，再重新展开。

## 现在能做什么

### 思维导图

支持左右展开、向左、向右、向下和自由放射布局，也支持曲线连接、节点拖动、展开 / 折叠、按当前可见节点重排和节点原位编辑。

折叠节点不会继续占重排空间。

### 页面编辑

每个节点都有一张独立的 `1600 × 900` 页面。

目前可以添加文字、图片、视频、形状和母版固定元素，也支持轻量动画、多选、对齐和图层调整。

母版和普通页面使用同一套页面编辑体验；母版元素会出现在所有页面上。

### 演示

当前展开的节点才会进入播放序列。

演示过程中可以展开 / 折叠目录节点、隐藏 / 打开目录、跳转任意节点。键盘、鼠标滚轮和手机滑动都可以翻页。

页面始终保持真正的 **16:9**，不同分辨率只做等比缩放。

### 导出

目前支持：

- JSON 项目
- `.minddeck` 项目包
- 独立思维导图 HTML
- 独立演示 HTML
- 思维导图 + 演示融合 HTML

导出的 HTML 会保留对应运行能力，不只是静态截图。

## V9.6：统一 Runtime 已完成

V9.6 做的重点不是继续堆功能，而是解决一个长期问题：

> 编辑器修好了，但导出还是旧行为。

现在 Tree、Project、Layout、Presentation、TOC、Map Renderer、Slide / Element Renderer、Animation、Viewport、Input、Fullscreen、Diagnostics、Recovery 等业务规则都已经收口到共享 Runtime。V9.6.6 又把演示视图层收进 `PresentationView`：编辑器内演示和导出演示共用同一套页面刷新、TOC、舞台缩放、键盘、滚轮和触摸流程。

```text
src/runtime/
├── shared-core.js
└── shared-styles.css
```

编辑器、独立导图 HTML、独立演示 HTML、融合 HTML 都从同一份业务源码工作。导出的 HTML 仍然可以是单文件，但不再人工维护第二套算法。

仓库带有架构审计：

```bash
npm run audit:architecture
```

它会检查 Portable Runtime 是否重新出现第二套布局、播放序列、导图渲染、TOC 等业务实现。

完整发布检查：

```bash
npm run release:check
```

当前基线要求：

```text
Architecture audit: OK
MindDeck release check: ALL OK
```

详细结果见 [`ARCHITECTURE_AUDIT.md`](ARCHITECTURE_AUDIT.md)。

## 本地运行

完整编辑器继续保留为单文件：

```text
index.html
```

可以直接用浏览器打开，也可以在项目目录启动：

```bash
npm run serve
```

然后访问 `http://localhost:8080`。

需要 Node.js 18+ 执行测试和构建脚本。

## GitHub Pages

Pages 部署由 `.github/workflows/pages.yml` 完成：

```text
/           产品首页
/demo.html  可直接操作的 Showcase
/app.html   当前 main 的完整编辑器
```

`app.html` 每次部署都从仓库根目录 `index.html` 生成。

从 V9.6.5 开始，Pages 首页和 Demo 的显示版本也会从 `package.json` 自动注入，不再手工维护三套版本号。

## 项目阶段

目前仍处于 **Release Candidate** 阶段，当前基线是 **V9.6.6 RC**。

V9.6 已完成业务框架统一。接下来优先完善演示能力、正式汇报可靠性、手机 / 桌面体验和真实项目中的使用问题，而不是重新复制 Runtime。

## 适合什么场景

目前比较适合：

- 技术方案 / 系统架构
- 产品方案
- 培训课程
- 项目汇报
- 答辩 / 评审
- 需要根据现场问题随时展开细节的演示

它不是为了替代 PowerPoint 的所有能力。

更想解决的是：

**当你要讲的东西本身有结构时，既保留这棵结构，又把每一个节点讲清楚。**

## 反馈

如果你真的拿它做了一次汇报，最有价值的反馈是：

- 哪一步让你觉得麻烦？
- 哪个操作不符合直觉？
- 哪个地方让你不敢在正式会议里用？
- 导出以后有没有和编辑时不一致？

这类问题会优先处理。
