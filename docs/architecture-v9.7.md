# MindDeck V9.7 工程架构

## 目标

V9.7 解决的是工程结构，而不是重新实现功能：

1. 业务规则继续只有 `src/runtime/shared-core.js` 一份。
2. 编辑器 Host 从巨型 `index.html` 抽离为可维护模块。
3. 发布产物继续是一个可离线运行的 HTML。

## Source → Build → Artifact

```text
src/app/shell.html
+ src/app/styles/*
+ src/runtime/shared-styles.css
+ src/runtime/shared-core.js
+ src/app/modules/*
          │
          ▼
scripts/build-single-html.mjs
          │
          ▼
index.html   ← 唯一发布应用文件
```

JS 模块当前采用 ordered fragments：它们在源码仓库中分文件维护，构建时按 manifest 顺序连接回同一个 IIFE，因此不会因为工程拆分改变既有变量作用域和交互行为。后续如果继续迁移到真正的 ES module，也必须由构建器打包回单 HTML。

## 强制门禁

- `verify-modular-build.mjs`：生成的 CSS / Runtime / App Bundle 必须和模块源码逐字一致。
- `verify-single-html.mjs`：发布 HTML 不允许依赖外部 JS/CSS。
- `verify-architecture.mjs`：业务层不允许重新出现第二套 Tree / Layout / Presentation / Renderer / Portable 实现。

## 发布

`npm run build` 生成根目录 `index.html`。GitHub Pages 部署前也会先运行该命令，再把生成的单文件复制为 `app.html`。
