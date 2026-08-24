# GitHub Pages 结构

当前 Pages 对应 **MindDeck V9.7.0 RC**。

- `/`：产品首页
- `/demo.html`：无需导入即可操作的 Showcase
- `/app.html`：构建时从仓库根目录 `index.html` 复制的完整编辑器
- `/version.json`：本次 Pages 部署的版本和 commit 信息

`pages.yml` 会在部署时组装 `_site`。

版本以根目录 `package.json` 为唯一来源。`site/index.html` 和 `site/demo.html` 使用 `__MINDDECK_VERSION__` 占位符，部署时自动替换，因此 Pages 不再单独维护版本号。
