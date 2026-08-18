# MindDeck 架构方向

## 当前状态

根目录 `index.html` 是 V9.0 Stable 的完整单文件版本。它是当前发布基线，不能为了工程化重构而牺牲可用性。

## 目标架构

```text
                   MindDeck Core
                       │
          ┌────────────┼────────────┐
          │            │            │
       Tree/Layout   Slide Model   Presentation
          │            │            │
          └────────────┼────────────┘
                       │
                 Shared Runtime
                       │
       ┌───────────────┼────────────────┐
       │               │                │
    Editor App      Standalone       Fusion HTML
                    HTML Runtime
```

## 为什么要拆

过去最主要的稳定性问题不是某一个按钮，而是同一逻辑存在多个复制版本：

- 主编辑器有一套
- 纯导图 HTML 一套
- 独立演示 HTML 一套
- 融合 HTML 一套

因此一次修改很容易只修到其中一部分。

## V9.0 已抽离

`src/core/tree.js`
- 完整树遍历
- 可见树遍历
- 节点/父节点查找
- 全开/全收

`src/core/layout.js`
- 可见节点权重
- 5 种布局
- 曲线连线

`src/core/presentation.js`
- 基于当前展开状态的播放顺序
- 折叠后当前位置回退到最近可见祖先

`src/core/project.js`
- schemaVersion
- 项目数据规范化

## 下一步 V9.1

把根 `index.html` 内相同算法替换为构建时注入的共享 Core，并让三类导出 Runtime 直接复用同一源码。
