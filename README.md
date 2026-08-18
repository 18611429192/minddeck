# MindDeck

> **先看清整件事，再讲清每一页。**

MindDeck 是一个“思维导图 + 自由页面 + 非线性演示”的浏览器工具。

- 思维导图负责整个演示的结构。
- 每个节点内部是一张真正的 16:9 自由设计页面。
- 演示过程中可以根据现场讨论展开或折叠节点，并实时改变后续播放路径。
- 支持桌面、平板、手机。
- 支持纯思维导图 HTML、独立演示 HTML、融合 HTML 和 `.minddeck` 项目包。

## 立即运行

当前稳定版仍然是单文件应用：

```text
index.html
```

直接双击即可运行；也可以启动本地服务器：

```bash
npm run serve
```

然后访问 `http://localhost:8080`。

## 当前版本

**V9.5 Release Candidate**

V9 系列开始进入产品化阶段，不再优先堆新功能。当前主线：

1. 统一运行时
2. 自动回归与自检
3. 交互收敛
4. 视觉系统统一
5. 大项目稳定性与性能
6. Release Candidate

## 工程结构

```text
minddeck/
├─ index.html                 # 当前完整稳定版，可直接运行
├─ src/
│  ├─ core/                   # 正在抽离的共享核心逻辑
│  │  ├─ tree.js
│  │  ├─ layout.js
│  │  ├─ presentation.js
│  │  └─ project.js
│  └─ runtime/                # 后续统一导出 Runtime
├─ tests/                     # Core / 恢复 / 性能回归测试
├─ scripts/                   # Release Contract / 自检脚本
├─ docs/
├─ examples/
└─ .github/workflows/         # CI / Pages
```

## 测试

需要 Node.js 18+：

```bash
npm test
```

当前 `npm test` 会执行完整 Release Check：

- 树结构与可见节点遍历
- 折叠节点不参与重排
- 5 类布局与曲线连线
- 折叠后演示序列实时重算
- 项目结构 / 元素 ID / 图层 / 媒体诊断
- 自动保存与恢复备份
- 10 / 50 / 120 / 250 节点性能回归
- `index.html` 主脚本语法检查
- Portable HTML 功能契约
- 桌面 / 手机统一命令入口契约
- 4 套视觉主题契约
- V9.5 RC 首次引导与版本契约

## 产品定位

MindDeck 不是另一个 PowerPoint，也不是单纯的思维导图工具。

它希望解决的是：**先用结构看清完整问题，再把每一个节点讲成一张真正的演示页面。**

## GitHub 更新

仓库地址：`https://github.com/18611429192/minddeck`

把更新包覆盖到你现有的本地 clone 后：

```bash
git add .
git commit -m "release: MindDeck V9.5 RC"
git push
```
## V9.5 RC 稳定性自检

应用顶部的“自检”会检查当前项目是否适合正式导出和演示；CI 也会对共享 Core、恢复机制、性能和 Portable Runtime 功能契约进行回归。

V9.5 已进入功能冻结。正式 1.0 之前只修复阻断正式汇报的问题。详见 `docs/release-checklist.md`。
