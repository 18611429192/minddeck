

  // V10 native chart content editor. This turns chart elements into real editable data,
  // and keeps node.composer.content.chart in sync so template/design-intent recompiles
  // preserve the user's chart edits instead of restoring the generated source data.
  const ChartEditorV10=Object.freeze({
    types:Core.NativeChart.types,
    specialTypes:new Set(['donut','funnel','waterfall'])
  });
  const showPropertyPanelBaseV10=showPropertyPanel;

  function installChartEditorStylesV10(){
    if(document.getElementById('minddeck-v10-chart-editor-styles'))return;
    const style=document.createElement('style');
    style.id='minddeck-v10-chart-editor-styles';
    style.textContent=`
      .chart-editor-v10{display:grid;gap:12px}.chart-editor-v10 .chart-section{border-top:1px solid rgba(128,138,160,.16);padding-top:12px}.chart-editor-v10 .chart-section:first-child{border-top:0;padding-top:0}
      .chart-editor-v10 .chart-section-head{display:flex;align-items:center;gap:8px;margin-bottom:8px}.chart-editor-v10 .chart-section-head b{font-size:12px}.chart-editor-v10 .chart-section-head .spacer{flex:1}
      .chart-editor-v10 .chart-mini-btn{height:30px;padding:0 9px;border:1px solid rgba(128,138,160,.24);border-radius:9px;background:transparent;color:inherit;font-size:11px;font-weight:700;cursor:pointer}.chart-editor-v10 .chart-mini-btn.danger{color:#b64d38}.chart-editor-v10 .chart-mini-btn:disabled{opacity:.4;cursor:not-allowed}
      .chart-editor-v10 .chart-data-wrap{overflow:auto;border:1px solid rgba(128,138,160,.18);border-radius:12px;max-height:330px}.chart-editor-v10 table{width:max-content;min-width:100%;border-collapse:collapse;font-size:11px}.chart-editor-v10 th,.chart-editor-v10 td{padding:6px;border-right:1px solid rgba(128,138,160,.12);border-bottom:1px solid rgba(128,138,160,.12);vertical-align:middle}.chart-editor-v10 tr:last-child td{border-bottom:0}.chart-editor-v10 th:last-child,.chart-editor-v10 td:last-child{border-right:0}.chart-editor-v10 th{position:sticky;top:0;background:var(--panel,#fff);z-index:2;text-align:left;font-weight:800;min-width:112px}.chart-editor-v10 th:first-child{left:0;z-index:3;min-width:118px}.chart-editor-v10 td:first-child{position:sticky;left:0;background:var(--panel,#fff);z-index:1}.chart-editor-v10 input[type="text"],.chart-editor-v10 input[type="number"],.chart-editor-v10 select{width:100%;box-sizing:border-box;min-width:94px;height:31px;border:1px solid rgba(128,138,160,.22);border-radius:8px;background:var(--input,#fff);color:inherit;padding:0 7px}.chart-editor-v10 input:focus,.chart-editor-v10 select:focus{outline:none;border-color:#6374ff;box-shadow:0 0 0 2px rgba(99,116,255,.10)}
      .chart-editor-v10 .chart-series-head{display:flex;align-items:center;gap:6px}.chart-editor-v10 .chart-series-head input{min-width:108px}.chart-editor-v10 .chart-row-actions{white-space:nowrap;text-align:center;min-width:42px}.chart-editor-v10 .chart-icon-btn{width:27px;height:27px;border:0;border-radius:8px;background:rgba(128,138,160,.11);color:inherit;cursor:pointer}.chart-editor-v10 .chart-icon-btn:hover{background:rgba(216,95,69,.12);color:#b64d38}
      .chart-editor-v10 .chart-options-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.chart-editor-v10 .chart-toggle{display:flex;align-items:center;gap:7px;min-height:32px;padding:0 8px;border:1px solid rgba(128,138,160,.16);border-radius:9px;font-size:11px}.chart-editor-v10 .chart-toggle input{width:auto}.chart-editor-v10 .chart-editor-note{font-size:10.5px;line-height:1.5;color:var(--muted,#737b8b)}
      @media(max-width:700px){.chart-editor-v10 .chart-options-grid{grid-template-columns:1fr}.chart-editor-v10 .chart-data-wrap{max-height:260px}}
    `;
    document.head.appendChild(style);
  }

  function chartDataCloneV10(e){
    const normalized=Core.NativeChart.normalize(e||{});
    return {
      chartType:normalized.chartType,
      categories:normalized.categories.slice(),
      labels:normalized.labels.slice(),
      values:normalized.values.slice(),
      series:normalized.series.map(series=>({id:series.id,name:series.name,values:series.values.slice()})),
      options:{...normalized.options}
    };
  }

  function chartAssignNormalizedV10(e,dataValue){
    const normalized=Core.NativeChart.normalize(dataValue||{});
    e.chartType=normalized.chartType;
    e.categories=normalized.categories.slice();
    e.labels=normalized.labels.slice();
    e.values=normalized.values.slice();
    e.series=normalized.series.map(series=>({id:series.id,name:series.name,values:series.values.slice()}));
    e.options={...normalized.options};
    return normalized;
  }

  function chartSyncComposerContentV10(e){
    if(editorMode!=='slide')return;
    const node=findNode(editorNodeId);if(!node)return;
    node.composer ||= {};
    node.composer.content ||= {};
    const normalized=Core.NativeChart.normalize(e);
    node.composer.content.chart={
      chartType:normalized.chartType,
      categories:normalized.categories.slice(),
      labels:normalized.labels.slice(),
      values:normalized.values.slice(),
      series:normalized.series.map(series=>({id:series.id,name:series.name,values:series.values.slice()})),
      options:{...normalized.options}
    };
  }

  function chartRenderElementV10(e){
    const old=[...editorStage.querySelectorAll('.canvas-el')].find(item=>item.dataset.id===e.id);if(!old)return;
    const isMaster=old.dataset.master==='1';
    const next=renderCanvasElement(e,isMaster,!isMaster||editorMode==='master');
    old.replaceWith(next);
    updateSelectionVisual();
  }

  function chartCommitV10(e,dataValue,{rerender=true,refreshPanel=false}={}){
    const normalized=chartAssignNormalizedV10(e,dataValue),check=Core.NativeChart.validate(normalized);
    if(!check.ok){toast('图表数据无效：'+(check.errors[0]?.message||'请检查数据'));return false}
    chartSyncComposerContentV10(e);
    save();
    if(rerender)chartRenderElementV10(e);
    if(refreshPanel)showChartPropertyPanelV10(e.id);
    return true;
  }

  function chartTypeLabelV10(type){
    return ({bar:'柱状图',line:'折线图',area:'面积图',donut:'环形图',radar:'雷达图',funnel:'漏斗图',waterfall:'瀑布图'})[type]||type;
  }

  function chartBoolControlV10(field,label,value){return `<label class="chart-toggle"><input type="checkbox" data-chart-option="${field}" ${value?'checked':''}><span>${esc(label)}</span></label>`}

  function chartDataTableV10(dataValue){
    const special=ChartEditorV10.specialTypes.has(dataValue.chartType),series=special?dataValue.series.slice(0,1):dataValue.series;
    const header=series.map((item,index)=>`<th><div class="chart-series-head"><input type="text" value="${esc(item.name)}" data-chart-series-name="${index}" aria-label="系列 ${index+1} 名称">${!special&&series.length>1?`<button type="button" class="chart-icon-btn" data-chart-action="remove-series" data-series-index="${index}" title="删除系列">×</button>`:''}</div></th>`).join('');
    const rows=dataValue.categories.map((category,rowIndex)=>`<tr><td><input type="text" value="${esc(category)}" data-chart-category="${rowIndex}" aria-label="分类 ${rowIndex+1}"></td>${series.map((item,seriesIndex)=>`<td><input type="number" step="any" value="${Number(item.values[rowIndex]??0)}" data-chart-value-row="${rowIndex}" data-chart-value-series="${seriesIndex}" aria-label="${esc(item.name)} ${esc(category)}"></td>`).join('')}<td class="chart-row-actions"><button type="button" class="chart-icon-btn" data-chart-action="remove-point" data-row-index="${rowIndex}" title="删除数据点">×</button></td></tr>`).join('');
    return `<div class="chart-data-wrap"><table><thead><tr><th>分类 / X 轴</th>${header}<th class="chart-row-actions">操作</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function showChartPropertyPanelV10(id){
    const e=findEditorEl(id);if(!e||e.type!=='chart')return showPropertyPanelBaseV10(id);
    installChartEditorStylesV10();
    chartAssignNormalizedV10(e,e);
    propPanel.classList.add('open');masterEmptyPanel.classList.remove('open');
    document.getElementById('propTitle').textContent='图表属性';
    const d=chartDataCloneV10(e),special=ChartEditorV10.specialTypes.has(d.chartType),anim=e.animation||{type:'inherit',delay:0,duration:.5};
    const common=`<div class="prop-row"><div class="field"><label>X</label><input type="number" data-p="x" value="${Math.round(e.x)}"></div><div class="field"><label>Y</label><input type="number" data-p="y" value="${Math.round(e.y)}"></div><div class="field"><label>宽</label><input type="number" data-p="w" value="${Math.round(e.w)}"></div><div class="field"><label>高</label><input type="number" data-p="h" value="${Math.round(e.h)}"></div></div>`;
    const typeOptions=ChartEditorV10.types.map(type=>`<option value="${type}" ${type===d.chartType?'selected':''}>${chartTypeLabelV10(type)}</option>`).join('');
    const animOptions=animTypes.map(([v,t])=>`<option value="${v}" ${v===anim.type?'selected':''}>${t}</option>`).join('');
    propContent.innerHTML=common+`<div class="chart-editor-v10">
      <div class="chart-section"><div class="field"><label>图表类型</label><select data-chart-type>${typeOptions}</select></div><div class="chart-editor-note">切换图表类型不会丢数据。环形图、漏斗图和瀑布图使用第一个系列作为主数据。</div></div>
      <div class="chart-section"><div class="chart-section-head"><b>数据</b><div class="spacer"></div><button type="button" class="chart-mini-btn" data-chart-action="add-point">+ 数据点</button><button type="button" class="chart-mini-btn" data-chart-action="add-series" ${special?'disabled title="当前图表类型只使用一个主系列"':''}>+ 系列</button></div>${chartDataTableV10(d)}</div>
      <div class="chart-section"><div class="chart-section-head"><b>显示选项</b></div><div class="chart-options-grid">${chartBoolControlV10('showLegend','图例',d.options.showLegend)}${chartBoolControlV10('showLabels','分类标签',d.options.showLabels)}${chartBoolControlV10('showValues','数值标签',d.options.showValues)}${chartBoolControlV10('showGrid','网格线',d.options.showGrid)}${chartBoolControlV10('smooth','平滑曲线',d.options.smooth)}${chartBoolControlV10('stacked','堆叠',d.options.stacked)}</div></div>
      <div class="chart-section"><div class="field"><label>方向</label><select data-chart-orientation><option value="vertical" ${d.options.orientation==='vertical'?'selected':''}>纵向</option><option value="horizontal" ${d.options.orientation==='horizontal'?'selected':''}>横向</option></select></div></div>
    </div><div class="field" style="margin-top:18px;padding-top:14px;border-top:1px solid #edf0f4"><label>这个元素的动画</label><select data-p="animType">${animOptions}</select></div><div class="prop-row"><div class="field"><label>延迟（秒）</label><input type="number" min="0" max="10" step="0.1" data-p="animDelay" value="${Number(anim.delay)||0}"></div><div class="field"><label>时长（秒）</label><input type="number" min="0.1" max="5" step="0.1" data-p="animDuration" value="${Number(anim.duration)||.5}"></div></div><div class="small-note">图表数据修改会同时写回页面源数据；之后重新选择设计意图或模板方案，不会恢复成旧数据。</div>`;

    propContent.querySelectorAll('[data-p]').forEach(inp=>{
      inp.addEventListener('focus',()=>checkpoint(),{once:true});
      inp.addEventListener('input',()=>applyPropChange(e,inp.dataset.p,inp.value));
      inp.addEventListener('change',()=>applyPropChange(e,inp.dataset.p,inp.value));
      inp.addEventListener('blur',()=>save());
    });
    propContent.querySelector('[data-chart-type]').addEventListener('focus',()=>checkpoint(),{once:true});
    propContent.querySelector('[data-chart-type]').addEventListener('change',event=>{
      const next=chartDataCloneV10(e);next.chartType=event.target.value;
      chartCommitV10(e,next,{refreshPanel:true});
    });
    propContent.querySelectorAll('[data-chart-category]').forEach(input=>{
      input.addEventListener('focus',()=>checkpoint(),{once:true});
      input.addEventListener('change',()=>{const next=chartDataCloneV10(e),index=Number(input.dataset.chartCategory);next.categories[index]=input.value.trim()||`Item ${index+1}`;next.labels=next.categories.slice();chartCommitV10(e,next)});
    });
    propContent.querySelectorAll('[data-chart-series-name]').forEach(input=>{
      input.addEventListener('focus',()=>checkpoint(),{once:true});
      input.addEventListener('change',()=>{const next=chartDataCloneV10(e),index=Number(input.dataset.chartSeriesName);if(next.series[index])next.series[index].name=input.value.trim()||`Series ${index+1}`;chartCommitV10(e,next)});
    });
    propContent.querySelectorAll('[data-chart-value-row]').forEach(input=>{
      input.addEventListener('focus',()=>checkpoint(),{once:true});
      input.addEventListener('change',()=>{const value=Number(input.value);if(!Number.isFinite(value)){toast('图表数值必须是有效数字');showChartPropertyPanelV10(e.id);return}const next=chartDataCloneV10(e),row=Number(input.dataset.chartValueRow),seriesIndex=Number(input.dataset.chartValueSeries);if(next.series[seriesIndex])next.series[seriesIndex].values[row]=value;next.values=(next.series[0]?.values||[]).slice();chartCommitV10(e,next)});
    });
    propContent.querySelectorAll('[data-chart-option]').forEach(input=>{
      input.addEventListener('change',()=>{checkpoint();const next=chartDataCloneV10(e);next.options[input.dataset.chartOption]=input.checked;chartCommitV10(e,next)});
    });
    propContent.querySelector('[data-chart-orientation]').addEventListener('change',event=>{checkpoint();const next=chartDataCloneV10(e);next.options.orientation=event.target.value;chartCommitV10(e,next)});
    propContent.querySelectorAll('[data-chart-action]').forEach(button=>button.addEventListener('click',()=>{
      const action=button.dataset.chartAction,next=chartDataCloneV10(e);checkpoint();
      if(action==='add-point'){
        const index=next.categories.length;next.categories.push(`Item ${index+1}`);next.labels=next.categories.slice();next.series.forEach(series=>series.values.push(0));next.values=(next.series[0]?.values||[]).slice();
      }else if(action==='remove-point'){
        const index=Number(button.dataset.rowIndex);if(next.categories.length<=1){toast('图表至少保留一个数据点');return}next.categories.splice(index,1);next.labels=next.categories.slice();next.series.forEach(series=>series.values.splice(index,1));next.values=(next.series[0]?.values||[]).slice();
      }else if(action==='add-series'){
        if(ChartEditorV10.specialTypes.has(next.chartType)){toast('当前图表类型只使用一个主系列');return}const index=next.series.length;next.series.push({id:`series-${index+1}`,name:`Series ${index+1}`,values:Array(next.categories.length).fill(0)});
      }else if(action==='remove-series'){
        const index=Number(button.dataset.seriesIndex);if(next.series.length<=1){toast('图表至少保留一个系列');return}next.series.splice(index,1);next.values=(next.series[0]?.values||[]).slice();
      }else return;
      chartCommitV10(e,next,{refreshPanel:true});
    }));
  }

  showPropertyPanel=function showPropertyPanelWithChartV10(id){
    const e=findEditorEl(id);
    if(e?.type==='chart')return showChartPropertyPanelV10(id);
    return showPropertyPanelBaseV10(id);
  };

  installChartEditorStylesV10();
