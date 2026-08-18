# MindDeck V9.0 回归记录

## 本轮目标
统一纯思维导图 HTML、独立演示 HTML、融合 HTML 的导出运行时，降低功能漂移。

## 已完成
- 三种 HTML 共用 Portable Runtime 9.0
- 共用思维导图布局与曲线连线算法
- 共用按当前可见节点重排逻辑
- 共用节点展开/折叠、全开/全收
- 共用演示播放序列计算
- 共用演示目录展开/折叠
- 共用目录临时隐藏/显示
- 共用 1600×900 固定舞台 + contain 缩放
- 共用手机目录抽屉和滑动翻页
- 项目加入 schemaVersion
- .minddeck manifest 记录 runtimeVersion / schemaVersion
- HTML 导出继续进行脚本语法校验

## 自动回归结果
- 主编辑器 JavaScript：通过 node --check
- 纯思维导图 Portable Runtime：通过 node --check
- 独立演示 Portable Runtime：通过 node --check
- 融合 Portable Runtime：通过 node --check
- 纯导图：折叠后可见节点数量变化正确
- 纯导图：全部展开后节点恢复正确
- 纯导图：切换向下布局后节点坐标实际变化
- 独立演示：目录可隐藏/重新打开
- 独立演示：折叠目录节点后播放序列实时变化
- 融合 HTML：思维导图/演示模式可切换
- 手机 390×844：演示舞台实际比例 1.777777...
- 手机：目录打开后为 fixed 抽屉，不压缩 16:9 舞台

## 下一阶段
建立固定的稳定性回归框架，把关键操作变成每个版本必须通过的检查清单。
