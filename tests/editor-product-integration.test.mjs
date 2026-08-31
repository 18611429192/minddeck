import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const manifest=JSON.parse(fs.readFileSync(new URL('../src/app/app.manifest.json',import.meta.url),'utf8'));
const read=name=>fs.readFileSync(new URL(`../src/app/modules/${name}`,import.meta.url),'utf8');
const chart=read('29-chart-editor.js');
const rich=read('29-rich-editor.js');
const redesign=read('29-redesign.js');
const pptx=read('41-pptx-export.js');

test('all real editors are part of one application closure in the correct order',()=>{
  const names=manifest.scripts;
  for(const file of ['modules/29-chart-editor.js','modules/29-rich-editor.js','modules/29-redesign.js','modules/41-pptx-export.js'])assert.ok(names.includes(file),`${file} missing from app manifest`);
  assert.ok(names.indexOf('modules/29-rich-editor.js')>names.indexOf('modules/29-chart-editor.js'));
  assert.ok(names.indexOf('modules/29-redesign.js')>names.indexOf('modules/27-slide-inspector.js'));
  assert.ok(names.indexOf('modules/41-pptx-export.js')>names.indexOf('modules/40-portable-export.js'));
});

test('chart table and diagram edits write canonical composer content',()=>{
  assert.match(chart,/node\.composer\.content\.chart/);
  assert.match(rich,/node\.composer\.content\.table/);
  assert.match(rich,/node\.composer\.content\.diagram/);
  assert.match(rich,/data-table-cell-r/);
  assert.match(rich,/data-diagram-label/);
  assert.match(rich,/data-image-replace/);
  assert.match(rich,/objectPosition/);
});

test('design intent and A B C templates are one redesign surface',()=>{
  assert.match(redesign,/设计意图是约束/);
  assert.match(redesign,/A 推荐/);
  assert.match(redesign,/data-redesign-template/);
  assert.match(redesign,/applyTemplate/);
  assert.match(redesign,/node\.composer\.designIntent/);
});

test('PPTX export uses the current project directly and never recompiles Composer',()=>{
  assert.match(pptx,/Core\.PptxExporter\.exportProject\(data/);
  assert.match(pptx,/pptxgenjs@4\.0\.1/);
  assert.match(pptx,/导出 PPTX/);
  assert.doesNotMatch(pptx,/Composer\.(?:compose|compileDeck|applyTemplate)/);
});
