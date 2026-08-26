# Contributing to MindDeck

感谢你愿意帮助改进 MindDeck。

## 开发原则

1. 从 `main` 创建功能分支。
2. 业务规则优先放在 Shared Runtime；不要在 Demo、Portable 导出或编辑器中复制第二套布局、播放顺序、目录或折叠逻辑。
3. 修改后至少执行 `npm run release:check`。
4. 涉及真实浏览器交互时，应补充浏览器级回归测试。
5. 最终发布物必须继续保持：**单 HTML、离线可运行、编辑 / 演示 / 导出行为一致**。

## Pull Request 建议说明

- 用户行为发生了什么变化；
- 是否影响 Portable 导出；
- 是否影响移动端；
- 是否改变数据结构；
- 做了哪些回归检查。

不要为了“看起来模块化”而重复业务逻辑。MindDeck 的长期目标是只有一个业务实现。
