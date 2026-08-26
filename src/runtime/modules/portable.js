import { global } from './env.js';
import { Project, Tree, Presentation, Commands, Layout, Theme } from './model.js';
import { MapViewport, Input } from './platform.js';
import { Slide } from './slide.js';
import { PresentationSession, MapRenderer, InlineEditor, PresentationView } from './view.js';

export const ExportData={
  project(project,kind='fusion'){
    const copy=Project.clone(project);
    if(kind==='mindmap'){
      delete copy.master;delete copy.presentationOrder;
      Tree.walkAll(copy,node=>{delete node.slideElements});
    }
    return copy;
  }
};

export const Portable={
  mount(options={}){
    const data=options.data,kind=options.kind||'fusion',doc=options.document||global.document,win=options.window||global;
    if(!data||!doc)throw new Error('Portable.mount requires data and document');
    Project.normalize(data,{normalizeLayers:false});
    let mode=kind==='presentation'?'presentation':'map',selectedId=data.id;
    let mapScale=.8,mapTx=win.innerWidth/2,mapTy=win.innerHeight/2,moved=false,nodeDrag=null,mapPan=null,touchState=null;
    const session=PresentationSession.create(data,data.id,0);
    const $=id=>doc.getElementById(id),find=id=>Tree.findNode(data,id);
    const mapVp=$('mapVp'),mapWorld=$('mapWorld');
    const toast=message=>{const t=$('toast');if(!t)return;t.textContent=message;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1400)};
    const storageKey='minddeck-portable-'+(data.projectName||data.id);
    const saveLocal=()=>{if(kind==='presentation')return;try{win.localStorage?.setItem(storageKey,JSON.stringify(data))}catch{}};
    if(kind!=='presentation'){
      try{
        const raw=win.localStorage?.getItem(storageKey);
        if(raw){const parsed=JSON.parse(raw);Object.keys(data).forEach(k=>delete data[k]);Object.assign(data,parsed);Project.normalize(data,{normalizeLayers:false});session.root=data;session.rebuild(data.id,0)}
      }catch{}
    }
    const mapTransform=()=>{if(mapWorld)mapWorld.style.transform=`translate(${mapTx}px,${mapTy}px) scale(${mapScale})`};
    const orderMap=()=>new Map(Presentation.order(data).map((id,i)=>[id,i+1]));
    const renderMap=()=>{
      MapRenderer.render(data,{
        document:doc,nodes:$('mapNodes'),edges:$('mapEdges'),selectedId,layout:data.mapLayout,orderMap:orderMap(),
        rootClass:'root',selectedClass:'sel',titleClass:'ntitle',descriptionClass:'ndesc',emptyDescriptionClass:'empty',
        metaClass:'meta',badgeClass:'order-badge',foldClass:'fold',showBadge:false,emptyDescriptionText:'双击添加说明',
        showEmptyDescription:node=>node.id===selectedId,
        onFold:node=>{Commands.toggleCollapsed(data,node.id);saveLocal();session.rebuild(session.currentId(),session.index);renderMap();if(mode==='presentation')renderPresentation()},
        onSelect:()=>{},
        onDoubleClick:(node,event)=>{selectedId=node.id;renderMap();setTimeout(()=>startInline(node.id,event.target.closest('.ndesc')?'text':'title'),0)},
        onPointerDown:(node,event)=>beginNodeDrag(event,node.id),
        decorateNode:(el,node)=>{
          el.onclick=event=>{event.stopPropagation();if(moved){moved=false;return}selectedId=node.id;renderMap()};
        }
      });
      mapTransform();
    };
    const startInline=(id,field,initial)=>{
      const node=find(id);if(!node)return;selectedId=id;renderMap();
      const host=doc.querySelector(`.node[data-id="${id}"]`),target=field==='text'?host?.querySelector('.ndesc'):host?.querySelector('.ntitle');
      if(!target)return;
      InlineEditor.start({node,element:target,field,initial,caretAtEnd:initial===undefined,onCommit:()=>{saveLocal();renderMap()}});
    };
    const beginNodeDrag=(event,id)=>{
      if(event.button!==0||event.target.closest('.fold')||event.target.closest('[contenteditable="true"]'))return;
      event.preventDefault();event.stopPropagation();if(id===data.id)return toast('中心节点不能拖动');
      const node=find(id);nodeDrag={id,startX:event.clientX,startY:event.clientY,positions:new Map(Tree.descendants(node,true).map(n=>[n.id,{x:n.pos.x,y:n.pos.y}]))};moved=false;
    };
    win.addEventListener('mousemove',event=>{
      if(nodeDrag){
        const dx=(event.clientX-nodeDrag.startX)/mapScale,dy=(event.clientY-nodeDrag.startY)/mapScale;if(Math.hypot(dx,dy)>3)moved=true;
        nodeDrag.positions.forEach((pos,id)=>{const node=find(id);if(node){node.pos.x=pos.x+dx;node.pos.y=pos.y+dy}});
        renderMap();
      }else if(mapPan){mapTx=mapPan.tx+event.clientX-mapPan.x;mapTy=mapPan.ty+event.clientY-mapPan.y;mapTransform()}
    });
    win.addEventListener('mouseup',()=>{if(nodeDrag){nodeDrag=null;saveLocal()}mapPan=null});
    mapVp?.addEventListener('mousedown',event=>{if(mode!=='map'||event.button!==0||event.target.closest('.node'))return;mapPan={x:event.clientX,y:event.clientY,tx:mapTx,ty:mapTy};event.preventDefault()});
    const fitMap=()=>{
      const points=[];Tree.walkVisible(data,node=>points.push(node.pos));if(!points.length)return;
      const rect=mapVp.getBoundingClientRect(),fit=MapViewport.fit(points,rect.width,rect.height);
      mapScale=fit.scale;mapTx=fit.tx;mapTy=fit.ty;mapTransform();
    };
    mapVp?.addEventListener('wheel',event=>{
      if(mode!=='map'||event.target.closest('.node'))return;event.preventDefault();
      const rect=mapVp.getBoundingClientRect(),next=MapViewport.zoomAt({scale:mapScale,tx:mapTx,ty:mapTy},{x:event.clientX-rect.left,y:event.clientY-rect.top},event.deltaY<0?1.12:.89);
      mapScale=next.scale;mapTx=next.tx;mapTy=next.ty;mapTransform();
    },{passive:false});
    const touchDistance=(a,b)=>Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
    mapVp?.addEventListener('touchstart',event=>{
      if(mode!=='map')return;
      if(event.touches.length===2){touchState={type:'pinch',distance:touchDistance(event.touches[0],event.touches[1]),scale:mapScale};return}
      if(event.touches.length===1&&!event.target.closest('.node')){const t=event.touches[0];touchState={type:'pan',x:t.clientX,y:t.clientY,tx:mapTx,ty:mapTy}}
    },{passive:false});
    mapVp?.addEventListener('touchmove',event=>{
      if(!touchState||mode!=='map')return;
      if(touchState.type==='pan'&&event.touches.length===1){event.preventDefault();mapTx=touchState.tx+event.touches[0].clientX-touchState.x;mapTy=touchState.ty+event.touches[0].clientY-touchState.y;mapTransform()}
      else if(touchState.type==='pinch'&&event.touches.length===2){event.preventDefault();mapScale=MapViewport.clampScale(touchState.scale*touchDistance(event.touches[0],event.touches[1])/Math.max(1,touchState.distance),.2,2.8);mapTransform()}
    },{passive:false});
    mapVp?.addEventListener('touchend',()=>{touchState=null},{passive:true});
    const newNode=()=>Project.createNode({title:'新节点',slideFactory:kind==='fusion'?(node=>Slide.defaultElementsForNode(node)):undefined});
    const mapAction=action=>{
      const result=Commands.applyMapAction(data,selectedId,action,{createNode:newNode});
      if(result.blocked==='root-delete')return toast('中心节点不能删除');
      selectedId=result.selectedId;
      if(result.changed)saveLocal();
      renderMap();
    };
    const autoLayout=()=>{Layout.apply(data,data.mapLayout||'radial');saveLocal();renderMap();setTimeout(fitMap,20)};
    const tocContainer=$('toc');
    const tocHead=doc.createElement('div');tocHead.id='tocHead';
    tocHead.innerHTML='<div id="tocHeadTop"><div class="tocTitle"></div><button class="tocAct" id="pOpen">全开</button><button class="tocAct" id="pClose">全收</button><button class="tocAct" id="pHide">×</button></div>';
    const tocBody=doc.createElement('div');tocBody.id='tocBody';tocContainer.innerHTML='';tocContainer.append(tocHead,tocBody);
    const presentationView=PresentationView.create({
      data,session,document:doc,window:win,stage:$('stage'),stageWrap:$('stageWrap'),tocTree:tocBody,tocLayout:$('pLayout'),tocContainer,tocToggle:$('tocToggle'),tocCount:tocHead.querySelector('.tocTitle'),
      tocCountFormatter:n=>`演示目录 · ${n} 项`,rightClass:'right',tocHiddenClass:'toc-hidden',itemClass:'tocItem',foldClass:'foldBtn',placeholderClass:'placeholder',numberClass:'num',labelClass:'label',elementClass:'el',
      fullscreenTarget:doc.documentElement,isActive:()=>mode==='presentation',onFold:()=>{saveLocal();renderMap()}
    });
    presentationView.bindInput();
    const renderPresentation=()=>presentationView.render();
    const fitStage=()=>presentationView.fit();
    const toggleToc=()=>presentationView.toggleToc();
    const setAllFold=value=>{session.setAllCollapsed(value);saveLocal();renderMap();if(mode==='presentation')presentationView.render({rebuild:false})};
    $('pOpen').onclick=()=>setAllFold(false);$('pClose').onclick=()=>setAllFold(true);$('pHide').onclick=()=>{session.tocOverride=false;presentationView.applyTocVisibility()};
    const switchMode=next=>{
      if(kind!=='fusion')next=kind==='presentation'?'presentation':'map';mode=next;
      $('mapView').classList.toggle('on',next==='map');$('presentationView').classList.toggle('on',next==='presentation');
      $('mapMode').classList.toggle('on',next==='map');$('presentMode').classList.toggle('on',next==='presentation');
      $('tocToggle').classList.toggle('hidden',next!=='presentation');$('fullBtn').classList.toggle('hidden',next!=='presentation');
      if(next==='map'){renderMap();setTimeout(fitMap,20)}
      else{presentationView.render();presentationView.applyTocVisibility()}
    };
    const exportJson=()=>{
      const copy=ExportData.project(data,kind==='mindmap'?'mindmap':'fusion');
      const blob=new Blob([JSON.stringify(copy,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=doc.createElement('a');
      a.href=url;a.download=(data.projectName||data.title||'minddeck')+(kind==='mindmap'?'-思维导图':'')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    };
    $('mapMode').onclick=()=>switchMode('map');$('presentMode').onclick=()=>switchMode('presentation');$('fitBtn').onclick=fitMap;
    $('layoutSel').value=data.mapLayout||'radial';$('layoutSel').onchange=event=>{data.mapLayout=event.target.value;autoLayout()};
    Theme.apply(doc.body,data.uiTheme);$('themeSel').value=data.uiTheme||'light';$('themeSel').onchange=event=>{data.uiTheme=Theme.normalize(event.target.value);Theme.apply(doc.body,data.uiTheme);saveLocal()};
    $('reflowBtn').onclick=autoLayout;$('expandBtn').onclick=()=>setAllFold(false);$('collapseBtn').onclick=()=>setAllFold(true);$('exportMapBtn').onclick=exportJson;
    $('tocToggle').onclick=toggleToc;$('fullBtn').onclick=()=>presentationView.action('fullscreen');
    const editing=()=>{const a=doc.activeElement;return a&&(['INPUT','TEXTAREA','SELECT'].includes(a.tagName)||a.isContentEditable)};
    win.addEventListener('keydown',event=>{
      if(editing())return;
      if(mode==='presentation'){presentationView.handleKey(event);return}
      const action=Input.mapKeyAction(event);if(!action)return;event.preventDefault();
      if(action==='type-title')startInline(selectedId,'title',event.key);
      else if(action==='edit-title')startInline(selectedId,'title');
      else mapAction(action);
    });
    win.addEventListener('resize',()=>{if(mode==='map')fitMap()});
    switchMode(mode);
    return {data,session,renderMap,renderPresentation,fitMap,fitStage,switchMode};
  }
};

export const Architecture=Object.freeze({
  singleSources:Object.freeze({
    ids:'Ids',tree:'Tree',project:'Project',layout:'Layout',commands:'Commands',presentation:'Presentation + PresentationSession + PresentationView',
    mapRender:'MapRenderer',tocRender:'TocRenderer',slideRender:'Slide + Element',animation:'Animation',
    viewport:'Stage + MapViewport',input:'Input',fullscreen:'Fullscreen',theme:'Theme',
    diagnostics:'Diagnostics',recovery:'Recovery',presentationView:'PresentationView',portable:'Portable'
  }),
  adapters:Object.freeze(['main-editor-ui','portable-shell','storage-adapters','file-system-build'])
});
