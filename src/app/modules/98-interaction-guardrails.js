

  // V10 interaction guardrails for controls that share the map/editor chrome.
  // These aliases restore the editor's element factories after the V10 module split.
  // The actual normalization/rendering contract still belongs to the Shared Runtime.
  const baseText=()=>({
    id:uid(),type:'text',x:220,y:180,w:760,h:140,z:SLIDE_Z_MIN,
    text:'双击编辑文字',fontSize:42,fontWeight:700,color:'#1f2329',textAlign:'left',
    animation:{type:'inherit',delay:0,duration:.5}
  });
  const baseShape=(shape='rect')=>({
    id:uid(),type:'shape',shape,x:340,y:280,w:420,h:240,z:SLIDE_Z_MIN,
    fill:'#edf2ff',borderColor:'#b8c5ff',borderWidth:2,radius:shape==='circle'?999:24,
    animation:{type:'inherit',delay:0,duration:.5}
  });

  const exportResetButton=document.getElementById('resetExportSettingsBtn');
  exportResetButton?.addEventListener('click',()=>setTimeout(()=>{
    document.getElementById('exportSettingsPanel')?.classList.add('open');
  },0));

  // Desktop close buttons collapse side panels by leaving `open` in place and adding
  // `panel-collapsed` (pointer-events:none). Explicitly opening a tool again must clear
  // that collapsed state; otherwise the panel is visible after `.open` is added again,
  // but every control inside it remains untouchable.
  function prepareMapPanelOpen(panelId){
    const panel=document.getElementById(panelId);
    if(!panel)return;
    panel.classList.remove('panel-collapsed');
    document.getElementById('panelRestoreHandle')?.classList.remove('open');
    activeCollapsedMapPanelId=null;
  }
  const openHealthPanelBase=openHealthPanel;
  openHealthPanel=function(...args){prepareMapPanelOpen('healthPanel');return openHealthPanelBase(...args)};
  const openThemePanelBase=openThemePanel;
  openThemePanel=function(...args){prepareMapPanelOpen('themePanel');return openThemePanelBase(...args)};
  const assertProjectExportReadyBase=assertProjectExportReady;
  assertProjectExportReady=function(...args){
    try{return assertProjectExportReadyBase(...args)}
    catch(err){
      if(document.getElementById('healthPanel')?.classList.contains('open'))prepareMapPanelOpen('healthPanel');
      throw err;
    }
  };

  const interactionGuardStyle=document.createElement('style');
  interactionGuardStyle.id='minddeck-v10-interaction-guardrails';
  interactionGuardStyle.textContent=`
    #v99SmartMobileBtn{z-index:100!important}
    #v99SmartMobileBtn.v10-smart-mobile-hidden{display:none!important}
  `;
  document.head.appendChild(interactionGuardStyle);

  function syncSmartMobileEntry(){
    const button=document.getElementById('v99SmartMobileBtn');
    if(!button)return;
    const blocked=document.getElementById('mobileNodeContext')?.classList.contains('open')||
      document.getElementById('editorShell')?.classList.contains('open')||
      document.body.classList.contains('presentation-mode');
    button.classList.toggle('v10-smart-mobile-hidden',!!blocked);
  }
  const interactionGuardObserver=new MutationObserver(syncSmartMobileEntry);
  [document.getElementById('mobileNodeContext'),document.getElementById('editorShell')].filter(Boolean).forEach(target=>interactionGuardObserver.observe(target,{attributes:true,attributeFilter:['class']}));
  interactionGuardObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
  setTimeout(syncSmartMobileEntry,0);

  // Mobile insertions used to land at the exact same center point, making the most recent
  // shape intercept taps intended for the previously inserted element. Pick the least-
  // overlapping slot after insertion while keeping every element inside the 1600×900 stage.
  function elementOverlapArea(a,b){
    const left=Math.max(a.x,b.x),top=Math.max(a.y,b.y),right=Math.min(a.x+a.w,b.x+b.w),bottom=Math.min(a.y+a.h,b.y+b.h);
    return Math.max(0,right-left)*Math.max(0,bottom-top);
  }
  function placeMobileInsertedElement(element,elements){
    if(!element)return;
    const offsets=[{x:0,y:-190},{x:0,y:190},{x:-350,y:20},{x:350,y:20},{x:-300,y:-210},{x:300,y:-210}];
    const others=(elements||[]).filter(item=>item!==element),margin=24;
    let best=null;
    for(const offset of offsets){
      const maxX=Math.max(margin,W-element.w-margin),maxY=Math.max(margin,H-element.h-margin);
      const x=Math.max(margin,Math.min(maxX,Math.round((W-element.w)/2+offset.x)));
      const y=Math.max(margin,Math.min(maxY,Math.round((H-element.h)/2+offset.y)));
      const box={x,y,w:element.w,h:element.h};
      const overlap=others.reduce((sum,item)=>sum+elementOverlapArea(box,{x:Number(item.x)||0,y:Number(item.y)||0,w:Number(item.w)||0,h:Number(item.h)||0}),0);
      const score=overlap+Math.hypot(offset.x,offset.y)*.01;
      if(!best||score<best.score)best={x,y,score};
    }
    if(best){element.x=best.x;element.y=best.y}
  }
  let mobileInsertSnapshot=null;
  document.addEventListener('click',event=>{
    const button=event.target?.closest?.('[data-mi]'),kind=button?.dataset?.mi;
    if(!button||!['text','rect','circle'].includes(kind)||!isMobileEditor())return;
    mobileInsertSnapshot={count:currentEditorElements().length,editorNodeId};
  },true);
  document.addEventListener('click',event=>{
    const button=event.target?.closest?.('[data-mi]'),kind=button?.dataset?.mi;
    if(!button||!['text','rect','circle'].includes(kind)||!mobileInsertSnapshot)return;
    const snapshot=mobileInsertSnapshot;mobileInsertSnapshot=null;
    setTimeout(()=>{
      if(!editorOpen||snapshot.editorNodeId!==editorNodeId)return;
      const elements=currentEditorElements();
      if(elements.length<=snapshot.count)return;
      const inserted=elements[elements.length-1];
      placeMobileInsertedElement(inserted,elements);
      save();renderEditor();
    },0);
  });
