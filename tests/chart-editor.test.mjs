import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { NativeChart } from '../src/runtime/modules/chart.js';

const editorSource=fs.readFileSync(new URL('../src/app/modules/29-chart-editor.js',import.meta.url),'utf8');
const hardeningSource=fs.readFileSync(new URL('../src/app/modules/29-chart-editor-hardening.js',import.meta.url),'utf8');
const manifest=JSON.parse(fs.readFileSync(new URL('../src/app/app.manifest.json',import.meta.url),'utf8'));

test('chart editor is part of the application closure and exposes real data controls',()=>{
  const editorIndex=manifest.scripts.indexOf('modules/29-chart-editor.js');
  const hardeningIndex=manifest.scripts.indexOf('modules/29-chart-editor-hardening.js');
  assert.ok(editorIndex>manifest.scripts.indexOf('modules/20-slide-editor.js'));
  assert.ok(hardeningIndex>editorIndex);
  assert.match(editorSource,/图表属性/);
  assert.match(editorSource,/data-chart-type/);
  assert.match(editorSource,/data-chart-category/);
  assert.match(editorSource,/data-chart-series-name/);
  assert.match(editorSource,/data-chart-value-row/);
  assert.match(editorSource,/add-point/);
  assert.match(editorSource,/add-series/);
  assert.match(editorSource,/node\.composer\.content\.chart/,'chart edits must sync back to Composer source data');
  assert.match(hardeningSource,/NativeChart\.validate/,'invalid chart mutations must be rejected before commit');
});

test('native chart data contract preserves multi-series edits used by the editor',()=>{
  const edited=NativeChart.normalize({
    chartType:'bar',
    categories:['第一季度','Q2','Q3','第四季度'],
    series:[
      {id:'series-1',name:'销售额',values:[123,20,30,456]},
      {id:'series-2',name:'利润',values:[42,8,12,18]}
    ],
    options:{showLegend:true,showLabels:true,showValues:true,showGrid:true}
  });
  const check=NativeChart.validate(edited);
  assert.equal(check.ok,true);
  assert.equal(edited.chartType,'bar');
  assert.deepEqual(edited.categories,['第一季度','Q2','Q3','第四季度']);
  assert.deepEqual(edited.values,[123,20,30,456]);
  assert.deepEqual(edited.series.map(item=>item.name),['销售额','利润']);
  assert.deepEqual(edited.series[1].values,[42,8,12,18]);
});

test('radar validation rejects an invalid edit without needing a renderer',()=>{
  const check=NativeChart.validate({
    chartType:'radar',
    categories:['A','B'],
    series:[{name:'S1',values:[1,2]}]
  });
  assert.equal(check.ok,false);
  assert.ok(check.errors.some(item=>item.code==='CHART_RADAR_TOO_SMALL'));
});
