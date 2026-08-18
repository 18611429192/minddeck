# 发布到你的 GitHub

目标仓库已经预配置为：

`https://github.com/18611429192/minddeck`

## Windows 最简单方式

1. 解压 `MindDeck_V9_Repo_ReadyToPush.zip`。
2. 在解压后的目录中右键打开 PowerShell / Windows Terminal。
3. 执行：

```powershell
.\publish.ps1
```

4. 如果 Git 第一次要求 GitHub 登录，按浏览器提示授权即可。

脚本实际执行的是：

```bash
git branch -M main
git push -u origin main
```

本地仓库已经有首个 commit，不需要你再 `git add` 或 `git commit`。

## 推送后

打开：

`https://github.com/18611429192/minddeck`

应该可以看到 `index.html`、`src/`、`tests/`、`docs/` 等文件。

## GitHub Pages

仓库已经包含：

`.github/workflows/pages.yml`

第一次推送后，在 GitHub 仓库中进入：

**Settings → Pages → Build and deployment → Source → GitHub Actions**

保存后重新运行 Pages 工作流（或再次 push 一个 commit）。发布成功后的地址通常为：

`https://18611429192.github.io/minddeck/`

## 后续更新

以后在项目目录执行：

```bash
git add .
git commit -m "你的修改说明"
git push
```

即可更新 GitHub。
