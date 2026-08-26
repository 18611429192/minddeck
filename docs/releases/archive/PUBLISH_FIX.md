# MindDeck 发布失败修复

这次有两个独立问题。

## 1. release-check 失败

报错：

```text
Error: RC contract missing: MindDeck V9.5 RC
```

原因是应用已经是 **V9.5.1 RC**，但 `scripts/verify-rc-contracts.mjs`
仍然把 `MindDeck V9.5 RC` 写死在测试里。

本修复做了两件事：

- `package.json` 更新为 `9.5.1-rc.1`
- RC 检查不再写死具体补丁版本，而是从 `package.json` 读取版本，
  自动要求 `index.html` 与之匹配。

以后升级到 `9.5.2-rc.1` 时，只需要同步改 `package.json` 和应用显示版本，
不需要再次修改测试脚本。

## 2. GitHub Pages 部署失败

报错：

```text
Get Pages site failed
Not Found
```

这不是网页代码错误，而是仓库还没有启用 GitHub Pages。

只需要做一次：

1. 打开 `18611429192/minddeck`
2. `Settings`
3. 左侧 `Pages`
4. 找到 **Build and deployment**
5. `Source` 选择 **GitHub Actions**
6. 保存

之后回到 `Actions`：

- 可以点失败任务里的 **Re-run all jobs**
- 或者重新 push 一个 commit

新的 workflow 同时升级为：

- `actions/configure-pages@v6`
- `actions/deploy-pages@v5`
- 增加 `actions: read`

## 覆盖后本地检查

```bash
npm run release:check
```

通过后提交：

```bash
git add package.json scripts/verify-rc-contracts.mjs .github/workflows/pages.yml
git commit -m "fix: repair RC checks and Pages workflow"
git push
```

Pages 首次启用成功后，预计地址：

```text
https://18611429192.github.io/minddeck/
https://18611429192.github.io/minddeck/demo.html
https://18611429192.github.io/minddeck/app.html
```
