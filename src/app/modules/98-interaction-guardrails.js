

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

  // Insertions must not bury the natural click target of existing elements. The original
  // mobile-only placer minimized overlap area, but a large image/video could still sit over
  // the centre of text or shapes and make them practically unselectable on desktop. Score a
  // full 3x3 stage grid and heavily penalize covering an existing element's centre point.
  function elementOverlapArea(a,b){
    const left=Math.max(a.x,b.x),top=Math.max(a.y,b.y),right=Math.min(a.x+a.w,b.x+b.w),bottom=Math.min(a.y+a.h,b.y+b.h);
    return Math.max(0,right-left)*Math.max(0,bottom-top);
  }
  function boxContainsPoint(box,x,y){
    return x>=box.x&&x<=box.x+box.w&&y>=box.y&&y<=box.y+box.h;
  }
  function placeMobileInsertedElement(element,elements){
    if(!element)return;
    const others=(elements||[]).filter(item=>item!==element),margin=24;
    const maxX=Math.max(margin,W-element.w-margin),maxY=Math.max(margin,H-element.h-margin);
    const xs=[margin,Math.round((margin+maxX)/2),maxX];
    const ys=[margin,Math.round((margin+maxY)/2),maxY];
    const candidates=[];
    ys.forEach(y=>xs.forEach(x=>candidates.push({x,y})));

    // Keep a few legacy near-centre choices for small items so normal text/shape insertion
    // still feels local when those positions are genuinely clearer.
    const centreX=Math.round((W-element.w)/2),centreY=Math.round((H-element.h)/2);
    [{x:centreX,y:centreY-190},{x:centreX,y:centreY+190},{x:centreX-350,y:centreY+20},{x:centreX+350,y:centreY+20}]
      .forEach(p=>candidates.push({x:Math.max(margin,Math.min(maxX,p.x)),y:Math.max(margin,Math.min(maxY,p.y))}));

    let best=null;
    for(const point of candidates){
      const box={x:point.x,y:point.y,w:element.w,h:element.h};
      const overlap=others.reduce((sum,item)=>sum+elementOverlapArea(box,{x:Number(item.x)||0,y:Number(item.y)||0,w:Number(item.w)||0,h:Number(item.h)||0}),0);
      let coveredCentres=0,coveredPrimaryCentres=0;
      others.forEach(item=>{
        const cx=(Number(item.x)||0)+(Number(item.w)||0)/2,cy=(Number(item.y)||0)+(Number(item.h)||0)/2;
        if(!boxContainsPoint(box,cx,cy))return;
        coveredCentres++;
        // Text and shapes do not have an intrinsic media surface users can target elsewhere;
        // protect their centre hit targets most strongly.
        if(item.type==='text'||item.type==='shape')coveredPrimaryCentres++;
      });
      const stageCentreDistance=Math.hypot(point.x-centreX,point.y-centreY);
      const score=overlap+coveredCentres*250000+coveredPrimaryCentres*1000000+stageCentreDistance*.01;
      if(!best||score<best.score)best={x:point.x,y:point.y,score};
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
