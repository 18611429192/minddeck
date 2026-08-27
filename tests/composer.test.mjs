import assert from 'node:assert/strict';
import { composeDeck, parseOutline, inferPageRole, rethemeDeck, describeDeck, deckThemes, pageRoles } from '../src/core/composer.js';

const source=`# 研发价值复盘
> 从代码交付走向解决真实问题

## 为什么要到现场
- 看真实使用
- 找真正卡点
- 带着问题回来

## 核心指标
- 32% 问题定位效率提升
- 4.8x 反馈速度
- 12 周完成闭环

## 推进流程
- 明确问题
- 形成方案
- 小步验证
- 交付复盘

## 方案对比
- 只接需求文档
- 结合现场反馈

## 结论与下一步
- 先验证关键问题
- 再持续完善功能`;

{
  const parsed=parseOutline(source);
  assert.equal(parsed.title,'研发价值复盘');
  assert.equal(parsed.pageCount,6);
  assert.equal(parsed.specs.length,5);
}
{
  const deck=composeDeck(source,{theme:'cobalt',density:'standard',mapLayout:'balanced'});
  const desc=describeDeck(deck);
  assert.equal(deck.deckTheme,'cobalt');
  assert.equal(deck.deckComposerVersion,'9.9');
  assert.equal(desc.pages,6);
  assert.equal(desc.smartPages,6);
  assert.equal(deck.deckRole,'cover');
  assert.equal(deck.children[1].deckRole,'metrics');
  assert.equal(deck.children[2].deckRole,'process');
  assert.equal(deck.children[3].deckRole,'compare');
  assert.equal(deck.children[4].deckRole,'conclusion');
  assert.ok(deck.slideElements.length>3);
  assert.ok(deck.children.every(node=>node.slideElements.length>0));
  assert.ok(deck.master.elements.length>=2);
}
{
  assert.equal(inferPageRole({title:'趋势变化',text:'',points:['Q1 20','Q2 35'],children:[]},{depth:1}),'trend');
  assert.equal(inferPageRole({title:'推进流程',text:'',points:['A','B','C'],children:[]},{depth:1}),'process');
  assert.equal(inferPageRole({title:'总结与建议',text:'',points:['A'],children:[]},{depth:1}),'conclusion');
}
{
  const deck=composeDeck(source,{theme:'aurora'});
  const before=deck.children[0].slideElements.map(e=>e.id).join(',');
  rethemeDeck(deck,'forest',{regenerate:true});
  assert.equal(deck.deckTheme,'forest');
  assert.equal(deck.master.bgColor,deckThemes.find(theme=>theme.id==='forest').bg);
  const after=deck.children[0].slideElements.map(e=>e.id).join(',');
  assert.notEqual(before,after);
}
{
  assert.equal(deckThemes.length,12);
  assert.equal(pageRoles.length,12);
}
console.log('MindDeck V9.9 Composer regression tests: OK');
