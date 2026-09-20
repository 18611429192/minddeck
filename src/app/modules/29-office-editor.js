
  // Office-style editor shell and high-frequency editing tools.
  const OFFICE_FALLBACK_FONTS=['Microsoft YaHei','SimSun','SimHei','KaiTi','Segoe UI','Arial','Calibri','Aptos','Georgia','Times New Roman','Courier New'];
  let officeFontsLoaded=false,officeRefreshTimer=null,officeActiveTab='home';

  function officeFlatNodes(){const rows=[];TreeCore.walkAll(data,(node,parent,depth)=>rows.push({node,parent,depth}));return rows}
  function officeSelectedElements(){return [...selectedEls].map(findEditorEl).filter(Boolean)}
  function officeApplySelection(mutator,message){
    const items=officeSelectedElements();if(!items.length){toast('请先选择元素');return}
    if(items.some(item=>item.locked)){toast('请先解锁所选元素');return}
    checkpoint();items.forEach(mutator);save();renderEditor();if(message)toast(message)
  }
  function officeSetTab(name){
    officeActiveTab=name;
    document.querySelectorAll('.office-tab').forEach(button=>button.classList.toggle('active',button.dataset.officeTab===name));
    document.querySelectorAll('.office-ribbon-panel').forEach(panel=>panel.classList.toggle('active',panel.dataset.officePanel===name));
  }
  async function officeLoadLocalFonts(){
    if(officeFontsLoaded)return;
    let names=OFFICE_FALLBACK_FONTS.slice();
    if(typeof window.queryLocalFonts==='function'){
      try{const fonts=await window.queryLocalFonts();names.push(...fonts.map(font=>font.family).filter(Boolean))}
      catch(err){if(err?.name!=='NotAllowedError')console.warn('Local font discovery failed',err)}
    }
    names=[...new Set(names)].sort((a,b)=>a.localeCompare(b));
    const list=document.getElementById('officeFontFamilies');if(list)list.innerHTML=names.map(name=>`<option value="${esc(name)}"></option>`).join('');
    officeFontsLoaded=true;
  }
  function officeSyncControls(){
    const items=officeSelectedElements(),one=items.length===1?items[0]:null,texts=items.filter(item=>item.type==='text');
    const font=document.getElementById('officeFontFamily'),size=document.getElementById('officeFontSize'),bold=document.getElementById('officeBoldBtn'),lock=document.getElementById('officeLockBtn');
    if(font){font.disabled=!texts.length;if(one?.type==='text'&&document.activeElement!==font)font.value=one.fontFamily||'Microsoft YaHei'}
    if(size){size.disabled=!texts.length;if(one?.type==='text'&&document.activeElement!==size)size.value=one.fontSize||32}
    if(bold){bold.disabled=!texts.length;bold.classList.toggle('active',!!texts.length&&texts.every(item=>(Number(item.fontWeight)||400)>=700))}
    if(lock){lock.disabled=!items.length;lock.classList.toggle('active',!!items.length&&items.every(item=>item.locked));lock.querySelector('span').textContent=items.length&&items.every(item=>item.locked)?'解锁':'锁定'}
    document.getElementById('officeGroupBtn').disabled=items.length<2;
    document.getElementById('officeUngroupBtn').disabled=!items.some(item=>item.groupId);
    document.getElementById('officeGridBtn')?.classList.toggle('active',!!editorSettings().gridVisible);
    document.getElementById('officeSnapBtn')?.classList.toggle('active',!!editorSettings().snapToGrid);
    const animation=document.getElementById('officeAnimationType'),delay=document.getElementById('officeAnimationDelay');
    if(animation){animation.disabled=!items.length;if(one)animation.value=one.animation?.type==='inherit'?'none':(one.animation?.type||'none')}
    if(delay){delay.disabled=!items.length;if(one)delay.value=Math.round((Number(one.animation?.delay)||0)*1000)}
  }
  function officeScheduleRefresh(){clearTimeout(officeRefreshTimer);officeRefreshTimer=setTimeout(()=>{if(editorOpen){officeRenderThumbnails();officeUpdateStatus()}},180)}
  function officeRenderThumbnailStage(host,node){
    const stage=document.createElement('div');stage.className='office-thumb-stage';
    SlideCore.render(stage,data,node,{elementOptions:{baseClass:'el',animate:false,videoControls:false,videoAutoplay:false,playAutoplay:false}});host.appendChild(stage);
  }
  function officeRenderThumbnails(){
    const list=document.getElementById('editorThumbnailList');if(!list)return;
    const rows=officeFlatNodes();list.innerHTML='';
    rows.forEach(({node,depth},index)=>{
      const item=document.createElement('div');item.className='office-thumb'+(node.id===editorNodeId?' active':'')+(node.id===data.id?' root':'');item.dataset.nodeId=node.id;item.dataset.depth=depth;item.style.setProperty('--thumb-depth',Math.min(depth,5));item.draggable=node.id!==data.id;
      const number=document.createElement('span');number.className='office-thumb-index';number.textContent=String(index+1);
      const frame=document.createElement('div');frame.className='office-thumb-frame';officeRenderThumbnailStage(frame,node);
      const title=document.createElement('div');title.className='office-thumb-title';title.innerHTML=`<span class="office-thumb-depth">${depth?'└':'◆'}</span>${esc(node.title||'未命名页面')}`;
      item.append(number,frame,title);item.onclick=()=>{if(node.id!==editorNodeId)openEditor('slide',node.id)};
      item.ondragstart=event=>{event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/minddeck-node',node.id);item.classList.add('dragging')};
      item.ondragend=()=>item.classList.remove('dragging');
      item.ondragover=event=>{event.preventDefault();event.dataTransfer.dropEffect='move';item.classList.add('drag-over')};
      item.ondragleave=()=>item.classList.remove('drag-over');
      item.ondrop=event=>{event.preventDefault();item.classList.remove('drag-over');officeDropThumbnail(event,node.id)};
      list.appendChild(item);
    });
  }
  function officeDropThumbnail(event,targetId){
    const movedId=event.dataTransfer.getData('text/minddeck-node');if(!movedId||movedId===targetId||movedId===data.id)return;
    const target=event.currentTarget,targetDepth=Number(target.dataset.depth)||0,listRect=document.getElementById('editorThumbnailList').getBoundingClientRect();
    const desiredDepth=Math.max(1,Math.round((event.clientX-listRect.left-35)/11));
    let parent,index;
    if(desiredDepth>targetDepth){parent=findNode(targetId);index=parent?.children?.length??0}
    else{
      let anchor=findNode(targetId);while(anchor&&officeFlatNodes().find(row=>row.node.id===anchor.id)?.depth>desiredDepth)anchor=TreeCore.findParent(data,anchor.id);
      if(!anchor)anchor=findNode(targetId);
      parent=TreeCore.findParent(data,anchor.id)||data;
      const anchorIndex=parent.children.findIndex(child=>child.id===anchor.id);const after=event.clientY>target.getBoundingClientRect().top+target.offsetHeight/2;index=anchorIndex+(after?1:0);
    }
    if(!parent)return;checkpoint();const result=CommandsCore.moveNode(data,movedId,parent.id,index);if(!result.ok){toast('无法移动到该层级');return}
    save();renderMap();renderOrderPanel();officeRenderThumbnails();officeUpdateStatus();toast('页面顺序与层级已更新')
  }
  function officeUpdateStatus(){
    const rows=officeFlatNodes(),index=Math.max(0,rows.findIndex(row=>row.node.id===editorNodeId));
    const status=document.getElementById('officeSlideStatus');if(status)status.textContent=editorMode==='master'?`母版 · ${rows.length} 张页面`:`第 ${index+1} 张，共 ${rows.length} 张`;
    const percent=Math.round(editorScale/Math.max(.001,editorFitScale)*100);const value=document.getElementById('officeZoomValue'),range=document.getElementById('officeZoomRange');if(value)value.textContent=percent+'%';if(range&&document.activeElement!==range)range.value=Math.max(50,Math.min(400,percent));
  }
  function openNativeChartDialogV10(){
    if(editorMode!=='slide'){toast('图表只能插入普通页面');return}
    const dialog=makeOverlay('插入图表','选择图表类型；插入后可在右侧面板直接编辑真实数据。');dialog.classList.add('office-chart-dialog');
    const types=[['bar','柱状图','▥'],['line','折线图','⌁'],['area','面积图','◩'],['donut','环形图','◉'],['radar','雷达图','◇'],['funnel','漏斗图','▽'],['waterfall','瀑布图','▤']];
    const grid=document.createElement('div');grid.className='office-chart-grid';grid.innerHTML=types.map(([value,label,icon])=>`<button type="button" data-chart-type="${value}"><b>${icon}</b><span>${label}</span></button>`).join('');dialog.appendChild(grid);
    grid.querySelectorAll('button').forEach(button=>button.onclick=()=>{const element=insertNativeChartV10(button.dataset.chartType);if(element)removeSmartOverlay()});
  }
  function openOfficePagesSheet(){
    if(!isMobileEditor())return;mobilePropOpen=false;propPanel.classList.remove('open');
    const sheet=document.getElementById('mobileActionSheet'),title=document.getElementById('mobileSheetTitle'),box=document.getElementById('mobileSheetContent');title.textContent='页面';
    box.innerHTML=`<div class="office-mobile-pages">${officeFlatNodes().map(({node,depth},i)=>`<button data-page-id="${node.id}" class="${node.id===editorNodeId?'active':''}" style="padding-left:${12+depth*14}px"><span>${i+1}</span>${esc(node.title||'未命名页面')}</button>`).join('')}</div>`;sheet.classList.add('open');
    box.querySelectorAll('[data-page-id]').forEach(button=>button.onclick=()=>{openEditor('slide',button.dataset.pageId);closeMobileEditorSheet()});
  }

  function initOfficeEditor(){
    document.querySelectorAll('.office-tab').forEach(button=>button.onclick=()=>officeSetTab(button.dataset.officeTab));
    document.getElementById('officeUndoBtn').onclick=undo;document.getElementById('officeRedoBtn').onclick=redo;
    document.getElementById('officeCutBtn').onclick=cutSelectedElements;document.getElementById('officeCopyBtn').onclick=copySelectedElements;document.getElementById('officePasteBtn').onclick=pasteElements;
    document.getElementById('officeGroupBtn').onclick=groupSelectedElements;document.getElementById('officeUngroupBtn').onclick=ungroupSelectedElements;document.getElementById('officeLockBtn').onclick=()=>toggleSelectedLock();
    const font=document.getElementById('officeFontFamily');font.onfocus=officeLoadLocalFonts;font.onchange=()=>officeApplySelection(item=>{if(item.type==='text')item.fontFamily=font.value.trim()||'Microsoft YaHei'},'字体已更新');
    const size=document.getElementById('officeFontSize');size.onchange=()=>officeApplySelection(item=>{if(item.type==='text')item.fontSize=Math.max(8,Math.min(240,Number(size.value)||32))});
    document.getElementById('officeBoldBtn').onclick=()=>{const items=officeSelectedElements().filter(item=>item.type==='text'),makeBold=!items.every(item=>(Number(item.fontWeight)||400)>=700);officeApplySelection(item=>{if(item.type==='text')item.fontWeight=makeBold?700:400})};
    document.getElementById('officeInsertChartBtn').onclick=openNativeChartDialogV10;
    document.getElementById('officeGridBtn').onclick=()=>{checkpoint();editorSettings().gridVisible=!editorSettings().gridVisible;save();renderEditor()};
    document.getElementById('officeSnapBtn').onclick=()=>{checkpoint();editorSettings().snapToGrid=!editorSettings().snapToGrid;save();officeSyncControls();toast(editorSettings().snapToGrid?'已开启网格吸附':'已关闭网格吸附')};
    document.getElementById('officeAnimationType').onchange=event=>officeApplySelection(item=>{item.animation ||= {};item.animation.type=event.target.value});
    document.getElementById('officeAnimationDelay').onchange=event=>officeApplySelection(item=>{item.animation ||= {};item.animation.delay=Math.max(0,Number(event.target.value)||0)/1000});
    document.getElementById('officeThumbsCollapse').onclick=()=>{editorShell.classList.toggle('thumbs-collapsed');setTimeout(()=>fitEditorStage(false),180)};
    document.getElementById('officeFitBtn').onclick=()=>{resetEditorView();officeUpdateStatus()};document.getElementById('officeZoomOut').onclick=()=>{setEditorZoom(editorScale/1.12);officeUpdateStatus()};document.getElementById('officeZoomIn').onclick=()=>{setEditorZoom(editorScale*1.12);officeUpdateStatus()};
    document.getElementById('officeZoomRange').oninput=event=>{setEditorZoom(editorFitScale*(Number(event.target.value)||100)/100);officeUpdateStatus()};
    const mobilePages=document.getElementById('mobileLayerBtn');if(mobilePages){mobilePages.querySelector('.ico').textContent='▤';mobilePages.querySelector('span:last-child').textContent='页面'}
    setTimeout(()=>{const designer=document.getElementById('v99PageDesignerBtn'),ai=document.getElementById('aiV10EditorBtn');if(designer)document.getElementById('officeDesignerHost')?.replaceWith(designer);if(ai)document.getElementById('officeAiHost')?.prepend(ai)},250);
  }

  const officeOpenEditorBase=openEditor;openEditor=function(...args){const result=officeOpenEditorBase(...args);officeSetTab(officeActiveTab);officeRenderThumbnails();officeUpdateStatus();officeSyncControls();return result};
  const officeRenderEditorBase=renderEditor;renderEditor=function(...args){const result=officeRenderEditorBase(...args);officeSyncControls();officeScheduleRefresh();return result};
  const officeRefreshSelectionBase=refreshSelectionUI;refreshSelectionUI=function(...args){const result=officeRefreshSelectionBase(...args);officeSyncControls();return result};
  const officeSaveBase=save;save=function(...args){const result=officeSaveBase(...args);if(editorOpen)officeScheduleRefresh();return result};
  initOfficeEditor();
