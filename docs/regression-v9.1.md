# MindDeck V9.1 回归说明

V9.1 的目标不是增加展示功能，而是让“发布前是否可靠”变成可检查的状态。

## 应用内自检

检查：
- 节点 ID 唯一性
- 页面/母版元素 ID 唯一性
- 页面元素坐标和尺寸
- 页面与母版 z-index 区间
- 图片/视频空资源
- 演示顺序失效引用
- 当前导图布局
- 演示目录配置
- JSON 序列化
- 浏览器本地存储体积风险
- 1600×900 / 16:9 固定舞台约束
- 纯思维导图 HTML 生成与脚本校验
- 独立演示 HTML 生成与脚本校验
- 融合 HTML 生成与脚本校验

## CI Release Check

`npm run release:check` 必须全部通过：
1. Core tree/layout/presentation tests
2. Project diagnostics tests
3. index.html inline JavaScript syntax
4. Portable Runtime 功能契约检查

## 规则

- `fail`：正式导出前必须处理，应用会阻止导出。
- `warn`：允许继续导出，但正式汇报前建议处理。
- `pass`：当前检查项正常。
