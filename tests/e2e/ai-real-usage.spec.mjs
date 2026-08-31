import fs from 'node:fs/promises';
import JSZip from 'jszip';
import { test, expect } from '@playwright/test';

test.setTimeout(180000);

const CHART_TYPES=['bar','line','area','donut','radar','funnel','waterfall'];
const DUMMY_KEY='sk-e2e-browser-only-not-a-secret';

async function dismissWelcome(page){
  await page.waitForTimeout(350);
  const overlay=page.locator('#welcomeOverlay');
  if(await overlay.isVisible())await page.locator('#welcomeClose').click();
  await expect(overlay).not.toHaveClass(/open/);
}

function response(content){
  return JSON.stringify({id:'minddeck-e2e',choices:[{index:0,message:{role:'assistant',content:JSON.stringify(content)},finish_reason:'stop'}]});
}

function deckPlan(){
  const chartSlides=CHART_TYPES.map((type,index)=>({
    goal:`Validate editable ${type} chart`,
    roleHint:type==='line'||type==='area'?'trend':'metrics',
    title:`Chart ${type}`,
    topic:`${type} native chart`,
    facts:[`${type} point A ${10+index}`,`${type} point B ${20+index}`,`${type} point C ${30+index}`,`${type} point D ${40+index}`],
    takeaway:`${type} chart must remain editable`,
    chartIntent:{
      chartType:type,
      categories:['A','B','C','D'],
      values:[10+index,20+index,30+index,40+index],
      series:[{name:`${type} series`,values:[10+index,20+index,30+index,40+index]}],
      options:{showLegend:false,showLabels:true,showValues:true,showGrid:true,smooth:type==='line'||type==='area',stacked:false,orientation:'vertical'}
    },
    emphasis:'data'
  }));
  return {
    schemaVersion:1,
    purpose:'Real browser verification of AI generation and editable presentation elements',
    audience:'MindDeck QA',
    tone:'clear',
    targetSlides:10,
    storyArc:['cover','context','native charts','structured data'],
    sections:[{id:'all',title:'Full real usage verification'}],
    slideIntents:[
      {goal:'Open the test deck',roleHint:'cover',title:'AI Real Usage E2E',topic:'AI Real Usage E2E',facts:[],takeaway:'',emphasis:'title'},
      {goal:'Explain what is being tested',roleHint:'statement',title:'Usage scenario',topic:'Usage scenario',facts:['Generate through the AI UI','Edit every page','Edit every chart','Export editable PPTX'],takeaway:'All operations must use the real product path',emphasis:'balanced'},
      ...chartSlides,
      {goal:'Validate structured table page',roleHint:'table',title:'Validation matrix',topic:'Validation matrix',facts:['Generation: passed','Page editing: passed','Chart editing: passed','PPTX: passed'],takeaway:'The final project remains editable',tableIntent:{columns:[{label:'Area'},{label:'Expected'}],header:{visible:true,cells:['Area','Expected']},rows:[['Generation','Editable Project'],['Page editing','Undoable patch'],['Chart editing','Native chart'],['PPTX','Editable OOXML']]},emphasis:'balanced'}
    ]
  };
}

async function installDeepSeekMock(page,requests){
  await page.route('https://api.deepseek.com/chat/completions',async route=>{
    const request=route.request();
    const body=JSON.parse(request.postData()||'{}');
    const system=String(body.messages?.find(item=>item.role==='system')?.content||'');
    const user=String(body.messages?.find(item=>item.role==='user')?.content||'');
    requests.push({authorization:request.headers().authorization||'',model:body.model,system,user});
    let content;
    if(system.includes('ok boolean field'))content={ok:true};
    else{
      let payload={};
      try{payload=JSON.parse(user)}catch{}
      if(payload.task==='Create a presentation story plan'||payload.task==='Repair the presentation story plan')content=deckPlan();
      else if(payload.task==='Edit the existing MindDeck presentation'){
        const nodes=payload.context?.nodes||[];
        if(String(payload.instruction).startsWith('PAGE_TEST')){
          content={schemaVersion:1,scope:payload.scope,summary:'Modify current page title through AI patch',slidePatches:nodes.map((node,index)=>({nodeId:node.id,title:`${node.title} · AI页测${index+1}`}))};
        }else if(String(payload.instruction).startsWith('CHART_TEST')){
          const node=nodes[0],element=node?.elements?.find(item=>item.type==='chart');
          const chart=structuredClone(element?.chart||{});
          if(Array.isArray(chart.categories)&&chart.categories.length)chart.categories[0]=`${chart.categories[0]} AI`;
          if(Array.isArray(chart.labels)&&chart.labels.length)chart.labels[0]=`${chart.labels[0]} AI`;
          if(Array.isArray(chart.series)&&chart.series[0]?.values?.length)chart.series[0].values[0]=Number(chart.series[0].values[0]||0)+111;
          if(Array.isArray(chart.values)&&chart.values.length)chart.values[0]=Number(chart.values[0]||0)+111;
          content={schemaVersion:1,scope:payload.scope,summary:'Modify selected native chart through AI patch',slidePatches:[{nodeId:node.id,elementPatches:[{elementId:element.id,type:'chart',chart}]}]};
        }else{
          content={schemaVersion:1,scope:payload.scope,summary:'Generic page edit',slidePatches:nodes.slice(0,1).map(node=>({nodeId:node.id,text:`${node.text||''} AI edited`.trim()}))};
        }
      }else content={ok:true};
    }
    await route.fulfill({status:200,contentType:'application/json',body:response(content)});
  });
}

async function projectNode(page,id){
  return page.evaluate(nodeId=>{
    const walk=node=>node.id===nodeId?node:(node.children||[]).map(walk).find(Boolean);
    return walk(globalThis.MindDeckApp.getProject());
  },id);
}

async function openNodeEditorByUi(page,id){
  if(await page.locator('#editorShell').evaluate(node=>node.classList.contains('open')))await page.locator('#backToMapBtn').click();
  await page.locator('#presentationModeBtn').click();
  const mapNode=page.locator(`.node[data-id="${id}"]`);
  await expect(mapNode).toBeVisible();
  await mapNode.click();
  await expect(page.locator('#nodePanel')).toHaveClass(/open/);
  await page.locator('#editSlideBtn').click();
  await expect(page.locator('#editorShell')).toHaveClass(/open/);
}

async function aiEditCurrentPage(page,index){
  await page.locator('#aiV10EditorBtn').click();
  await expect(page.locator('#aiV10Instruction')).toBeVisible();
  await page.locator('#aiV10Scope').selectOption('slide');
  await page.locator('#aiV10Instruction').fill(`PAGE_TEST ${index}`);
  await page.locator('#aiV10PlanEdit').click();
  await expect(page.locator('#aiV10ApplyEdit')).toBeVisible();
  await expect(page.locator('#aiV10PatchPreview')).toContainText('节点标题');
  await page.locator('#aiV10ApplyEdit').click();
  await expect(page.locator('.v99-smart-overlay')).toHaveCount(0);
}

test('real desktop use: configure DeepSeek, generate 10 pages, edit every page and every chart, export editable PPTX',async({page},testInfo)=>{
  test.skip(testInfo.project.name.includes('mobile'),'full data-heavy workflow runs on desktop Chromium');
  const requests=[],pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  page.on('dialog',dialog=>dialog.accept());
  await installDeepSeekMock(page,requests);
  await page.goto('/');
  await dismissWelcome(page);

  await test.step('both local and explicit AI compose entries work',async()=>{
    await expect(page.locator('#v99SmartComposeBtn')).toBeVisible();
    await page.locator('#v99SmartComposeBtn').click();
    await expect(page.locator('#v99Outline')).toBeVisible();
    await page.locator('#v99CancelBtn').click();
    await expect(page.locator('#aiV10ComposeBtn')).toBeVisible();
  });

  await test.step('configure DeepSeek in sessionStorage and test the connection',async()=>{
    await page.locator('#aiV10SettingsBtn').click();
    await page.locator('#aiV10Key').fill(DUMMY_KEY);
    await page.locator('#aiV10Preset').selectOption('fast');
    await page.locator('#aiV10Test').click();
    await expect(page.locator('#aiV10SettingsStatus')).toContainText('连接成功');
    await page.locator('#aiV10Save').click();
    await page.locator('#aiV10SettingsCancel').click();
    const storage=await page.evaluate(key=>({session:sessionStorage.getItem('minddeck-v10-deepseek-api-key'),local:Object.values(localStorage).some(value=>String(value).includes(key)),project:JSON.stringify(globalThis.MindDeckApp.getProject()).includes(key)}),DUMMY_KEY);
    expect(storage.session).toBe(DUMMY_KEY);
    expect(storage.local).toBe(false);
    expect(storage.project).toBe(false);
  });

  await test.step('generate the complete presentation through the actual AI compose UI',async()=>{
    await page.locator('#aiV10ComposeBtn').click();
    await expect(page.locator('#aiV10Source')).toBeVisible();
    await page.locator('#aiV10Source').fill(`# AI Real Usage E2E\n\nWe need a presentation that proves every native chart can be generated, manually edited, AI edited and exported.\n\n## Charts\nbar, line, area, donut, radar, funnel, waterfall\n\n## Structured\nInclude a final validation table.`);
    await page.locator('#aiV10Slides').fill('10');
    await page.locator('#aiV10Model').selectOption('fast');
    await page.locator('#aiV10ComposeTest').click();
    await expect(page.locator('#aiV10ComposeStatus')).toContainText('连接成功');
    await page.locator('#aiV10ComposeGenerate').click();
    await expect(page.locator('.v99-smart-overlay')).toHaveCount(0,{timeout:15000});
    const summary=await page.evaluate(()=>{
      const project=globalThis.MindDeckApp.getProject(),nodes=[project,...project.children];
      return {title:project.title,pages:nodes.length,charts:nodes.flatMap(node=>node.slideElements||[]).filter(element=>element.type==='chart').map(element=>element.chartType),table:nodes.some(node=>(node.slideElements||[]).some(element=>element.type==='table')),quality:globalThis.MindDeckCore.Composer.Quality.validateProject(project).ok};
    });
    expect(summary.title).toBe('AI Real Usage E2E');
    expect(summary.pages).toBe(10);
    expect(new Set(summary.charts)).toEqual(new Set(CHART_TYPES));
    expect(summary.table).toBe(true);
    expect(summary.quality).toBe(true);
  });

  const pageIds=await page.evaluate(()=>{const project=globalThis.MindDeckApp.getProject();return [project.id,...project.children.map(node=>node.id)]});
  expect(pageIds).toHaveLength(10);

  await test.step('open and AI-edit every generated page through the real editor UI',async()=>{
    for(let index=0;index<pageIds.length;index++){
      const id=pageIds[index];
      await openNodeEditorByUi(page,id);
      const before=(await projectNode(page,id)).title;
      await aiEditCurrentPage(page,index+1);
      const after=(await projectNode(page,id)).title;
      expect(after).toBe(`${before} · AI页测1`);
      await page.locator('#backToMapBtn').click();
    }
  });

  await test.step('manually edit and AI-edit all seven native chart types without moving geometry',async()=>{
    for(let index=0;index<CHART_TYPES.length;index++){
      const type=CHART_TYPES[index];
      const nodeId=await page.evaluate(chartType=>{
        const project=globalThis.MindDeckApp.getProject();
        return project.children.find(node=>(node.slideElements||[]).some(element=>element.type==='chart'&&element.chartType===chartType))?.id;
      },type);
      expect(nodeId,`node for ${type}`).toBeTruthy();
      await openNodeEditorByUi(page,nodeId);
      const chartId=await page.evaluate(id=>{
        const walk=node=>node.id===id?node:(node.children||[]).map(walk).find(Boolean),node=walk(globalThis.MindDeckApp.getProject());
        return node.slideElements.find(element=>element.type==='chart')?.id;
      },nodeId);
      expect(chartId,`chart id for ${type}`).toBeTruthy();
      const chartEl=page.locator(`.canvas-el[data-id="${chartId}"]`);
      await expect(chartEl).toBeVisible();
      await chartEl.click();
      await expect(page.locator('[data-chart-type]')).toHaveValue(type);
      const geometryBefore=await page.evaluate(({nodeId,chartId})=>{
        const walk=node=>node.id===nodeId?node:(node.children||[]).map(walk).find(Boolean),node=walk(globalThis.MindDeckApp.getProject()),chart=node.slideElements.find(element=>element.id===chartId);return {x:chart.x,y:chart.y,w:chart.w,h:chart.h,z:chart.z};
      },{nodeId,chartId});
      const manualValue=1000+index;
      await page.locator('[data-chart-category="0"]').fill(`${type}-manual`);
      await page.locator('[data-chart-category="0"]').press('Tab');
      await page.locator('[data-chart-value-row="0"][data-chart-value-series="0"]').fill(String(manualValue));
      await page.locator('[data-chart-value-row="0"][data-chart-value-series="0"]').press('Tab');
      const nextType=CHART_TYPES[(index+1)%CHART_TYPES.length];
      await page.locator('[data-chart-type]').selectOption(nextType);
      await expect.poll(()=>page.evaluate(({nodeId,chartId})=>{const walk=node=>node.id===nodeId?node:(node.children||[]).map(walk).find(Boolean),node=walk(globalThis.MindDeckApp.getProject());return node.slideElements.find(element=>element.id===chartId)?.chartType},{nodeId,chartId})).toBe(nextType);
      await page.locator('[data-chart-type]').selectOption(type);
      await expect.poll(()=>page.evaluate(({nodeId,chartId})=>{const walk=node=>node.id===nodeId?node:(node.children||[]).map(walk).find(Boolean),node=walk(globalThis.MindDeckApp.getProject());return node.slideElements.find(element=>element.id===chartId)?.series?.[0]?.values?.[0]},{nodeId,chartId})).toBe(manualValue);
      await chartEl.click();
      await page.locator('#aiV10EditorBtn').click();
      await expect(page.locator('#aiV10Scope')).toHaveValue('selection');
      await page.locator('#aiV10Instruction').fill(`CHART_TEST ${type}`);
      await page.locator('#aiV10PlanEdit').click();
      await expect(page.locator('#aiV10ApplyEdit')).toBeVisible();
      await page.locator('#aiV10ApplyEdit').click();
      const checked=await page.evaluate(({nodeId,chartId})=>{
        const walk=node=>node.id===nodeId?node:(node.children||[]).map(walk).find(Boolean),node=walk(globalThis.MindDeckApp.getProject()),chart=node.slideElements.find(element=>element.id===chartId),source=node.composer?.content?.chart;return {geometry:{x:chart.x,y:chart.y,w:chart.w,h:chart.h,z:chart.z},chartType:chart.chartType,category:chart.categories?.[0],value:chart.series?.[0]?.values?.[0],sourceCategory:source?.categories?.[0],sourceValue:source?.series?.[0]?.values?.[0]};
      },{nodeId,chartId});
      expect(checked.geometry).toEqual(geometryBefore);
      expect(checked.chartType).toBe(type);
      expect(checked.category).toContain('AI');
      expect(checked.value).toBe(manualValue+111);
      expect(checked.sourceCategory).toBe(checked.category);
      expect(checked.sourceValue).toBe(checked.value);
      await page.locator('#backToMapBtn').click();
    }
  });

  await test.step('export the final edited Project through the real PPTX button and inspect OOXML',async()=>{
    await page.locator('#presentationModeBtn').click();
    await page.addScriptTag({url:'/node_modules/pptxgenjs/dist/pptxgen.bundle.js'});
    await expect.poll(()=>page.evaluate(()=>typeof globalThis.PptxGenJS)).toBe('function');
    const downloadPromise=page.waitForEvent('download',{timeout:30000});
    await page.locator('#exportPptxBtn').click();
    const download=await downloadPromise;
    expect(await download.failure()).toBeNull();
    const path=await download.path(),buffer=await fs.readFile(path),zip=await JSZip.loadAsync(buffer),names=Object.keys(zip.files);
    const slideXml=names.filter(name=>/^ppt\/slides\/slide\d+\.xml$/.test(name));
    const chartXml=names.filter(name=>/^ppt\/charts\/chart\d+\.xml$/.test(name));
    expect(slideXml).toHaveLength(10);
    expect(chartXml.length).toBeGreaterThanOrEqual(7);
    const chartText=(await Promise.all(chartXml.map(name=>zip.file(name).async('string')))).join('\n');
    for(let index=0;index<CHART_TYPES.length;index++)expect(chartText).toContain(String(1111+index));
  });

  expect(requests.length).toBeGreaterThanOrEqual(20);
  expect(requests.every(item=>item.authorization===`Bearer ${DUMMY_KEY}`)).toBe(true);
  expect(requests.some(item=>item.model==='deepseek-v4-flash')).toBe(true);
  expect(pageErrors).toEqual([]);
  console.log('REAL_USAGE_AI_E2E_OK',JSON.stringify({pages:10,pageEdits:10,chartTypes:CHART_TYPES,chartManualEdits:7,chartAiEdits:7,pptxSlides:10,pptxChartsAtLeast:7,deepSeekRequests:requests.length}));
});

test('real mobile entry smoke keeps local compose and AI compose separately usable',async({page},testInfo)=>{
  test.skip(!testInfo.project.name.includes('mobile'),'mobile entry verification');
  const requests=[];await installDeepSeekMock(page,requests);await page.goto('/');await dismissWelcome(page);
  await expect(page.locator('#v99SmartMobileBtn')).toBeVisible();
  await page.locator('#v99SmartMobileBtn').click();
  await expect(page.locator('#v99Outline')).toBeVisible();
  await page.locator('#v99CancelBtn').click();
  await expect(page.locator('#aiV10MobileComposeBtn')).toBeVisible();
  await page.locator('#aiV10MobileComposeBtn').click();
  await expect(page.locator('#aiV10Source')).toBeVisible();
  await page.locator('#aiV10ComposeCancel').click();
});
