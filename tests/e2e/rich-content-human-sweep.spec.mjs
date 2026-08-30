import { test, expect } from '@playwright/test';

test.setTimeout(120000);

async function dismissWelcome(page){
  await page.waitForTimeout(320);
  const overlay=page.locator('#welcomeOverlay');
  if(await overlay.isVisible())await page.locator('#welcomeClose').click();
  await expect(overlay).not.toHaveClass(/open/);
}

function richDeckSpec(){
  const chartSlide=(id,title,chartType,values,role='metrics')=>({
    id,role,
    content:{
      title,
      summary:`${title}的真实浏览器渲染检查`,
      items:values.map((value,index)=>({label:`第 ${index+1} 项`,value:String(value)})),
      chart:{
        chartType,
        categories:values.map((_,index)=>`Q${index+1}`),
        labels:values.map((_,index)=>`Q${index+1}`),
        values,
        series:[{id:'s1',name:'实际值',values}],
        options:{showLegend:true,showLabels:true,showValues:true,smooth:true}
      }
    }
  });
  return {
    schemaVersion:1,
    title:'V10 富内容人工扫测',
    goal:'验证 DeckSpec 生成、原生图表、表格、Diagram、演示目录和导出链路',
    audience:'MindDeck QA',
    theme:'aurora',
    slides:[
      chartSlide('chart-bar','柱状图指标','bar',[18,26,39,52],'metrics'),
      chartSlide('chart-line','折线趋势','line',[12,19,31,46],'trend'),
      chartSlide('chart-area','面积趋势','area',[9,15,24,37],'trend'),
      chartSlide('chart-donut','环形占比','donut',[45,30,15,10],'metrics'),
      chartSlide('chart-radar','雷达能力','radar',[72,88,64,91,79],'metrics'),
      chartSlide('chart-funnel','漏斗转化','funnel',[100,72,51,33],'metrics'),
      chartSlide('chart-waterfall','瀑布变化','waterfall',[30,-8,17,-5,12],'metrics'),
      {
        id:'native-table',role:'table',
        content:{
          title:'数据表格',summary:'原生表格应该保持结构化、可渲染。',
          table:{
            columns:[
              {id:'name',label:'项目',width:2,align:'left'},
              {id:'owner',label:'负责人',width:1,align:'center'},
              {id:'progress',label:'进度',width:1,align:'right'}
            ],
            header:{visible:true,cells:['项目','负责人','进度']},
            rows:[
              ['现场调研','研发A','100%'],
              ['方案验证','研发B','75%'],
              ['交付复盘','研发C','40%']
            ]
          }
        }
      },
      {
        id:'diagram-swot',role:'matrix',
        content:{
          title:'SWOT 矩阵',summary:'四象限原生 Diagram。',
          diagram:{subtype:'swot',data:{title:'项目 SWOT',items:[
            {label:'优势',detail:'业务理解深入'},
            {label:'劣势',detail:'反馈链路偏长'},
            {label:'机会',detail:'现场协同提效'},
            {label:'威胁',detail:'需求快速变化'}
          ]}}
        }
      },
      {
        id:'diagram-roadmap',role:'roadmap',
        content:{
          title:'交付路线图',summary:'路线图原生 Diagram。',
          diagram:{subtype:'roadmap',data:{title:'交付路线',items:[
            {label:'发现问题',detail:'现场观察'},
            {label:'形成方案',detail:'结构化拆解'},
            {label:'小步验证',detail:'真实用户反馈'},
            {label:'稳定交付',detail:'结果复盘'}
          ]}}
        }
      }
    ]
  };
}

async function project(page){return page.evaluate(()=>structuredClone(globalThis.MindDeckApp.getProject()))}

async function clickToc(page,id){
  const item=page.locator(`.toc-item[data-id="${id}"]`);
  await expect(item).toBeAttached();
  if(!(await item.isVisible())){
    const toggle=page.locator('#presentTocToggle');
    if(await toggle.isVisible())await toggle.click();
  }
  await item.click();
  await expect(item).toHaveClass(/active/);
}

test('desktop rich DeckSpec is generated and every native body renders through real presentation UI',async({page},testInfo)=>{
  test.skip(testInfo.project.name.includes('mobile'),'desktop rich-content sweep');
  const pageErrors=[];
  page.on('pageerror',err=>pageErrors.push(err.message));
  page.on('dialog',dialog=>dialog.accept());

  await page.goto('/');
  await dismissWelcome(page);

  await expect(page.locator('#v99DeckSpecBtn')).toBeVisible();
  await page.locator('#v99DeckSpecBtn').click();
  await expect(page.locator('#v99DeckSpecJson')).toBeVisible();
  await page.locator('#v99DeckSpecJson').fill(JSON.stringify(richDeckSpec(),null,2));
  await page.locator('#v99DeckSpecGenerate').click();
  await expect(page.locator('.v99-smart-overlay')).toHaveCount(0);

  const generated=await project(page);
  expect(generated.title).toBe('V10 富内容人工扫测');
  expect(generated.children).toHaveLength(10);
  expect(globalThis).toBeTruthy();
  const summary=await page.evaluate(()=>{
    const p=globalThis.MindDeckApp.getProject();
    return p.children.map(node=>({
      id:node.id,
      title:node.title,
      types:(node.slideElements||[]).map(el=>el.type),
      chart:(node.slideElements||[]).find(el=>el.type==='chart')?.chartType||null,
      diagram:(node.slideElements||[]).find(el=>el.type==='diagram')?.subtype||null
    }));
  });
  for(const type of ['bar','line','area','donut','radar','funnel','waterfall']){
    expect(summary.some(item=>item.chart===type&&item.types.includes('chart'))).toBe(true);
  }
  expect(summary.some(item=>item.id==='native-table'&&item.types.includes('table'))).toBe(true);
  expect(summary.some(item=>item.id==='diagram-swot'&&item.diagram==='swot')).toBe(true);
  expect(summary.some(item=>item.id==='diagram-roadmap'&&item.diagram==='roadmap')).toBe(true);
  await expect.poll(()=>page.evaluate(()=>globalThis.MindDeckCore.Composer.Quality.validateProject(globalThis.MindDeckApp.getProject()).ok)).toBe(true);

  // Exercise the real top-level theme and layout controls on the populated project.
  await page.locator('#appearanceBtn').click();
  await expect(page.locator('#themePanel')).toHaveClass(/open/);
  await page.locator('[data-theme-choice="dark"]').click();
  await expect.poll(()=>page.evaluate(()=>globalThis.MindDeckApp.getProject().uiTheme)).toBe('dark');
  await page.locator('[data-close-panel="themePanel"]').click();
  await page.locator('#mapLayoutSelect').selectOption('down');
  await expect.poll(()=>page.evaluate(()=>globalThis.MindDeckApp.getProject().mapLayout)).toBe('down');
  await page.locator('#resetLayoutBtn').click();

  // Enter presentation through the actual button and click the TOC item for every rich page.
  await page.locator('#presentBtn').click();
  await expect(page.locator('#presentShell')).toHaveClass(/open/);
  const chartChecks=[
    ['chart-bar','bar'],['chart-line','line'],['chart-area','area'],['chart-donut','donut'],
    ['chart-radar','radar'],['chart-funnel','funnel'],['chart-waterfall','waterfall']
  ];
  for(const [id,type] of chartChecks){
    await clickToc(page,id);
    await expect(page.locator(`#presentStage svg[aria-label="${type} chart"]`)).toBeVisible();
  }
  await clickToc(page,'native-table');
  await expect(page.locator('#presentStage [role="table"]')).toBeVisible();
  await expect(page.locator('#presentStage [role="table"]')).toContainText('现场调研');
  await clickToc(page,'diagram-swot');
  await expect(page.locator('#presentStage svg[aria-label="swot diagram"]')).toBeVisible();
  await clickToc(page,'diagram-roadmap');
  await expect(page.locator('#presentStage svg[aria-label="roadmap diagram"]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#presentShell')).not.toHaveClass(/open/);

  // Open one generated chart through the map UI and verify the same native renderer is used in Editor.
  await page.locator('.node[data-id="chart-line"]').click();
  await page.locator('#editSlideBtn').click();
  await expect(page.locator('#editorShell')).toHaveClass(/open/);
  await expect(page.locator('#editorStage svg[aria-label="line chart"]')).toBeVisible();
  await expect(page.locator('#slideInspectorBtn')).toBeVisible();
  await page.locator('#backToMapBtn').click();

  // Health check and actual standalone export must still work with the rich native elements.
  await page.locator('#healthCheckBtn').click();
  await page.locator('#runHealthCheckBtn').click();
  await expect(page.locator('#healthScore')).not.toHaveText('—');
  const healthText=await page.locator('#healthList').innerText();
  expect(healthText).not.toContain('失败');
  const healthClose=page.locator('[data-close-panel="healthPanel"]');
  if(await healthClose.isVisible())await healthClose.click();
  const downloadPromise=page.waitForEvent('download',{timeout:10000});
  await page.locator('#exportViewerBtn').click();
  const download=await downloadPromise;
  expect(await download.failure()).toBeNull();

  expect(pageErrors).toEqual([]);
});
