

  // map
  function orderMap(){const m=new Map();effectiveOrder().forEach((id,i)=>m.set(id,i+1));return m}
  function renderMap(){
    normalize();const om=orderMap();
    MapRendererCore.render(data,{
      document,nodes:nodesEl,edges,selectedId:selectedNodeId,layout:data.mapLayout||"radial",orderMap:om,
      rootClass:"center",selectedClass:"selected",titleClass:"title",descriptionClass:"desc",metaClass:"meta",
      foldClass:"fold",badgeClass:"order-badge",emptyDescriptionClass:"inline-empty",emptyDescriptionText:"双击添加说明",
      showEmptyDescription:n=>appMode==="mindmap"&&n.id===selectedNodeId,
      getMeta:n=>appMode==="mindmap"?`${(n.children||[]).length} 个子节点${n.collapsed?" · 已折叠":""}`:`${(n.slideElements||[]).length} 个页面元素`,
      onFold:n=>{CommandsCore.toggleCollapsed(data,n.id);save();renderMap();renderOrderPanel();if(presentation)refreshPresentation()},
      onPointerDown:(n,e)=>beginNodeDrag(e,n.id),
      onTouchStart:(n,e)=>beginNodeTouch(e,n.id),
      onSelect:(n,e)=>{if(moved){moved=false;return}selectNode(n.id)},
      onDoubleClick:(n,e)=>{
        if(appMode!=="mindmap")return;
        selectNode(n.id);beginInlineMapEdit(n.id,e.target.closest(".desc")?"text":"title");
      }
    });
    setTransform();
  }
  function selectNode(id){
    selectedNodeId=id;const n=findNode(id);
    document.getElementById("nodeTitle").value=n.title||"";document.getElementById("nodeText").value=n.text||"";
    if(appMode==="presentation"&&window.innerWidth>700){
      if(activeCollapsedMapPanelId==="nodePanel"){
        nodePanel.classList.add("panel-collapsed");
        nodePanel.classList.remove("open");
        document.getElementById("panelRestoreHandle")?.classList.add("open");
      }else nodePanel.classList.add("open");
    }else nodePanel.classList.remove("open");
    orderPanel.classList.remove("open");document.getElementById("exportSettingsPanel").classList.remove("open");closeMobileMainSheet();
    document.querySelectorAll(".node").forEach(el=>el.classList.toggle("selected",el.dataset.id===id));
    updateMobileNodeContext();
    if(appMode==="mindmap")renderMap();
  }
  function beginNodeDrag(e,id){
    if(e.button!==0||e.target.closest(".fold")||e.target.closest('[contenteditable="true"]'))return;e.preventDefault();e.stopPropagation();if(id===data.id){toast("中心节点保持不动");return}
    nodeDragging=true;dragNodeId=id;moved=false;dragStart={x:e.clientX,y:e.clientY};dragTreeStart=new Map(descendants(findNode(id)).map(n=>[n.id,{x:n.pos.x,y:n.pos.y}]));
    document.querySelector(`.node[data-id="${id}"]`)?.classList.add("dragging")
  }
  window.addEventListener("mousemove",e=>{
    if(nodeDragging){
      const dx=(e.clientX-dragStart.x)/scale,dy=(e.clientY-dragStart.y)/scale;if(Math.abs(dx)+Math.abs(dy)>3)moved=true;
      dragTreeStart.forEach((p,id)=>{const n=findNode(id);if(n)n.pos={x:p.x+dx,y:p.y+dy}});
      document.querySelectorAll(".node").forEach(el=>{const n=findNode(el.dataset.id);if(n){el.style.left=n.pos.x+"px";el.style.top=n.pos.y+"px"}});redrawEdges();return
    }
    if(draggingEl||resizingEl){handleEditorPointerMove(e);return}
    if(panning){tx+=e.clientX-lastX;ty+=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;setTransform()}
  });
  window.addEventListener("mouseup",()=>{
    if(nodeDragging){document.querySelector(`.node[data-id="${dragNodeId}"]`)?.classList.remove("dragging");nodeDragging=false;dragNodeId=null;save();return}
    if(draggingEl||resizingEl){draggingEl=false;resizingEl=false;resizeCorner=null;activeElId=null;save();syncSelectedGeometryFields();renderEditorLight();return}
    panning=false;viewport.classList.remove("panning")
  });
  function redrawEdges(){document.querySelectorAll(".edge").forEach(p=>{const a=findNode(p.dataset.from),b=findNode(p.dataset.to);if(a&&b)p.setAttribute("d",LayoutCore.edgePath(a.pos,b.pos,data.mapLayout||"radial"))})}
  viewport.onmousedown=e=>{if(e.button!==0||e.target.closest(".node"))return;panning=true;lastX=e.clientX;lastY=e.clientY;viewport.classList.add("panning");nodePanel.classList.remove("open");orderPanel.classList.remove("open");document.getElementById("exportSettingsPanel").classList.remove("open");closeMobileMainSheet()};
  viewport.addEventListener("wheel",e=>{
    e.preventDefault();const r=viewport.getBoundingClientRect(),next=MapViewportCore.zoomAt({scale,tx,ty},{x:e.clientX-r.left,y:e.clientY-r.top},e.deltaY<0?1.12:.89);
    scale=next.scale;tx=next.tx;ty=next.ty;setTransform()
  },{passive:false});
  function setTransform(){world.style.transform=`translate(${tx}px,${ty}px) scale(${scale})`;document.getElementById("zoomStatus").textContent=Math.round(scale*100)+"%"}
  // Touch support: map pan/pinch + node drag.
  let mapTouchMode=null,mapPinchStart=null,mapPinchScale=1,mapTouchStart=null,mapTouchNodeId=null,mapLongPressTimer=null;
  function touchDistance(a,b){return Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)}
  function touchCenter(a,b){return {x:(a.clientX+b.clientX)/2,y:(a.clientY+b.clientY)/2}}
  function beginNodeTouch(ev,id){
    if(ev.touches.length!==1)return;
    ev.stopPropagation();
    const t=ev.touches[0];mapTouchMode="node";mapTouchNodeId=id;mapTouchStart={x:t.clientX,y:t.clientY};moved=false;
    clearTimeout(mapLongPressTimer);
    mapLongPressTimer=setTimeout(()=>{
      if(appMode==="mindmap"&&!moved){selectNode(id);beginInlineMapEdit(id,"title");mapTouchMode=null}
    },520);
  }
  function handleMapTouchMove(ev){
    if(ev.touches.length===2){
      ev.preventDefault();clearTimeout(mapLongPressTimer);mapTouchMode="pinch";nodeDragging=false;
      const a=ev.touches[0],b=ev.touches[1],r=viewport.getBoundingClientRect(),c=touchCenter(a,b);
      if(!mapPinchStart){
        mapPinchStart={dist:touchDistance(a,b),center:c,tx,ty,scale};
        const mx=c.x-r.left,my=c.y-r.top;mapPinchStart.wx=(mx-tx)/scale;mapPinchStart.wy=(my-ty)/scale;
      }
      const ns=Math.max(.2,Math.min(2.8,mapPinchStart.scale*touchDistance(a,b)/Math.max(1,mapPinchStart.dist)));
      const mx=c.x-r.left,my=c.y-r.top;scale=ns;tx=mx-mapPinchStart.wx*ns;ty=my-mapPinchStart.wy*ns;setTransform();return;
    }
    if(ev.touches.length!==1)return;
    const t=ev.touches[0];
    if(mapTouchMode==="node"&&mapTouchNodeId){
      const dx=t.clientX-mapTouchStart.x,dy=t.clientY-mapTouchStart.y;
      if(Math.hypot(dx,dy)>8&&!nodeDragging&&mapTouchNodeId!==data.id){
        clearTimeout(mapLongPressTimer);nodeDragging=true;dragNodeId=mapTouchNodeId;moved=true;dragStart={x:mapTouchStart.x,y:mapTouchStart.y};
        dragTreeStart=new Map(descendants(findNode(mapTouchNodeId)).map(n=>[n.id,{x:n.pos.x,y:n.pos.y}]));
      }
      if(nodeDragging){
        ev.preventDefault();
        const ddx=(t.clientX-dragStart.x)/scale,ddy=(t.clientY-dragStart.y)/scale;
        dragTreeStart.forEach((p,id)=>{const n=findNode(id);n.pos={x:p.x+ddx,y:p.y+ddy}});
        document.querySelectorAll(".node").forEach(el=>{const n=findNode(el.dataset.id);if(n){el.style.left=n.pos.x+"px";el.style.top=n.pos.y+"px"}});
        redrawEdges();
      }
      return;
    }
    if(mapTouchMode==="pan"){
      ev.preventDefault();tx+=t.clientX-lastX;ty+=t.clientY-lastY;lastX=t.clientX;lastY=t.clientY;setTransform();
    }
  }
  function endMapTouch(ev){
    clearTimeout(mapLongPressTimer);
    if(nodeDragging){nodeDragging=false;save();renderMap()}
    else if(mapTouchMode==="node"&&!moved&&mapTouchNodeId){selectNode(mapTouchNodeId)}
    mapTouchMode=null;mapTouchNodeId=null;mapPinchStart=null;
  }
  viewport.addEventListener("touchstart",ev=>{
    if(ev.touches.length===2){mapTouchMode="pinch";mapPinchStart=null;return}
    if(ev.target.closest(".node"))return;
    if(ev.touches.length===1){const t=ev.touches[0];mapTouchMode="pan";lastX=t.clientX;lastY=t.clientY;nodePanel.classList.remove("open");orderPanel.classList.remove("open");document.getElementById("exportSettingsPanel").classList.remove("open");closeMobileMainSheet()}
  },{passive:false});
  viewport.addEventListener("touchmove",handleMapTouchMove,{passive:false});
  viewport.addEventListener("touchend",endMapTouch,{passive:false});
  viewport.addEventListener("touchcancel",endMapTouch,{passive:false});

  function fitAll(){
    const pts=[];visibleWalk(data,n=>pts.push(n.pos));if(!pts.length)return;const r=viewport.getBoundingClientRect(),fit=MapViewportCore.fit(pts,r.width,r.height);
    scale=fit.scale;tx=fit.tx;ty=fit.ty;setTransform()
  }
  function syncMapLayoutControls(){
    const s=document.getElementById("mapLayoutSelect");if(s)s.value=data.mapLayout||"radial";
  }
  function autoLayout(withCheckpoint=true){
    if(withCheckpoint)checkpoint();
    LayoutCore.apply(data,data.mapLayout||"radial");
    syncMapLayoutControls();save();renderMap();setTimeout(fitAll,20);
    if(withCheckpoint)toast("已按当前展开/折叠状态重排");
  }

  function setMapLayout(layout,reflow=true){
    if(!Core.LAYOUTS.includes(layout))return;
    if(data.mapLayout===layout&&!reflow){syncMapLayoutControls();return}
    checkpoint();data.mapLayout=layout;syncMapLayoutControls();
    if(reflow)autoLayout(false);else{save();renderMap()}
  }
  function renderOrderPanel(){
    const list=document.getElementById("orderList"),order=effectiveOrder(),rank=new Map(order.map((id,i)=>[id,i+1]));list.innerHTML="";
    visibleWalk(data,(n,p,depth)=>{if(n.id===data.id)return;const row=document.createElement("div");row.className="order-row";row.innerHTML=`<div class="level">${depth+1}级</div><div class="name">${esc(n.title)}</div><input type="number" value="${rank.get(n.id)||""}" data-order-id="${n.id}">`;list.appendChild(row)})
  }
