# MindDeck V9.5 RC 回归报告

## 版本
- App: V9.5 RC
- Portable Runtime: 9.5
- Release channel: rc
- Schema: 1

## 自动回归
执行：`npm run release:check`

通过项：
- Core tree/layout/presentation
- 项目健康诊断
- 自动保存与恢复
- 10 / 50 / 120 / 250 节点性能回归
- 主应用脚本语法
- Portable Runtime 功能契约
- 统一命令入口契约
- 视觉主题契约
- 恢复机制契约
- RC 版本与首次使用引导契约

## RC 功能冻结
V9.5 RC 之后不再增加编辑能力。进入 1.0 前优先收集真实使用中的阻断性问题：
- 数据丢失或不可恢复
- 导入/导出不可用
- 演示无法开始、翻页或收放目录
- 16:9 页面比例错误
- 手机/常见桌面分辨率不可操作
- 50+ 节点项目明显性能退化
- 图片/视频项目崩溃或保存失败

## 仍需人工验收
自动测试不能代替真实浏览器和真实汇报场景。1.0 前至少完成 `docs/release-checklist.md` 中的人工清单。
