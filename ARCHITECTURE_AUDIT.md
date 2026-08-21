# V9.6 最终架构审计

结论：**业务层未发现双实现 / 多实现。**

审计口径：同一个 Tree / Layout / Presentation / TOC / Map Renderer / Slide Renderer / Animation / Viewport / Input / Fullscreen / Project / Diagnostics / Recovery 规则，在代码库中只能有一个实现源。UI Adapter 可以存在，但不能重新解释业务。

## V9.6 阶段完成情况

| 阶段 | 目标 | 状态 |
|---|---|---|
| V9.6.0 | Tree + Project Core 接管 | ✅ |
| V9.6.1 | Layout：编辑导图 / 导出导图统一 | ✅ |
| V9.6.2 | Presentation + TOC + Input + Fullscreen | ✅ |
| V9.6.3 | Element + Slide Renderer | ✅ |
| V9.6.4 | Viewport + Animation + Theme + Recovery/Diagnostics | ✅ |
| V9.6.5 | Portable 只保留壳，业务全部来自 Shared Runtime | ✅ |

## 已删除/收口的重复实现

- Portable 自己的树遍历、find/parent、visibleIds。
- Portable 自己的 hLayout / dLayout / radial layout。
- Portable 自己的演示顺序和 pIndex/pList 重建规则。
- Portable 自己的 renderMap 业务实现。
- Portable 自己的 renderToc 业务实现。
- Portable 自己的 inlineEdit IME 处理。
- Main/Portable 两套 TOC 树生成规则。
- Main/Portable 两套思维导图节点/曲线生成规则。
- Main/Portable 两套页面元素渲染。
- Main/Portable 两套母版 + 页面合成。
- Main 的项目诊断算法与 `src/core/diagnostics.js` 双实现。
- Main 的 history 容量算法与 recovery Core 双实现。
- 新节点默认结构/默认页面模型的分叉。
- Core 测试模块与浏览器 Runtime 的算法分叉。

## 自动化证明

运行：

```bash
npm run audit:architecture
npm run release:check
```

当前结果：

```text
Architecture audit: OK
MindDeck release check: ALL OK
```

架构检查会拒绝 Portable 模板重新出现第二套业务算法。
