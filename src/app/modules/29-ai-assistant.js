
  // V10 DeepSeek AI assistant. API keys live in sessionStorage only and never enter Project data.
  const AI_KEY_SESSION='minddeck-v10-deepseek-api-key';
  const AI_PRESET_SESSION='minddeck-v10-deepseek-preset';
  let aiSettingsButton=null,aiEditorButton=null,aiPendingPatch=null;

  function installAIAssistantStylesV10(){
    if(document.getElementById('minddeck-v10-ai-assistant-styles'))return;
    const style=document.createElement('style');style.id='minddeck-v10-ai-assistant-styles';style.textContent=`
      .ai-v10-status{padding:10px 12px;border-radius:12px;background:rgba(91,108,255,.08);border:1px solid rgba(91,108,255,.16);font-size:12px;line-height:1.55;margin:10px 0}.ai-v10-status.ok{background:rgba(28,156,109,.09);border-color:rgba(28,156,109,.22)}.ai-v10-status.error{background:rgba(216,95,69,.10);border-color:rgba(216,95,69,.25)}
      .ai-v10-key-row{display:flex;gap:8px;align-items:center}.ai-v10-key-row input{flex:1;height:40px;border-radius:11px;border:1px solid rgba(128,138,160,.25);background:var(--input,#fff);color:inherit;padding:0 11px}.ai-v10-key-row button{height:40px;border-radius:11px;border:1px solid rgba(128,138,160,.25);background:transparent;color:inherit;padding:0 11px;cursor:pointer;font-weight:700}
      .ai-v10-inline-actions{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 2px}.ai-v10-chip{border:1px solid rgba(128,138,160,.22);background:rgba(128,138,160,.06);color:inherit;border-radius:999px;padding:6px 10px;font-size:11px;cursor:pointer}.ai-v10-chip:hover{border-color:#6374ff;background:rgba(99,116,255,.10)}
      .ai-v10-preview-list{display:grid;gap:8px;margin-top:10px}.ai-v10-preview-item{padding:10px 11px;border:1px solid rgba(128,138,160,.18);border-radius:11px;background:rgba(128,138,160,.04);font-size:11px;line-height:1.5}.ai-v10-preview-item b{display:block;font-size:12px;margin-bottom:3px}.ai-v10-badge{display:inline-flex;align-items:center;padding:3px 7px;border-radius:999px;background:rgba(91,108,255,.11);font-size:10px;font-weight:800;margin-right:5px}.ai-v10-secret-note{font-size:11px;line-height:1.55;color:var(--muted,#737b8b);margin-top:7px}.ai-v10-secret-note strong{color:inherit}.ai-v10-setting-entry{white-space:nowrap}.ai-v10-progress{font-weight:750}.ai-v10-grid-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      @media(max-width:700px){.ai-v10-grid-two{grid-template-columns:1fr}.ai-v10-key-row{align-items:stretch;flex-direction:column}.ai-v10-key-row input,.ai-v10-key-row button{width:100%}}
    `;document.head.appendChild(style)
  }
  function aiReadKeyV10(){try{return sessionStorage.getItem(AI_KEY_SESSION)||''}catch{return ''}}
  function aiWriteKeyV10(value){try{const key=String(value||'').trim();if(key)sessionStorage.setItem(AI_KEY_SESSION,key);else sessionStorage.removeItem(AI_KEY_SESSION);return key}catch{return String(value||'').trim()}}
  function aiPresetV10(){try{return sessionStorage.getItem(AI_PRESET_SESSION)==='quality'?'quality':'fast'}catch{return 'fast'}}
  function aiWritePresetV10(value){const preset=value==='quality'?'quality':'fast';try{sessionStorage.setItem(AI_PRESET_SESSION,preset)}catch{}return preset}
  function aiProviderV10(preset=aiPresetV10(),key=aiReadKeyV10()){
    if(!key)throw Object.assign(new Error('请先输入 DeepSeek API Key'),{code:'AI_KEY_MISSING'});
    return Core.DeepSeek.createProvider({preset,apiKey:key});
  }
  function aiStatusV10(box,text,state=''){box.className=`ai-v10-status ${state}`.trim();box.textContent=text}
  function aiErrorTextV10(err){const code=err?.code||'';if(code==='AI_KEY_MISSING')return '未设置 DeepSeek API Key';if(code==='AI_TIMEOUT')return 'DeepSeek 请求超时';if(code==='AI_PROVIDER_HTTP')return `DeepSeek API 返回 HTTP ${err.status||'错误'}`;if(code==='AI_PROVIDER_EMPTY')return 'DeepSeek 返回空内容';return String(err?.message||err||'未知错误')}
  async function aiTestConnectionV10(provider,status){
    aiStatusV10(status,'正在连接 DeepSeek…');
    try{const result=await provider.testConnection();aiStatusV10(status,`连接成功 · ${result.provider.model}`,'ok');return true}catch(err){aiStatusV10(status,'连接失败：'+aiErrorTextV10(err),'error');return false}
  }

  function openAISettingsV10(){
    installAIAssistantStylesV10();const dialog=makeOverlay('DeepSeek AI 设置','API Key 仅保存在当前浏览器会话的 sessionStorage；关闭浏览器标签页/会话后可清除，绝不会写入 MindDeck Project 或仓库。'),body=document.createElement('div');body.className='v99-smart-body';const preset=aiPresetV10();body.innerHTML=`<div class="v99-smart-card"><div class="v99-smart-field"><label>DeepSeek API Key</label><div class="ai-v10-key-row"><input id="aiV10Key" type="password" autocomplete="off" placeholder="sk-..." value="${esc(aiReadKeyV10())}"><button id="aiV10ClearKey" type="button">清除</button></div><div class="ai-v10-secret-note"><strong>安全策略：</strong>Key 只进入运行时请求头和 sessionStorage；不会进入 localStorage、Project JSON、DeckSpec、日志、源码或导出文件。</div></div><div class="ai-v10-grid-two"><div class="v99-smart-field"><label>默认模型</label><select id="aiV10Preset"><option value="fast" ${preset==='fast'?'selected':''}>DeepSeek V4 Flash · 快速</option><option value="quality" ${preset==='quality'?'selected':''}>DeepSeek V4 Pro · 高质量</option></select></div><div class="v99-smart-field"><label>模型行为</label><div class="v99-smart-preview">Flash 默认非思考，适合改字、图表和快速组稿；Pro 默认思考 + high reasoning，适合复杂结构规划。</div></div></div><div class="ai-v10-status" id="aiV10SettingsStatus">尚未测试连接</div></div><div class="v99-smart-actions"><button id="aiV10SettingsCancel" type="button">关闭</button><button id="aiV10Test" type="button">测试连接</button><button id="aiV10Save" class="primary" type="button">保存到本次会话</button></div>`;dialog.appendChild(body);
    const key=body.querySelector('#aiV10Key'),presetSelect=body.querySelector('#aiV10Preset'),status=body.querySelector('#aiV10SettingsStatus');
    body.querySelector('#aiV10ClearKey').onclick=()=>{key.value='';aiWriteKeyV10('');aiStatusV10(status,'本次会话中的 Key 已清除','ok')};
    body.querySelector('#aiV10SettingsCancel').onclick=removeSmartOverlay;
    body.querySelector('#aiV10Save').onclick=()=>{const value=aiWriteKeyV10(key.value);aiWritePresetV10(presetSelect.value);aiStatusV10(status,value?'已保存到当前会话':'Key 已清除','ok');toast(value?'DeepSeek 设置已保存到本次会话':'DeepSeek Key 已清除')};
    body.querySelector('#aiV10Test').onclick=async()=>{const value=aiWriteKeyV10(key.value);aiWritePresetV10(presetSelect.value);if(!value){aiStatusV10(status,'请先输入 API Key','error');return}await aiTestConnectionV10(aiProviderV10(presetSelect.value,value),status)};
  }

  function aiLocalPreviewCountV10(source){try{return Math.max(1,sourcePreview(source).pageCount||8)}catch{return 8}}
  function openAISmartComposerV10(){
    installAIAssistantStylesV10();const dialog=makeOverlay('DeepSeek AI 组稿','DeepSeek 只规划经过验证的 DeckPlan；真正的版式、图表、表格、可编辑元素仍由 Shared Runtime Composer 生成。'),body=document.createElement('div');body.className='v99-smart-body';const preset=aiPresetV10();body.innerHTML=`<div class="v99-smart-grid"><div class="v99-smart-card"><h3>1. 输入原始材料</h3><textarea id="aiV10Source" spellcheck="false" placeholder="粘贴 Markdown、会议记录、需求说明或普通文本…"></textarea><div class="ai-v10-inline-actions"><button class="ai-v10-chip" id="aiV10LoadSample" type="button">载入示例</button><button class="ai-v10-chip" id="aiV10OpenSettings" type="button">DeepSeek 设置</button></div><div class="v99-smart-note">AI 不生成 DOM/CSS/坐标，也不会直接生成 PPTX；它只规划故事结构与内容意图。</div></div><div class="v99-smart-card"><h3>2. AI 规划参数</h3><div class="ai-v10-grid-two"><div class="v99-smart-field"><label>目标页数</label><input id="aiV10Slides" type="number" min="1" max="60" value="8" style="width:100%;height:40px;box-sizing:border-box;border-radius:11px;border:1px solid rgba(128,138,160,.25);background:var(--input,#fff);color:inherit;padding:0 10px"></div><div class="v99-smart-field"><label>模型</label><select id="aiV10Model"><option value="fast" ${preset==='fast'?'selected':''}>V4 Flash · 快速</option><option value="quality" ${preset==='quality'?'selected':''}>V4 Pro · 高质量</option></select></div></div><div class="v99-smart-field"><label>DeepSeek API Key（仅本次会话）</label><div class="ai-v10-key-row"><input id="aiV10ComposeKey" type="password" autocomplete="off" placeholder="sk-..." value="${esc(aiReadKeyV10())}"></div></div><div class="v99-smart-field"><label>演示主题</label><select id="aiV10Theme">${optionHtml(ComposerV99.themes,data.deckTheme||'aurora')}</select></div><div class="ai-v10-grid-two"><div class="v99-smart-field"><label>信息密度</label><select id="aiV10Density">${densityOptions(data.deckDensity||'standard')}</select></div><div class="v99-smart-field"><label>导图布局</label><select id="aiV10Layout">${layoutOptions(data.mapLayout||'balanced')}</select></div></div><div class="v99-smart-field"><label>汇报目的（可选）</label><input id="aiV10Purpose" type="text" placeholder="例如：向管理层说明方案价值" style="width:100%;height:40px;box-sizing:border-box;border-radius:11px;border:1px solid rgba(128,138,160,.25);background:var(--input,#fff);color:inherit;padding:0 10px"></div><div class="v99-smart-field"><label>听众（可选）</label><input id="aiV10Audience" type="text" placeholder="例如：技术委员会 / 管理层" style="width:100%;height:40px;box-sizing:border-box;border-radius:11px;border:1px solid rgba(128,138,160,.25);background:var(--input,#fff);color:inherit;padding:0 10px"></div><div class="ai-v10-status ai-v10-progress" id="aiV10ComposeStatus">等待输入材料</div></div></div><div class="v99-smart-actions"><button id="aiV10LocalCompose" type="button">本地组稿</button><button id="aiV10ComposeCancel" type="button">取消</button><button id="aiV10ComposeTest" type="button">测试 API</button><button id="aiV10ComposeGenerate" class="primary" type="button">DeepSeek 生成整套演示</button></div>`;dialog.appendChild(body);
    const source=body.querySelector('#aiV10Source'),slides=body.querySelector('#aiV10Slides'),model=body.querySelector('#aiV10Model'),keyInput=body.querySelector('#aiV10ComposeKey'),status=body.querySelector('#aiV10ComposeStatus');
    source.addEventListener('input',()=>{const raw=source.value.trim();if(raw&&document.activeElement!==slides)slides.value=String(Math.max(1,Math.min(60,aiLocalPreviewCountV10(raw))));aiStatusV10(status,raw?`本地预估 ${slides.value} 页；DeepSeek 会按目标页数严格规划`:'等待输入材料')});
    body.querySelector('#aiV10LoadSample').onclick=()=>{source.value=SMART_SAMPLE;slides.value=String(aiLocalPreviewCountV10(SMART_SAMPLE));aiStatusV10(status,`已载入示例 · 目标 ${slides.value} 页`)};
    body.querySelector('#aiV10OpenSettings').onclick=openAISettingsV10;
    body.querySelector('#aiV10ComposeCancel').onclick=removeSmartOverlay;
    body.querySelector('#aiV10LocalCompose').onclick=()=>{removeSmartOverlay();openSmartComposer()};
    body.querySelector('#aiV10ComposeTest').onclick=async()=>{try{aiWritePresetV10(model.value);const key=aiWriteKeyV10(keyInput.value);await aiTestConnectionV10(aiProviderV10(model.value,key),status)}catch(err){aiStatusV10(status,aiErrorTextV10(err),'error')}};
    body.querySelector('#aiV10ComposeGenerate').onclick=async()=>{
      const raw=source.value.trim(),target=Math.max(1,Math.min(60,Math.round(Number(slides.value)||8)));if(!raw){toast('请先输入材料');source.focus();return}
      let provider;try{aiWritePresetV10(model.value);const key=aiWriteKeyV10(keyInput.value);provider=aiProviderV10(model.value,key)}catch(err){aiStatusV10(status,aiErrorTextV10(err),'error');return}
      const button=body.querySelector('#aiV10ComposeGenerate');button.disabled=true;aiStatusV10(status,`正在用 ${model.value==='quality'?'DeepSeek V4 Pro':'DeepSeek V4 Flash'} 规划 ${target} 页…`);
      try{
        const result=await Core.AIStoryPlanner.plan(raw,{provider,targetSlides:target,purpose:body.querySelector('#aiV10Purpose').value.trim(),audience:body.querySelector('#aiV10Audience').value.trim(),attempts:2});
        aiStatusV10(status,result.mode==='ai'?`AI 规划完成 · ${result.plan.actualSlides}/${target} 页 · 正在编译真实页面…`:`AI 未通过校验，已切换 deterministic fallback · ${result.fallbackReason}` ,result.mode==='ai'?'ok':'');
        const spec=Core.Planner.toDeckSpec(result.plan,{theme:body.querySelector('#aiV10Theme').value}),compiled=ComposerV99.compileDeck(spec,{theme:body.querySelector('#aiV10Theme').value,density:body.querySelector('#aiV10Density').value,mapLayout:body.querySelector('#aiV10Layout').value,uiTheme:data.uiTheme||'light'}),next=compiled.project,quality=ComposerV99.Quality.validateProject(next);
        if(!quality.ok)throw new Error(quality.errors[0]?.message||'Composer Quality Validator 未通过');
        if(!confirm(`将用 ${result.mode==='ai'?'DeepSeek AI':'本地 fallback'} 生成的 ${Core.Composer.describe(next).pages} 页替换当前项目。当前项目会先建立恢复备份，是否继续？`))return;
        checkpoint();createRecoveryBackup('before-deepseek-ai-compose');data=next;normalize();selectedNodeId=data.id;applyUiTheme();syncMapLayoutControls();save();renderMap();renderOrderPanel();fitAll();updateMobileNodeContext();removeSmartOverlay();toast(result.mode==='ai'?`DeepSeek 已生成 ${Core.Composer.describe(data).pages} 页可编辑演示`:`AI 不可用，已用本地规划生成 ${Core.Composer.describe(data).pages} 页`);
      }catch(err){console.error('MindDeck AI compose failed',err);aiStatusV10(status,'生成失败：'+aiErrorTextV10(err),'error')}
      finally{button.disabled=false}
    };
  }

  function aiElementSnapshotV10(element){
    if(!element)return null;
    if(element.type==='text')return {id:element.id,type:'text',text:String(element.text||'').slice(0,5000)};
    if(element.type==='chart'){const value=Core.NativeChart.normalize(element);return {id:element.id,type:'chart',chart:{chartType:value.chartType,categories:value.categories,labels:value.labels,values:value.values,series:value.series,options:value.options}}}
    if(element.type==='table')return {id:element.id,type:'table',table:Core.NativeTable.normalize(element)};
    if(element.type==='diagram')return {id:element.id,type:'diagram',diagram:Core.NativeDiagram.normalize(element)};
    return null;
  }
  function aiNodeSnapshotV10(node,elementFilter=null){
    const elements=(node?.slideElements||[]).filter(element=>!elementFilter||elementFilter.has(element.id)).map(aiElementSnapshotV10).filter(Boolean);
    return {id:node.id,title:String(node.title||'').slice(0,1500),text:String(node.text||'').slice(0,6000),role:node.composer?.role||node.deckRole||'',content:node.composer?.content?clone(node.composer.content):null,elements};
  }
  function aiContextV10(scope){
    if(scope==='selection'){
      if(!editorOpen||editorMode!=='slide'||!selectedEls.size)return {nodes:[]};const node=findNode(editorNodeId);return {projectTitle:data.title,nodes:[aiNodeSnapshotV10(node,new Set(selectedEls))]};
    }
    if(scope==='slide'){
      const node=editorOpen&&editorMode==='slide'?findNode(editorNodeId):findNode(selectedNodeId);return {projectTitle:data.title,nodes:node?[aiNodeSnapshotV10(node)]:[]};
    }
    const nodes=[];TreeCore.walkAll(data,node=>nodes.push(aiNodeSnapshotV10(node)));return {projectTitle:data.title,nodes:nodes.slice(0,60)};
  }
  function aiPatchPreviewHtmlV10(patch){
    const items=(patch.slidePatches||[]).map(slide=>{const node=findNode(slide.nodeId),types=(slide.elementPatches||[]).reduce((acc,item)=>(acc[item.type]=(acc[item.type]||0)+1,acc),{}),badges=Object.entries(types).map(([type,count])=>`<span class="ai-v10-badge">${esc(type)} × ${count}</span>`).join('');return `<div class="ai-v10-preview-item"><b>${esc(node?.title||slide.nodeId)}</b>${badges}${slide.title!==undefined?'<span class="ai-v10-badge">节点标题</span>':''}${slide.text!==undefined?'<span class="ai-v10-badge">节点正文</span>':''}${slide.redesign?'<span class="ai-v10-badge">重新设计</span>':''}</div>`}).join('');
    return `<div><b>${esc(patch.summary||'AI 修改建议')}</b><div style="margin-top:4px">共 ${patch.slidePatches?.length||0} 页受到影响。默认不改位置、尺寸、层级和样式。</div><div class="ai-v10-preview-list">${items||'<div class="ai-v10-preview-item">没有可应用的修改。</div>'}</div></div>`;
  }
  function aiValidateApplyV10(patch){
    for(const slide of patch.slidePatches||[]){const node=findNode(slide.nodeId);if(!node)throw new Error(`页面不存在：${slide.nodeId}`);for(const item of slide.elementPatches||[]){const element=(node.slideElements||[]).find(value=>value.id===item.elementId);if(!element)throw new Error(`元素不存在：${item.elementId}`);if(item.type==='chart'&&item.chart){const check=Core.NativeChart.validate(Core.NativeChart.normalize(item.chart));if(!check.ok)throw new Error(check.errors[0]?.message||'AI 图表数据无效')}if(item.type==='table'&&item.table){const check=Core.NativeTable.validate(item.table);if(!check.ok)throw new Error(check.errors[0]?.message||'AI 表格数据无效')}if(item.type==='diagram'&&item.diagram){const check=Core.NativeDiagram.validate(item.diagram);if(!check.ok)throw new Error(check.errors[0]?.message||'AI 图示数据无效')}}if(slide.redesign&&slide.content)Core.Composer.normalizeSlideContent(slide.content)}return true
  }
  function aiSyncStructuredContentV10(node,element){
    if(!node?.composer||!element)return;node.composer.content ||= {};
    if(element.type==='chart'){const value=Core.NativeChart.normalize(element);node.composer.content.chart={chartType:value.chartType,categories:value.categories.slice(),labels:value.labels.slice(),values:value.values.slice(),series:value.series.map(item=>({id:item.id,name:item.name,values:item.values.slice()})),options:{...value.options}}}
    else if(element.type==='table')node.composer.content.table=Core.NativeTable.normalize(element);
    else if(element.type==='diagram')node.composer.content.diagram=Core.NativeDiagram.normalize(element);
  }
  function aiApplyElementPatchV10(node,item){
    const element=(node.slideElements||[]).find(value=>value.id===item.elementId);if(!element)return;
    if(item.type==='text'&&item.text!==undefined)element.text=item.text;
    else if(item.type==='chart'&&item.chart){const value=Core.NativeChart.normalize(item.chart);element.chartType=value.chartType;element.categories=value.categories.slice();element.labels=value.labels.slice();element.values=value.values.slice();element.series=value.series.map(series=>({id:series.id,name:series.name,values:series.values.slice()}));element.options={...value.options};aiSyncStructuredContentV10(node,element)}
    else if(item.type==='table'&&item.table){const value=Core.NativeTable.normalize(item.table);element.columns=value.columns;element.header=value.header;element.rows=value.rows;element.style={...element.style,...value.style};aiSyncStructuredContentV10(node,element)}
    else if(item.type==='diagram'&&item.diagram){const value=Core.NativeDiagram.normalize(item.diagram);element.subtype=value.subtype;element.data=value.data;element.layout=value.layout;element.style={...element.style,...value.style};aiSyncStructuredContentV10(node,element)}
  }
  function aiApplyPatchV10(patch){
    aiValidateApplyV10(patch);checkpoint();
    for(const slide of patch.slidePatches||[]){
      const node=findNode(slide.nodeId);if(slide.title!==undefined)node.title=slide.title||node.title;if(slide.text!==undefined)node.text=slide.text;for(const item of slide.elementPatches||[])aiApplyElementPatchV10(node,item);
      if(slide.redesign?.enabled){
        if(!node.composer)throw new Error('当前页面不是 Composer 页面，不能自动重新设计');
        if(slide.content){const content=Core.Composer.normalizeSlideContent({...node.composer.content,...slide.content});node.composer.content=content;if(content.title)node.title=content.title;if(content.summary!==undefined)node.text=content.summary;node.points=(content.items||[]).map(item=>[item.value,item.unit,item.label,item.detail].filter(Boolean).join(' ')).filter(Boolean)}
        if(slide.redesign.designIntent)Core.Composer.applyDesignIntent({node,intent:slide.redesign.designIntent,role:slide.redesign.roleHint||node.composer.role,theme:node.deckTheme,density:node.deckDensity,force:true});
        else Core.Composer.relayoutNode(node,{role:slide.redesign.roleHint||node.composer.role,theme:node.deckTheme,density:node.deckDensity,force:true});
      }
    }
    normalize();save();if(editorOpen){renderEditor();updateMasterPanel()}else{renderMap();renderOrderPanel();fitAll()}return patch
  }

  function openAIEditorV10(){
    if(editorOpen&&editorMode==='master'){toast('AI 编辑暂不修改母版，请返回页面或思维导图');return}
    installAIAssistantStylesV10();aiPendingPatch=null;const hasSelection=editorOpen&&editorMode==='slide'&&selectedEls.size>0,dialog=makeOverlay('DeepSeek AI 编辑','选择作用范围后用自然语言修改真实文本、Native Chart、Table 或 Diagram。默认严格保留几何位置与样式。'),body=document.createElement('div');body.className='v99-smart-body';body.innerHTML=`<div class="v99-smart-card"><div class="ai-v10-grid-two"><div class="v99-smart-field"><label>作用范围</label><select id="aiV10Scope"><option value="selection" ${hasSelection?'selected':''} ${hasSelection?'':'disabled'}>当前选中元素${hasSelection?'':'（未选中）'}</option><option value="slide" ${hasSelection?'':'selected'}>当前页</option><option value="deck">整套 PPT</option></select></div><div class="v99-smart-field"><label>模型</label><select id="aiV10EditModel"><option value="fast" ${aiPresetV10()==='fast'?'selected':''}>V4 Flash · 快速</option><option value="quality" ${aiPresetV10()==='quality'?'selected':''}>V4 Pro · 高质量</option></select></div></div><div class="v99-smart-field"><label>DeepSeek API Key（仅本次会话）</label><div class="ai-v10-key-row"><input id="aiV10EditKey" type="password" autocomplete="off" placeholder="sk-..." value="${esc(aiReadKeyV10())}"></div></div><div class="v99-smart-field"><label>告诉 AI 怎么改</label><textarea id="aiV10Instruction" style="height:150px" placeholder="例如：把选中的柱状图改成折线图，保持数据不变并突出增长趋势。"></textarea></div><div class="ai-v10-inline-actions"><button class="ai-v10-chip" data-ai-prompt="精简文字，保留事实和结论，不改变含义。">精简</button><button class="ai-v10-chip" data-ai-prompt="把表达改成面向管理层的专业汇报语言，突出结论。">面向领导</button><button class="ai-v10-chip" data-ai-prompt="优化当前图表：保留真实数据，根据数据关系选择更合适的图表类型并提高可读性。">优化图表</button><button class="ai-v10-chip" data-ai-prompt="梳理当前内容的层级和结论，但保持所有元素的位置、尺寸和样式。">梳理内容</button></div><label class="chart-toggle" style="margin-top:12px"><input id="aiV10AllowRedesign" type="checkbox"><span>允许 AI 重新设计受影响页面（会重新套模板；默认关闭）</span></label><div class="ai-v10-status" id="aiV10EditStatus">等待指令</div><div class="v99-smart-preview" id="aiV10PatchPreview" style="display:none"></div></div><div class="v99-smart-actions"><button id="aiV10EditSettings" type="button">AI 设置</button><button id="aiV10EditCancel" type="button">取消</button><button id="aiV10PlanEdit" class="primary" type="button">生成修改建议</button><button id="aiV10ApplyEdit" class="primary" type="button" style="display:none">应用修改</button></div>`;dialog.appendChild(body);
    const scope=body.querySelector('#aiV10Scope'),model=body.querySelector('#aiV10EditModel'),keyInput=body.querySelector('#aiV10EditKey'),instruction=body.querySelector('#aiV10Instruction'),allowRedesign=body.querySelector('#aiV10AllowRedesign'),status=body.querySelector('#aiV10EditStatus'),preview=body.querySelector('#aiV10PatchPreview'),planBtn=body.querySelector('#aiV10PlanEdit'),applyBtn=body.querySelector('#aiV10ApplyEdit');
    body.querySelectorAll('[data-ai-prompt]').forEach(button=>button.onclick=()=>{instruction.value=button.dataset.aiPrompt;instruction.focus()});body.querySelector('#aiV10EditSettings').onclick=openAISettingsV10;body.querySelector('#aiV10EditCancel').onclick=removeSmartOverlay;
    planBtn.onclick=async()=>{const text=instruction.value.trim();if(!text){toast('请先输入修改要求');instruction.focus();return}let provider;try{aiWritePresetV10(model.value);const key=aiWriteKeyV10(keyInput.value);provider=aiProviderV10(model.value,key)}catch(err){aiStatusV10(status,aiErrorTextV10(err),'error');return}const context=aiContextV10(scope.value);if(!context.nodes.length){aiStatusV10(status,'当前范围没有可编辑内容','error');return}planBtn.disabled=true;applyBtn.style.display='none';preview.style.display='none';aiStatusV10(status,'DeepSeek 正在分析当前真实元素并生成安全 Patch…');try{const result=await Core.AICommand.plan({instruction:text,scope:scope.value,context,allowRedesign:allowRedesign.checked},{provider,attempts:2});aiPendingPatch=result.patch;preview.innerHTML=aiPatchPreviewHtmlV10(result.patch);preview.style.display='block';applyBtn.style.display='inline-flex';aiStatusV10(status,`修改建议已生成 · ${result.patch.slidePatches.length} 页 · 应用前不会改变项目`,'ok')}catch(err){console.error('MindDeck AI edit plan failed',err);aiStatusV10(status,'AI 编辑失败：'+aiErrorTextV10(err),'error')}finally{planBtn.disabled=false}};
    applyBtn.onclick=()=>{if(!aiPendingPatch)return;try{aiApplyPatchV10(aiPendingPatch);const count=aiPendingPatch.slidePatches.length;removeSmartOverlay();toast(`AI 修改已应用到 ${count} 页 · 可 Ctrl+Z 撤销`)}catch(err){aiStatusV10(status,'应用失败：'+aiErrorTextV10(err),'error')}};
  }

  function initAIAssistantV10(){
    installAIAssistantStylesV10();
    const host=document.querySelector('.desktop-project-tools');if(host&&!document.getElementById('aiV10SettingsBtn')){aiSettingsButton=document.createElement('button');aiSettingsButton.id='aiV10SettingsBtn';aiSettingsButton.className='btn ai-v10-setting-entry';aiSettingsButton.textContent='AI 设置';aiSettingsButton.title='DeepSeek API Key 仅保存到当前会话';aiSettingsButton.onclick=openAISettingsV10;host.prepend(aiSettingsButton)}
    if(smartComposeButton){smartComposeButton.textContent='AI 组稿';smartComposeButton.title='使用 DeepSeek 规划 DeckPlan，再由 Composer 生成真正可编辑演示';smartComposeButton.onclick=openAISmartComposerV10}
    if(smartMobileButton){smartMobileButton.textContent='AI';smartMobileButton.title='DeepSeek AI 组稿';smartMobileButton.onclick=openAISmartComposerV10}
    const editorTools=document.querySelector('.editor-topbar .element-toolbar');if(editorTools&&!document.getElementById('aiV10EditorBtn')){aiEditorButton=document.createElement('button');aiEditorButton.id='aiV10EditorBtn';aiEditorButton.className='btn';aiEditorButton.textContent='✦ AI 编辑';aiEditorButton.title='修改选中元素、当前页或整套 PPT';aiEditorButton.onclick=openAIEditorV10;editorTools.appendChild(aiEditorButton)}
  }
  window.addEventListener('keydown',event=>{if(!(event.ctrlKey||event.metaKey)||String(event.key).toLowerCase()!=='k')return;if(document.activeElement&&(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)||document.activeElement.isContentEditable))return;event.preventDefault();event.stopImmediatePropagation();openAIEditorV10()});
  setTimeout(initAIAssistantV10,0);
