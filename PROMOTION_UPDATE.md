# MindDeck 推广更新说明

这次更新只增加推广/发布相关内容，不修改根目录 `index.html` 的产品代码。

## 文件

- `README.md`：加入在线体验、在线 Demo 和动态 GIF，重新调整首页阅读顺序。
- `site/index.html`：GitHub Pages 产品首页。
- `site/demo.html`：无需导入即可体验的交互式 Showcase。
- `docs/assets/minddeck-demo.gif`：README 动态演示 GIF。
- `docs/promotion/v2ex-launch.md`：V2EX「分享创造」首发帖，可直接复制。
- `.github/workflows/pages.yml`：新的 Pages 构建方式。

## Pages 的工作方式

仓库根目录的 `index.html` 继续是唯一完整编辑器源码。

GitHub Actions 部署时自动：

```text
site/index.html   -> 网站首页
site/demo.html    -> 在线 Demo
index.html        -> app.html（在线编辑器）
```

所以后续不用同时维护 `index.html` 和 `app.html` 两份应用。

## 提交

把更新包覆盖到现有仓库后：

```bash
git add README.md site docs .github/workflows/pages.yml
git commit -m "docs: add landing page, interactive demo and launch materials"
git push
```

如果 GitHub Pages 之前没有启用：

1. GitHub 仓库 → Settings
2. Pages
3. Build and deployment
4. Source 选择 `GitHub Actions`

部署完成后的地址：

- 首页：`https://18611429192.github.io/minddeck/`
- Demo：`https://18611429192.github.io/minddeck/demo.html`
- 编辑器：`https://18611429192.github.io/minddeck/app.html`

## 首发顺序建议

先确认上述三个地址正常，再发 V2EX。首帖里最重要的链接是 `demo.html`，而不是让用户先 clone 仓库。
