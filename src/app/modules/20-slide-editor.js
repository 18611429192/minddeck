

  // freeform editor
  function currentEditorElements(){return editorMode==="master"?data.master.elements:findNode(editorNodeId).slideElements}
  const {MASTER_Z_MIN,MASTER_Z_MAX,SLIDE_Z_MIN,SLIDE_Z_MAX}=Core.RANGES;


  function orderedCurrentElements(){
    const arr=currentEditorElements();
    const floor=editorMode==="master"?MASTER_Z_MIN:SLIDE_Z_MIN;
    return arr.slice().sort((a,b)=>(a.z??floor)-(b.z??floor));
  }

  function applyOrderedZ(arr){
    const floor=editorMode==="master"?MASTER_Z_MIN:SLIDE_Z_MIN;
    arr.forEach((e,i)=>e.z=floor+i);
  }

  function isMobileEditor(){
    return window.innerWidth<=700 || window.matchMedia("(pointer:coarse)").matches;
  }
  function applyEditorViewTransform(){
    editorStage.style.transform=`translate(${editorPanX}px,${editorPanY}px) scale(${editorScale})`;
    const label=document.getElementById("mobileZoomLabel");
    if(label)label.textContent=Math.round((editorScale/Math.max(.001,editorFitScale))*100)+"%";
  }
  function resetEditorView(){
    editorPanX=0;editorPanY=0;editorViewTouched=false;
    fitEditorStage(true);
  }
  function setEditorZoom(next){
    const min=Math.max(.04,editorFitScale*.65),max=Math.max(editorFitScale*4,1);
    editorScale=Math.max(min,Math.min(max,next));
    editorViewTouched=Math.abs(editorScale-editorFitScale)>.01||Math.abs(editorPanX)>2||Math.abs(editorPanY)>2;
    applyEditorViewTransform();
  }

  function resetEditorPanelsForMode(mode){
    // Page and master share one editor. Switching mode starts from a clean selection/panel state.
    document.body.classList.remove("presentation-mode");
    document.getElementById("presentShell")?.classList.remove("open");
    propPanel.classList.remove("open","panel-collapsed");
    document.getElementById("editorPropRestoreHandle")?.classList.remove("open");
    masterEmptyPanel.classList.remove("open");
  }
  function openEditor(mode="slide",nodeId=selectedNodeId){
    if(presentation){
      presentation=false;
      presentationView?.destroy();presentationView=null;
      presentationSession=null;
    }
    resetEditorPanelsForMode(mode);
    editorMode=mode;editorNodeId=nodeId;selectedEls.clear();selectionAnchorId=null;editorOpen=true;editorShell.classList.add("open");
    editorShell.classList.toggle("master-editing",mode==="master");
    document.getElementById("editorModePill").textContent=mode==="master"?"母版":"页面";
    document.getElementById("editorTitle").textContent=mode==="master"?"母版":(findNode(nodeId)?.title||"页面");
    document.getElementById("toggleMasterModeBtn").textContent=mode==="master"?"返回当前页":"切到母版";
    document.getElementById("masterSettingsBtn").style.display=mode==="master"?"inline-flex":"none";
    mobileMultiSelectMode=false;mobilePropOpen=false;editorPanX=0;editorPanY=0;editorViewTouched=false;
    document.getElementById("mobileNodeContext")?.classList.remove("open");closeMobileMainSheet();
    document.getElementById("mobileMultiBtn")?.classList.remove("active");
    closeMobileEditorSheet();
    fitEditorStage(true);renderEditor()
  }
  function closeEditor(){
    editorOpen=false;editorShell.classList.remove("open");selectedEls.clear();selectionAnchorId=null;
    mobileMultiSelectMode=false;mobilePropOpen=false;closeMobileEditorSheet();save();renderMap();updateMobileNodeContext()
  }
  function fitEditorStage(forceReset=false){
    editorStage.style.width=W+"px";editorStage.style.height=H+"px";
    editorStage.style.minWidth=W+"px";editorStage.style.minHeight=H+"px";editorStage.style.flex="0 0 auto";
    const wrap=document.getElementById("editorStageWrap").getBoundingClientRect();
    const padW=isMobileEditor()?16:80,padH=isMobileEditor()?16:70;
    editorFitScale=Math.max(.03,StageCore.fitRect(wrap.width,wrap.height,W,H,padW,padH).scale);
    if(forceReset||!editorViewTouched){editorScale=editorFitScale;editorPanX=0;editorPanY=0}
    applyEditorViewTransform();
  }
  function renderEditor(){
    [...editorStage.querySelectorAll(".canvas-el")].forEach(el=>el.remove());
    SlideCore.applyBackground(editorBg,data.master);

    // Page composition uses the same master + slide ordering as presentation/export.
    if(editorMode==="master"){
      SlideCore.compose(data,{slideElements:[]}).forEach(item=>editorStage.appendChild(renderCanvasElement(item.element,true,true)));
    }else{
      const node=findNode(editorNodeId)||data;
      SlideCore.compose(data,node).forEach(item=>editorStage.appendChild(renderCanvasElement(item.element,item.master,!item.master)));
    }
    updateSelectionVisual();
    masterEmptyPanel.classList.remove("open");
    if(selectedEls.size===1){
      showPropertyPanel([...selectedEls][0]);
    }else{
      propPanel.classList.remove("open");
    }
  }
  function renderCanvasElement(e,isMaster,interactive){
    const el=ElementCore.create(e,{baseClass:`canvas-el el-${e.type}`,textWrapperClass:e.type==="text"?"text-content":null,editorTextLayout:true,animate:false,videoControls:false,videoAutoplay:false,videoMuted:true,playAutoplay:false});
    el.dataset.id=e.id;el.dataset.master=isMaster?"1":"0";
    if(isMaster&&editorMode==="slide"){const b=document.createElement("div");b.className="el-master-badge";b.textContent="母版";el.appendChild(b)}
    if(interactive){
      ["nw","ne","sw","se"].forEach(corner=>{
        const h=document.createElement("div");
        h.className=`resize-handle ${corner}`;
        h.dataset.corner=corner;
        el.appendChild(h);
        h.addEventListener("mousedown",ev=>beginElementPointer(ev,e.id,corner));
        h.addEventListener("touchstart",ev=>{if(ev.touches.length!==1)return;const t=ev.touches[0];beginElementPointer({preventDefault:()=>ev.preventDefault(),stopPropagation:()=>ev.stopPropagation(),shiftKey:false,ctrlKey:false,metaKey:false,clientX:t.clientX,clientY:t.clientY},e.id,corner)},{passive:false});
      });
      el.addEventListener("mousedown",ev=>{
        const tc=el.querySelector(".text-content");
        if(tc?.isContentEditable){ev.stopPropagation();return}
        beginElementPointer(ev,e.id,null);
      });
      el.addEventListener("touchstart",ev=>{
        if(ev.touches.length!==1)return;
        const tc=el.querySelector(".text-content");if(tc?.isContentEditable)return;
        if(isMobileEditor()&&mobileMultiSelectMode){
          ev.preventDefault();ev.stopPropagation();
          if(selectedEls.has(e.id)){
            selectedEls.delete(e.id);
            if(selectionAnchorId===e.id)selectionAnchorId=selectedEls.values().next().value||null;
          }else{
            if(!selectedEls.size)selectionAnchorId=e.id;
            selectedEls.add(e.id);
          }
          mobilePropOpen=false;refreshSelectionUI();return;
        }
        const t=ev.touches[0];
        beginElementPointer({preventDefault:()=>ev.preventDefault(),stopPropagation:()=>ev.stopPropagation(),shiftKey:false,ctrlKey:false,metaKey:false,clientX:t.clientX,clientY:t.clientY},e.id,null);
      },{passive:false});
      if(e.type==="text"){
        const tc=el.querySelector(".text-content");
        tc.addEventListener("mousedown",ev=>{if(tc.isContentEditable)ev.stopPropagation()});
        el.addEventListener("dblclick",ev=>{
          ev.preventDefault();ev.stopPropagation();
          beginInlineTextEdit(e,tc);
        });
        let lastTap=0,tapStart=null;
        el.addEventListener("touchstart",ev=>{if(ev.touches.length===1){const t=ev.touches[0];tapStart={x:t.clientX,y:t.clientY}}},{passive:true});
        el.addEventListener("touchend",ev=>{
          if(!tapStart||!ev.changedTouches.length)return;
          const t=ev.changedTouches[0],dist=Math.hypot(t.clientX-tapStart.x,t.clientY-tapStart.y);tapStart=null;
          if(dist>8)return;
          const now=Date.now();
          if(now-lastTap<360){ev.preventDefault();ev.stopPropagation();draggingEl=false;resizingEl=false;beginInlineTextEdit(e,tc);lastTap=0}
          else lastTap=now;
        },{passive:false});
      }
    }else el.style.pointerEvents="none";
    return el
  }

  function beginInlineTextEdit(e,tc){
    if(!tc)return;
    checkpoint();
    selectedEls.clear();selectedEls.add(e.id);selectionAnchorId=e.id;refreshSelectionUI();
    tc.contentEditable="true";
    tc.focus();
    // When text already exists, put the caret at the end; for an empty box,
    // the editor-only placeholder disappears as soon as composition/input starts.
    const range=document.createRange(),sel=window.getSelection();
    range.selectNodeContents(tc);range.collapse(false);sel.removeAllRanges();sel.addRange(range);

    let composing=false;
    tc.addEventListener("compositionstart",()=>{composing=true},{once:false});
    tc.addEventListener("compositionend",()=>{composing=false;e.text=tc.innerText.replace(/\n$/,"");save();syncPropertyTextArea(e)},{once:false});
    tc.addEventListener("input",()=>{
      // Never rebuild the canvas here. This is critical for Chinese/Japanese/Korean IME.
      e.text=tc.innerText.replace(/\n$/,"");
      if(!composing){save();syncPropertyTextArea(e)}
    });
    tc.addEventListener("keydown",ev=>{
      if(ev.key==="Escape"){ev.preventDefault();tc.blur()}
    });
    tc.addEventListener("blur",()=>{
      e.text=tc.innerText.replace(/\n$/,"");
      tc.contentEditable="false";
      save();syncPropertyTextArea(e);
    },{once:true});
  }

  function syncPropertyTextArea(e){
    if(selectedEls.size!==1||!selectedEls.has(e.id))return;
    const ta=propContent.querySelector('[data-p="text"]');
    if(ta && document.activeElement!==ta)ta.value=e.text||"";
  }

  editorStage.addEventListener("mousedown",e=>{
    if(e.target===editorStage||e.target===editorBg){selectedEls.clear();selectionAnchorId=null;mobilePropOpen=false;closeMobileEditorSheet();refreshSelectionUI()}
  });
  function beginElementPointer(ev,id,corner=null){
    ev.preventDefault();ev.stopPropagation();
    if((ev.shiftKey||ev.ctrlKey||ev.metaKey) && !corner){
      if(selectedEls.has(id)){
        selectedEls.delete(id);
        if(selectionAnchorId===id)selectionAnchorId=selectedEls.values().next().value||null;
      }else{
        if(!selectedEls.size)selectionAnchorId=id;
        selectedEls.add(id);
      }
      refreshSelectionUI();return
    }
    if(!selectedEls.has(id)||selectedEls.size>1){
      selectedEls.clear();selectedEls.add(id);selectionAnchorId=id;
    }else if(!selectionAnchorId){
      selectionAnchorId=id;
    }
    refreshSelectionUI();
    checkpoint();
    activeElId=id;resizeCorner=corner;pointerStart={x:ev.clientX,y:ev.clientY};
    const targets=[...selectedEls].map(x=>findEditorEl(x)).filter(Boolean);
    elStart=new Map(targets.map(x=>[x.id,{x:x.x,y:x.y,w:x.w,h:x.h}]));
    resizingEl=!!corner;draggingEl=!corner
  }

  function refreshSelectionUI(){
    updateSelectionVisual();
    masterEmptyPanel.classList.remove("open");
    if(selectedEls.size===1){
      const id=[...selectedEls][0];
      if(isMobileEditor()){
        showPropertyPanel(id);
        propPanel.classList.toggle("open",mobilePropOpen);
      }else if(propPanel.classList.contains("panel-collapsed")){
        propPanel.classList.remove("open");
        document.getElementById("editorPropRestoreHandle")?.classList.add("open");
      }else showPropertyPanel(id);
    }else{
      mobilePropOpen=false;propPanel.classList.remove("open");
    }
    updateMobileEditorButtons();
  }
  function handleEditorPointerMove(e){
    const dx=(e.clientX-pointerStart.x)/editorScale,dy=(e.clientY-pointerStart.y)/editorScale;
    if(resizingEl){
      const el=findEditorEl(activeElId),st=elStart.get(activeElId);if(!el||!st)return;
      const minW=40,minH=30;
      let nx=st.x,ny=st.y,nw=st.w,nh=st.h;

      if(resizeCorner==="se"){
        nw=Math.max(minW,st.w+dx);nh=Math.max(minH,st.h+dy);
      }else if(resizeCorner==="ne"){
        nw=Math.max(minW,st.w+dx);nh=Math.max(minH,st.h-dy);
        ny=st.y+(st.h-nh);
      }else if(resizeCorner==="sw"){
        nw=Math.max(minW,st.w-dx);nh=Math.max(minH,st.h+dy);
        nx=st.x+(st.w-nw);
      }else if(resizeCorner==="nw"){
        nw=Math.max(minW,st.w-dx);nh=Math.max(minH,st.h-dy);
        nx=st.x+(st.w-nw);ny=st.y+(st.h-nh);
      }
      el.x=Math.round(nx);el.y=Math.round(ny);el.w=Math.round(nw);el.h=Math.round(nh);
    }else{
      elStart.forEach((st,id)=>{const el=findEditorEl(id);if(el){el.x=Math.round(st.x+dx);el.y=Math.round(st.y+dy)}})
    }
    renderEditorLight()
  }
  const editorStageWrap=document.getElementById("editorStageWrap");
  function touchDist(a,b){return Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)}
  function touchMid(a,b){return {x:(a.clientX+b.clientX)/2,y:(a.clientY+b.clientY)/2}}

  editorStageWrap.addEventListener("touchstart",ev=>{
    if(!editorOpen||!isMobileEditor())return;
    if(ev.touches.length===2){
      ev.preventDefault();draggingEl=false;resizingEl=false;
      const a=ev.touches[0],b=ev.touches[1],m=touchMid(a,b);
      mobileEditorGesture={type:"pinch",dist:touchDist(a,b),scale:editorScale,panX:editorPanX,panY:editorPanY,midX:m.x,midY:m.y};
      return;
    }
    if(ev.touches.length===1&&(ev.target===editorStageWrap||ev.target===editorStage||ev.target===editorBg)){
      const t=ev.touches[0];
      mobileEditorGesture={type:"pan",x:t.clientX,y:t.clientY,panX:editorPanX,panY:editorPanY};
      selectedEls.clear();selectionAnchorId=null;mobilePropOpen=false;refreshSelectionUI();
    }
  },{passive:false});

  window.addEventListener("touchmove",ev=>{
    if(!editorOpen)return;
    if(isMobileEditor()&&ev.touches.length===2){
      ev.preventDefault();
      const a=ev.touches[0],b=ev.touches[1],m=touchMid(a,b);
      if(!mobileEditorGesture||mobileEditorGesture.type!=="pinch"){
        mobileEditorGesture={type:"pinch",dist:touchDist(a,b),scale:editorScale,panX:editorPanX,panY:editorPanY,midX:m.x,midY:m.y};
      }
      const ratio=touchDist(a,b)/Math.max(1,mobileEditorGesture.dist);
      editorPanX=mobileEditorGesture.panX+(m.x-mobileEditorGesture.midX);
      editorPanY=mobileEditorGesture.panY+(m.y-mobileEditorGesture.midY);
      setEditorZoom(mobileEditorGesture.scale*ratio);
      return;
    }
    if(isMobileEditor()&&mobileEditorGesture?.type==="pan"&&ev.touches.length===1&&!draggingEl&&!resizingEl){
      ev.preventDefault();const t=ev.touches[0];
      editorPanX=mobileEditorGesture.panX+(t.clientX-mobileEditorGesture.x);
      editorPanY=mobileEditorGesture.panY+(t.clientY-mobileEditorGesture.y);
      editorViewTouched=true;applyEditorViewTransform();return;
    }
    if(!(draggingEl||resizingEl)||ev.touches.length!==1)return;
    ev.preventDefault();const t=ev.touches[0];handleEditorPointerMove({clientX:t.clientX,clientY:t.clientY});
  },{passive:false});
  window.addEventListener("touchend",ev=>{
    if(ev.touches?.length===0)mobileEditorGesture=null;
    if(draggingEl||resizingEl){draggingEl=false;resizingEl=false;resizeCorner=null;activeElId=null;save();syncSelectedGeometryFields();renderEditorLight()}
  },{passive:false});

  function renderEditorLight(){
    document.querySelectorAll(".canvas-el").forEach(dom=>{
      const id=dom.dataset.id,el=findEditorEl(id);if(!el)return;
      dom.style.left=el.x+"px";dom.style.top=el.y+"px";dom.style.width=el.w+"px";dom.style.height=el.h+"px"
    })
  }
  function findEditorEl(id){
    let x=data.master.elements.find(e=>e.id===id);if(x)return x;
    const n=findNode(editorNodeId);return n?.slideElements?.find(e=>e.id===id)||null
  }
  function updateSelectionVisual(){
    document.querySelectorAll(".canvas-el").forEach(el=>{
      const sel=selectedEls.has(el.dataset.id);
      el.classList.toggle("selected",sel&&selectedEls.size===1);
      el.classList.toggle("multi-selected",sel&&selectedEls.size>1);
      el.classList.toggle("selection-anchor",sel&&selectedEls.size>1&&el.dataset.id===selectionAnchorId);
    })
  }

  function showPropertyPanel(id){
    const e=findEditorEl(id);if(!e)return;propPanel.classList.add("open");masterEmptyPanel.classList.remove("open");
    document.getElementById("propTitle").textContent=e.type==="text"?"文字属性":e.type==="image"?"图片属性":e.type==="video"?"视频属性":"形状属性";
    const common=`
      <div class="prop-row">
        <div class="field"><label>X</label><input type="number" data-p="x" value="${Math.round(e.x)}"></div>
        <div class="field"><label>Y</label><input type="number" data-p="y" value="${Math.round(e.y)}"></div>
        <div class="field"><label>宽</label><input type="number" data-p="w" value="${Math.round(e.w)}"></div>
        <div class="field"><label>高</label><input type="number" data-p="h" value="${Math.round(e.h)}"></div>
      </div>`;
    let specific="";
    if(e.type==="text"){
      specific=`
        <div class="field"><label>文字</label><textarea data-p="text">${esc(e.text||"")}</textarea></div>
        <div class="prop-row">
          <div class="field"><label>字号</label><input type="number" data-p="fontSize" value="${e.fontSize||32}"></div>
          <div class="field"><label>粗细</label><select data-p="fontWeight"><option value="400" ${e.fontWeight==400?"selected":""}>常规</option><option value="600" ${e.fontWeight==600?"selected":""}>半粗</option><option value="700" ${e.fontWeight==700?"selected":""}>粗体</option><option value="800" ${e.fontWeight==800?"selected":""}>特粗</option></select></div>
        </div>
        <div class="field"><label>颜色</label><input type="color" data-p="color" value="${e.color||"#1f2329"}"></div>
        <div class="field"><label>对齐</label><select data-p="textAlign"><option value="left" ${e.textAlign==="left"?"selected":""}>左</option><option value="center" ${e.textAlign==="center"?"selected":""}>中</option><option value="right" ${e.textAlign==="right"?"selected":""}>右</option></select></div>`;
    }else if(e.type==="image"){
      specific=`<div class="field"><label>图片适配</label><select data-p="fit"><option value="contain" ${e.fit==="contain"?"selected":""}>完整显示</option><option value="cover" ${e.fit==="cover"?"selected":""}>铺满裁切</option></select></div>`;
    }else if(e.type==="video"){
      normalizeVideo(e);
      specific=`
        <div class="field"><label>视频适配</label><select data-p="fit"><option value="contain" ${e.fit==="contain"?"selected":""}>完整显示</option><option value="cover" ${e.fit==="cover"?"selected":""}>铺满裁切</option></select></div>
        <div class="field"><label>视频地址 / Data URL</label><input data-p="src" value="${esc(e.src||"")}"></div>
        <div class="prop-row">
          <div class="field"><label>播放控件</label><select data-p="controls"><option value="true" ${e.controls?"selected":""}>显示</option><option value="false" ${!e.controls?"selected":""}>隐藏</option></select></div>
          <div class="field"><label>自动播放</label><select data-p="autoplay"><option value="false" ${!e.autoplay?"selected":""}>否</option><option value="true" ${e.autoplay?"selected":""}>是</option></select></div>
          <div class="field"><label>静音</label><select data-p="muted"><option value="false" ${!e.muted?"selected":""}>否</option><option value="true" ${e.muted?"selected":""}>是</option></select></div>
          <div class="field"><label>循环</label><select data-p="loop"><option value="false" ${!e.loop?"selected":""}>否</option><option value="true" ${e.loop?"selected":""}>是</option></select></div>
        </div>
        <div class="small-note">浏览器通常只允许“静音视频”自动播放；带声音视频建议点击播放。</div>`;
    }else{
      specific=`
        <div class="prop-row">
          <div class="field"><label>填充</label><input type="color" data-p="fill" value="${e.fill||"#edf2ff"}"></div>
          <div class="field"><label>边框</label><input type="color" data-p="borderColor" value="${e.borderColor||"#b8c5ff"}"></div>
        </div>
        <div class="field"><label>边框粗细</label><input type="number" data-p="borderWidth" min="0" value="${e.borderWidth||0}"></div>`;
    }
    const anim=e.animation||{type:"inherit",delay:0,duration:.5};
    const animOptions=animTypes.map(([v,t])=>`<option value="${v}" ${v===anim.type?"selected":""}>${t}</option>`).join("");
    const animation=`
      <div class="field" style="margin-top:18px;padding-top:14px;border-top:1px solid #edf0f4"><label>这个元素的动画</label><select data-p="animType">${animOptions}</select></div>
      <div class="prop-row">
        <div class="field"><label>延迟（秒）</label><input type="number" min="0" max="10" step="0.1" data-p="animDelay" value="${Number(anim.delay)||0}"></div>
        <div class="field"><label>时长（秒）</label><input type="number" min="0.1" max="5" step="0.1" data-p="animDuration" value="${Number(anim.duration)||.5}"></div>
      </div>
      <div class="small-note">只对当前选中的这个元素生效。母版元素同样可以设置动画。</div>`;
    propContent.innerHTML=common+specific+animation;
    propContent.querySelectorAll("[data-p]").forEach(inp=>{
      // Live-update the selected element in place. Do NOT rebuild the editor on input:
      // rebuilding kills IME composition and causes Chinese input to lose focus.
      inp.addEventListener("focus",()=>checkpoint(),{once:true});
      inp.addEventListener("input",()=>applyPropChange(e,inp.dataset.p,inp.value));
      inp.addEventListener("change",()=>applyPropChange(e,inp.dataset.p,inp.value));
      inp.addEventListener("blur",()=>save());
    })
  }
  function applyPropChange(e,p,v){
    if(["x","y","w","h","fontSize","fontWeight","borderWidth"].includes(p))v=Number(v);
    if(["controls","autoplay","muted","loop"].includes(p))v=(v==="true");
    if(p==="animType"){e.animation=e.animation||{};e.animation.type=v}
    else if(p==="animDelay"){e.animation=e.animation||{};e.animation.delay=Number(v)}
    else if(p==="animDuration"){e.animation=e.animation||{};e.animation.duration=Number(v)}
    else e[p]=v;
    save();
    updateCanvasDomFromModel(e);
  }

  function syncSelectedGeometryFields(){
    if(selectedEls.size!==1)return;
    const e=findEditorEl([...selectedEls][0]);if(!e)return;
    ["x","y","w","h"].forEach(p=>{
      const inp=propContent.querySelector(`[data-p="${p}"]`);
      if(inp)inp.value=Math.round(e[p]);
    });
  }

  function updateCanvasDomFromModel(e){
    const dom=[...editorStage.querySelectorAll(".canvas-el")].find(x=>x.dataset.id===e.id);
    if(!dom)return;
    dom.style.left=e.x+"px";dom.style.top=e.y+"px";dom.style.width=e.w+"px";dom.style.height=e.h+"px";dom.style.zIndex=e.z||1;
    if(e.type==="text"){
      dom.style.fontSize=(e.fontSize||32)+"px";dom.style.fontWeight=e.fontWeight||400;dom.style.color=e.color||"#222";dom.style.textAlign=e.textAlign||"left";
      dom.style.justifyContent=e.textAlign==="center"?"center":e.textAlign==="right"?"flex-end":"flex-start";
      const tc=dom.querySelector(".text-content");
      if(tc && !tc.isContentEditable && tc.textContent!==(e.text||""))tc.textContent=e.text||"";
    }else if(e.type==="image"){
      const img=dom.querySelector("img");if(img)img.style.objectFit=e.fit||"contain";
    }else if(e.type==="video"){
      const v=dom.querySelector("video");
      if(v){v.src=e.src||"";v.style.objectFit=e.fit||"contain";v.loop=!!e.loop}
    }else if(e.type==="shape"){
      dom.style.background=e.fill||"#eee";dom.style.borderColor=e.borderColor||"transparent";dom.style.borderWidth=(e.borderWidth||0)+"px";dom.style.borderRadius=(e.shape==="circle"?999:(e.radius||0))+"px";
    }
  }
  function addElement(type){
    checkpoint();
    const arr=currentEditorElements();let e;
    if(type==="text")e=baseText();
    else if(type==="rect")e=baseShape("rect");
    else if(type==="circle")e=baseShape("circle");
    if(isMobileEditor()){e.x=Math.round((W-e.w)/2);e.y=Math.round((H-e.h)/2)}
    const ordered=orderedCurrentElements();
    e.z=(ordered.length?(ordered[ordered.length-1].z+1):(editorMode==="master"?MASTER_Z_MIN:SLIDE_Z_MIN));
    arr.push(e);selectedEls.clear();selectedEls.add(e.id);selectionAnchorId=e.id;save();renderEditor()
  }
  function addImageFromFile(file){
    const r=new FileReader();r.onload=()=>{
      const arr=currentEditorElements(),ordered=orderedCurrentElements();
      const e={id:uid(),type:"image",x:420,y:220,w:620,h:420,z:(ordered.length?ordered[ordered.length-1].z+1:(editorMode==="master"?MASTER_Z_MIN:SLIDE_Z_MIN)),src:r.result,fit:"contain",animation:{type:"inherit",delay:0,duration:.5}};
      arr.push(e);selectedEls.clear();selectedEls.add(e.id);selectionAnchorId=e.id;save();renderEditor()
    };r.readAsDataURL(file)
  }
  function addVideoElement(src){
    checkpoint();
    const arr=currentEditorElements(),ordered=orderedCurrentElements();
    const e={id:uid(),type:"video",x:330,y:190,w:760,h:430,z:(ordered.length?ordered[ordered.length-1].z+1:(editorMode==="master"?MASTER_Z_MIN:SLIDE_Z_MIN)),src,fit:"contain",
      controls:true,autoplay:false,muted:false,loop:false,animation:{type:"inherit",delay:0,duration:.5}};
    arr.push(e);selectedEls.clear();selectedEls.add(e.id);selectionAnchorId=e.id;save();renderEditor()
  }
  function addVideoFromFile(file){
    if(file.size>25*1024*1024){
      toast("视频较大，内嵌后项目文件会很大；建议优先使用视频 URL");
    }
    const r=new FileReader();r.onload=()=>addVideoElement(r.result);r.readAsDataURL(file)
  }
  function deleteSelected(){
    if(!selectedEls.size)return;
    checkpoint();
    const ids=new Set(selectedEls);
    if(editorMode==="master")data.master.elements=data.master.elements.filter(e=>!ids.has(e.id));
    else{const n=findNode(editorNodeId);n.slideElements=n.slideElements.filter(e=>!ids.has(e.id))}
    selectedEls.clear();selectionAnchorId=null;save();renderEditor()
  }
  function duplicateSelected(){
    checkpoint();
    const arr=currentEditorElements(),copies=[];
    selectedEls.forEach(id=>{const e=arr.find(x=>x.id===id);if(e){const c=clone(e);c.id=uid();c.x+=28;c.y+=28;c.z=((orderedCurrentElements().at(-1)?.z)??(editorMode==="master"?MASTER_Z_MIN-1:SLIDE_Z_MIN-1))+1;arr.push(c);copies.push(c.id)}});
    selectedEls=new Set(copies);selectionAnchorId=copies[0]||null;save();renderEditor()
  }
  function moveLayerStep(direction){
    const arr=orderedCurrentElements();if(!selectedEls.size)return;
    checkpoint();

    if(direction>0){
      // Move selected items upward one step without changing relative order.
      for(let i=arr.length-2;i>=0;i--){
        if(selectedEls.has(arr[i].id) && !selectedEls.has(arr[i+1].id)){
          [arr[i],arr[i+1]]=[arr[i+1],arr[i]];
        }
      }
    }else{
      // Move selected items downward one step without changing relative order.
      for(let i=1;i<arr.length;i++){
        if(selectedEls.has(arr[i].id) && !selectedEls.has(arr[i-1].id)){
          [arr[i-1],arr[i]]=[arr[i],arr[i-1]];
        }
      }
    }
    applyOrderedZ(arr);save();renderEditor();
  }

  function zMove(front=true){
    const arr=orderedCurrentElements();if(!selectedEls.size)return;
    checkpoint();
    const selected=arr.filter(e=>selectedEls.has(e.id));
    const others=arr.filter(e=>!selectedEls.has(e.id));
    const reordered=front?[...others,...selected]:[...selected,...others];
    applyOrderedZ(reordered);save();renderEditor();
  }
  function alignSelected(kind){
    const arr=[...selectedEls].map(findEditorEl).filter(Boolean);
    if(arr.length<2){toast("请至少选择两个元素进行对齐");return}

    let anchor=findEditorEl(selectionAnchorId);
    if(!anchor || !selectedEls.has(anchor.id)){
      anchor=arr[0];selectionAnchorId=anchor.id;
    }
    checkpoint();

    const others=arr.filter(e=>e.id!==anchor.id);

    if(kind==="left")others.forEach(e=>e.x=anchor.x);
    else if(kind==="hcenter")others.forEach(e=>e.x=anchor.x+(anchor.w-e.w)/2);
    else if(kind==="right")others.forEach(e=>e.x=anchor.x+anchor.w-e.w);
    else if(kind==="top")others.forEach(e=>e.y=anchor.y);
    else if(kind==="vcenter")others.forEach(e=>e.y=anchor.y+(anchor.h-e.h)/2);
    else if(kind==="bottom")others.forEach(e=>e.y=anchor.y+anchor.h-e.h);
    else if(kind==="sameWidth")others.forEach(e=>e.w=anchor.w);
    else if(kind==="sameHeight")others.forEach(e=>e.h=anchor.h);
    else if(kind==="distributeH"){
      if(arr.length<3){toast("水平等距至少需要选择三个元素");return}
      const sorted=arr.slice().sort((a,b)=>a.x-b.x);
      const first=sorted[0],last=sorted[sorted.length-1];
      const totalWidth=sorted.reduce((s,e)=>s+e.w,0);
      const gap=(last.x+last.w-first.x-totalWidth)/(sorted.length-1);
      let x=first.x;
      sorted.forEach((e,i)=>{
        if(i===0)return x=e.x+e.w;
        if(i===sorted.length-1)return;
        e.x=x+gap;x=e.x+e.w;
      });
    }else if(kind==="distributeV"){
      if(arr.length<3){toast("垂直等距至少需要选择三个元素");return}
      const sorted=arr.slice().sort((a,b)=>a.y-b.y);
      const first=sorted[0],last=sorted[sorted.length-1];
      const totalHeight=sorted.reduce((s,e)=>s+e.h,0);
      const gap=(last.y+last.h-first.y-totalHeight)/(sorted.length-1);
      let y=first.y;
      sorted.forEach((e,i)=>{
        if(i===0)return y=e.y+e.h;
        if(i===sorted.length-1)return;
        e.y=y+gap;y=e.y+e.h;
      });
    }

    arr.forEach(e=>{
      e.x=Math.round(e.x);e.y=Math.round(e.y);
      e.w=Math.round(e.w);e.h=Math.round(e.h);
    });
    save();renderEditor();
  }

  function copySelectedElements(){
    if(!editorOpen||!selectedEls.size)return;
    const arr=currentEditorElements();
    elementClipboard=arr.filter(e=>selectedEls.has(e.id)).map(clone);
    toast(`已复制 ${elementClipboard.length} 个元素`);
  }
  function cutSelectedElements(){
    if(!editorOpen||!selectedEls.size)return;
    copySelectedElements();deleteSelected();toast("已剪切");
  }
  function pasteElements(){
    if(!editorOpen||!elementClipboard.length)return;
    checkpoint();
    const arr=currentEditorElements(),ids=[];
    elementClipboard.forEach(src=>{
      const c=clone(src);c.id=uid();c.x+=30;c.y+=30;c.z=Math.max(1,...arr.map(e=>e.z||1))+1;
      arr.push(c);ids.push(c.id)
    });
    elementClipboard=elementClipboard.map(x=>({...x,x:x.x+8,y:x.y+8}));
    selectedEls=new Set(ids);selectionAnchorId=ids[0]||null;save();renderEditor();toast(`已粘贴 ${ids.length} 个元素`);
  }

  function updateMobileEditorButtons(){
    if(!isMobileEditor())return;
    const multi=document.getElementById("mobileMultiBtn");
    multi?.classList.toggle("active",mobileMultiSelectMode);
    const prop=document.getElementById("mobilePropBtn");
    if(prop)prop.disabled=selectedEls.size!==1 && editorMode!=="master";
    const align=document.getElementById("mobileAlignBtn");
    if(align)align.disabled=selectedEls.size<2;
    const layer=document.getElementById("mobileLayerBtn");
    if(layer)layer.disabled=selectedEls.size===0;
  }
  function closeMobileEditorSheet(){
    document.getElementById("mobileActionSheet")?.classList.remove("open");
  }
  function openMobileEditorSheet(kind){
    if(!isMobileEditor())return;
    mobilePropOpen=false;propPanel.classList.remove("open");
    const sheet=document.getElementById("mobileActionSheet"),title=document.getElementById("mobileSheetTitle"),box=document.getElementById("mobileSheetContent");
    let content="";
    if(kind==="insert"){
      title.textContent="插入元素";
      content=`<div class="mobile-sheet-grid">
        <button class="btn" data-mi="text">文字</button><button class="btn" data-mi="image">图片</button><button class="btn" data-mi="video">视频</button>
        <button class="btn" data-mi="videoUrl">视频 URL</button><button class="btn" data-mi="rect">矩形</button><button class="btn" data-mi="circle">圆形</button>
      </div><div class="mobile-sheet-grid two" style="margin-top:8px"><button class="btn" data-mi="master">${editorMode==="master"?"切到当前页":"切到母版"}</button><button class="btn" data-mi="duplicate" ${selectedEls.size?"":"disabled"}>复制所选</button></div>`;
    }else if(kind==="align"){
      title.textContent="多元素对齐";
      content=`<div class="mobile-sheet-grid">
        <button class="btn" data-ma="left">左对齐</button><button class="btn" data-ma="hcenter">横向居中</button><button class="btn" data-ma="right">右对齐</button>
        <button class="btn" data-ma="top">顶对齐</button><button class="btn" data-ma="vcenter">纵向居中</button><button class="btn" data-ma="bottom">底对齐</button>
        <button class="btn" data-ma="sameWidth">等宽</button><button class="btn" data-ma="sameHeight">等高</button><button class="btn" data-ma="distributeH">水平等距</button>
        <button class="btn" data-ma="distributeV">垂直等距</button>
      </div><div class="small-note" style="margin-top:9px">第一个选中的元素是对齐基准。</div>`;
    }else if(kind==="layer"){
      title.textContent="图层与元素";
      content=`<div class="mobile-sheet-grid two">
        <button class="btn" data-ml="up">上移一层</button><button class="btn" data-ml="down">下移一层</button>
        <button class="btn" data-ml="front">置于顶层</button><button class="btn" data-ml="back">置于底层</button>
        <button class="btn" data-ml="duplicate">复制</button><button class="btn danger" data-ml="delete">删除</button>
      </div>`;
    }
    box.innerHTML=content;sheet.classList.add("open");

    box.querySelectorAll("[data-mi]").forEach(b=>b.onclick=()=>{
      const a=b.dataset.mi;
      if(a==="text")addElement("text");
      else if(a==="image")document.getElementById("editorImageFile").click();
      else if(a==="video")document.getElementById("editorVideoFile").click();
      else if(a==="videoUrl")document.getElementById("addVideoUrlBtn").click();
      else if(a==="rect")addElement("rect");
      else if(a==="circle")addElement("circle");
      else if(a==="master")openEditor(editorMode==="master"?"slide":"master",editorNodeId||selectedNodeId);
      else if(a==="duplicate")duplicateSelected();
      if(a!=="image"&&a!=="video")closeMobileEditorSheet();
    });
    box.querySelectorAll("[data-ma]").forEach(b=>b.onclick=()=>{alignSelected(b.dataset.ma);closeMobileEditorSheet()});
    box.querySelectorAll("[data-ml]").forEach(b=>b.onclick=()=>{
      const a=b.dataset.ml;
      if(a==="up")moveLayerStep(1);else if(a==="down")moveLayerStep(-1);else if(a==="front")zMove(true);else if(a==="back")zMove(false);
      else if(a==="duplicate")duplicateSelected();else if(a==="delete")deleteSelected();
      closeMobileEditorSheet();
    });
  }

  // Master settings are an explicit property panel, not a second editor UI.
  function updateMasterPanel(){
    // Kept for old project/runtime compatibility; the active editor uses showMasterSettingsPanel().
    const c=document.getElementById("masterBgColor"),f=document.getElementById("masterBgFit"),
      v=document.getElementById("masterTocVisibility"),s=document.getElementById("masterTocSide");
    if(c)c.value=data.master.bgColor||"#ffffff";
    if(f)f.value=data.master.bgFit||"cover";
    if(v)v.value=data.master.tocVisibility||"auto";
    if(s)s.value=data.master.tocSide||"left";
  }
  function showMasterSettingsPanel(){
    if(editorMode!=="master")return;
    selectedEls.clear();selectionAnchorId=null;updateSelectionVisual();
    masterEmptyPanel.classList.remove("open");
    propPanel.classList.remove("panel-collapsed");
    document.getElementById("editorPropRestoreHandle")?.classList.remove("open");
    document.getElementById("propTitle").textContent="母版设置";
    propContent.innerHTML=`
      <div class="small-note" style="margin-bottom:12px">母版画布和普通页面使用完全相同的编辑方式。这里只放背景、目录和默认动画等全局设置。</div>
      <div class="field"><label>背景颜色</label><input type="color" data-master-p="bgColor" value="${data.master.bgColor||"#ffffff"}"></div>
      <div class="field"><label>背景图片</label><input type="file" id="masterSettingsBgFile" accept="image/*"></div>
      <div class="actions" style="margin-top:6px"><button class="btn" id="clearMasterBgImage" ${data.master.bgImage?"":"disabled"}>清除背景图片</button></div>
      <div class="field"><label>背景适配</label><select data-master-p="bgFit">
        <option value="cover" ${(data.master.bgFit||"cover")==="cover"?"selected":""}>铺满</option>
        <option value="contain" ${data.master.bgFit==="contain"?"selected":""}>完整显示</option>
      </select></div>
      <div class="field"><label>目录显示</label><select data-master-p="tocVisibility">
        <option value="auto" ${(data.master.tocVisibility||"auto")==="auto"?"selected":""}>自动（桌面显示，手机隐藏）</option>
        <option value="show" ${data.master.tocVisibility==="show"?"selected":""}>始终显示</option>
        <option value="hide" ${data.master.tocVisibility==="hide"?"selected":""}>始终隐藏</option>
      </select></div>
      <div class="field"><label>目录位置</label><select data-master-p="tocSide">
        <option value="left" ${(data.master.tocSide||"left")==="left"?"selected":""}>左侧</option>
        <option value="right" ${data.master.tocSide==="right"?"selected":""}>右侧</option>
      </select></div>
      <div class="field"><label>默认动画</label><select data-master-p="defaultAnimation">
        ${animTypes.filter(([v])=>v!=="inherit").map(([v,t])=>`<option value="${v}" ${(data.master.defaultAnimation||"soft")===v?"selected":""}>${t}</option>`).join("")}
      </select></div>
      <div class="hint">文字、图片、视频、形状请直接用顶部“插入”工具添加到母版画布，操作和普通页面完全一致。</div>`;
    propPanel.classList.add("open");
    propContent.querySelectorAll("[data-master-p]").forEach(input=>{
      input.onfocus=()=>checkpoint();
      const apply=()=>{
        const p=input.dataset.masterP;
        data.master[p]=input.value;
        save();
        if(p==="bgColor"||p==="bgFit")renderEditor();
      };
      input.oninput=apply;input.onchange=apply;
    });
    const file=propContent.querySelector("#masterSettingsBgFile");
    if(file)file.onchange=e=>{
      const f=e.target.files?.[0];if(!f)return;checkpoint();
      const r=new FileReader();r.onload=()=>{data.master.bgImage=r.result;save();renderEditor();showMasterSettingsPanel()};r.readAsDataURL(f)
    };
    const clear=propContent.querySelector("#clearMasterBgImage");
    if(clear)clear.onclick=()=>{if(!data.master.bgImage)return;checkpoint();data.master.bgImage=null;save();renderEditor();showMasterSettingsPanel()};
    updateMobileEditorButtons();
  }
