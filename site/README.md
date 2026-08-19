# GitHub Pages 结构

- `/`：产品首页
- `/demo.html`：无需导入即可操作的 Showcase
- `/app.html`：构建时从仓库根目录 `index.html` 复制的完整编辑器

`pages.yml` 会在部署时组装 `_site`，因此不需要把完整编辑器复制维护两份。
