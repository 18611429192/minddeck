import { global } from './env.js';
import { LAYOUTS, THEMES, MASTER_Z_MIN, MASTER_Z_MAX, SLIDE_Z_MIN, SLIDE_Z_MAX, Project, Tree, Presentation } from './model.js';

export const Stage={
  fitRect(containerWidth,containerHeight,stageWidth=1600,stageHeight=900,padding=20,paddingY=padding){
    const aw=Math.max(1,Number(containerWidth)-padding),ah=Math.max(1,Number(containerHeight)-paddingY);
    return {scale:Math.max(.01,Math.min(aw/stageWidth,ah/stageHeight)),width:stageWidth,height:stageHeight};
  },
  apply(stage,container,options={}){
    if(!stage||!container)return {scale:1,width:options.width||1600,height:options.height||900};
    const width=options.width||1600,height=options.height||900,padding=options.padding??20,r=container.getBoundingClientRect();
    const fit=Stage.fitRect(r.width,r.height,width,height,padding);
    stage.style.width=width+'px';stage.style.height=height+'px';stage.style.minWidth=width+'px';stage.style.minHeight=height+'px';stage.style.flex='0 0 auto';stage.style.transform='scale('+fit.scale+')';
    return fit;
  }
};

export const MapViewport={
  fit(points,containerWidth,containerHeight,options={}){
    const pts=(points||[]).filter(p=>p&&Number.isFinite(Number(p.x))&&Number.isFinite(Number(p.y)));
    if(!pts.length)return {scale:1,tx:Number(containerWidth)/2||0,ty:Number(containerHeight)/2||0};
    const marginX=options.marginX??190,marginY=options.marginY??150,padding=options.padding??80;
    const minScale=options.minScale??.23,maxScale=options.maxScale??1;
    const minX=Math.min(...pts.map(p=>Number(p.x)))-marginX,maxX=Math.max(...pts.map(p=>Number(p.x)))+marginX;
    const minY=Math.min(...pts.map(p=>Number(p.y)))-marginY,maxY=Math.max(...pts.map(p=>Number(p.y)))+marginY;
    const width=Math.max(1,maxX-minX),height=Math.max(1,maxY-minY),cw=Math.max(1,Number(containerWidth)||1),ch=Math.max(1,Number(containerHeight)||1);
    const scale=Math.max(minScale,Math.min(maxScale,Math.min((cw-padding)/width,(ch-padding)/height)));
    const cx=(minX+maxX)/2,cy=(minY+maxY)/2;
    return {scale,tx:cw/2-cx*scale,ty:ch/2-cy*scale,bounds:{minX,maxX,minY,maxY}};
  },
  clampScale(value,min=.2,max=2.8){return Math.max(min,Math.min(max,Number(value)||1))},
  zoomAt(state,pointer,factor,options={}){
    const min=options.min??.2,max=options.max??2.8;
    const scale=MapViewport.clampScale(state.scale*factor,min,max),px=Number(pointer.x)||0,py=Number(pointer.y)||0;
    const wx=(px-state.tx)/state.scale,wy=(py-state.ty)/state.scale;
    return {scale,tx:px-wx*scale,ty:py-wy*scale};
  }
};

export const Fullscreen={
  isActive(doc=global.document){return !!doc?.fullscreenElement},
  async enter(target){
    if(!target?.requestFullscreen)return false;
    try{await target.requestFullscreen();return true}catch{return false}
  },
  async exit(doc=global.document){
    if(!doc?.fullscreenElement||!doc.exitFullscreen)return true;
    try{await doc.exitFullscreen();return true}catch{return false}
  },
  async toggle(target,doc=global.document){return Fullscreen.isActive(doc)?Fullscreen.exit(doc):Fullscreen.enter(target)}
};

export const Input={
  presentationKeyAction(event){
    const key=event?.key;
    if(key==='ArrowRight'||key==='ArrowDown'||key===' '||key==='PageDown')return 'next';
    if(key==='ArrowLeft'||key==='ArrowUp'||key==='PageUp')return 'prev';
    if(key==='Home')return 'first';if(key==='End')return 'last';
    if(key==='t'||key==='T')return 'toc';if(key==='f'||key==='F')return 'fullscreen';if(key==='Escape')return 'exit';
    return null;
  },
  mapKeyAction(event){
    const key=event?.key;
    if(key==='Tab')return event.shiftKey?'parent':'add-child';
    if(key==='Enter')return 'add-sibling';
    if(key===' ')return 'toggle';
    if(key==='ArrowLeft')return 'parent';
    if(key==='ArrowRight')return 'first-child';
    if(key==='ArrowUp')return 'prev-sibling';
    if(key==='ArrowDown')return 'next-sibling';
    if(key==='F2')return 'edit-title';
    if(key==='Delete'||key==='Backspace')return 'delete';
    if(!event?.ctrlKey&&!event?.metaKey&&!event?.altKey&&typeof key==='string'&&key.length===1&&key!==' ')return 'type-title';
    return null;
  },
  wheelStep(event,threshold=12){
    const dx=Number(event?.deltaX)||0,dy=Number(event?.deltaY)||0;if(Math.abs(dx)<threshold&&Math.abs(dy)<threshold)return 0;
    const primary=Math.abs(dy)>=Math.abs(dx)?dy:dx;return primary>0?1:-1;
  },
  swipeStep(start,end,options={}){
    if(!start||!end)return 0;
    const maxTime=options.maxTime??900,minDistance=options.minDistance??55,axisRatio=options.axisRatio??1.25;
    const dx=end.x-start.x,dy=end.y-start.y,dt=(end.time??Date.now())-(start.time??0);
    if(dt<0||dt>maxTime||Math.abs(dx)<minDistance||Math.abs(dx)<=Math.abs(dy)*axisRatio)return 0;
    return dx<0?1:-1;
  }
};

export const Recovery={
  estimateUtf8Bytes(text){
    const value=String(text??'');
    if(typeof TextEncoder!=='undefined')return new TextEncoder().encode(value).length;
    if(typeof Buffer!=='undefined')return Buffer.byteLength(value,'utf8');
    return unescape(encodeURIComponent(value)).length;
  },
  historyLimitForBytes(bytes){
    if(bytes>8*1024*1024)return 6;
    if(bytes>2*1024*1024)return 20;
    return 80;
  },
  createEnvelope(project,reason='manual-backup',date=new Date()){
    return {format:1,savedAt:date.toISOString(),reason,project:Project.clone(project)};
  },
  parseEnvelope(value){
    try{
      const parsed=typeof value==='string'?JSON.parse(value):value;
      if(!parsed||parsed.format!==1||!parsed.project||typeof parsed.project!=='object')return null;
      return parsed;
    }catch{return null}
  }
};

export const Diagnostics={
  inspect(project,options={}){
    const masterZMin=options.masterZMin??MASTER_Z_MIN,masterZMax=options.masterZMax??MASTER_Z_MAX;
    const slideZMin=options.slideZMin??SLIDE_Z_MIN,slideZMax=options.slideZMax??SLIDE_Z_MAX;
    const results=[],nodeIds=new Map(),elementIds=new Map(),badGeometry=[],badLayers=[],emptyMedia=[];
    let nodeCount=0,visibleCount=0,elementCount=0,mediaBytes=0;
    const push=(level,name,detail)=>results.push({level,name,detail});
    Tree.walkAll(project,node=>{
      nodeCount++;
      if(node.id)nodeIds.set(node.id,(nodeIds.get(node.id)||0)+1);
      else push('fail','节点 ID',`发现没有 ID 的节点：${node.title||'未命名'}`);
      if(!Array.isArray(node.children))push('fail','节点结构',`${node.title||node.id||'未命名'} 的 children 不是数组`);
      for(const element of node.slideElements||[]){
        elementCount++;
        if(element.id)elementIds.set(element.id,(elementIds.get(element.id)||0)+1);
        const nums=[element.x,element.y,element.w,element.h].map(Number);
        if(nums.some(v=>!Number.isFinite(v))||Number(element.w)<=0||Number(element.h)<=0)badGeometry.push(`${node.title||node.id} / ${element.type||'元素'}`);
        if(Number(element.z)<slideZMin||Number(element.z)>slideZMax)badLayers.push(`${node.title||node.id} / ${element.id||element.type||'元素'}`);
        if(element.type==='image'||element.type==='video'){
          if(!element.src)emptyMedia.push(`${node.title||node.id} / ${element.type}`);
          else if(String(element.src).startsWith('data:'))mediaBytes+=Math.ceil(String(element.src).length*.75);
        }
      }
    });
    Tree.walkVisible(project,()=>visibleCount++);
    for(const element of project.master?.elements||[]){
      elementCount++;
      if(element.id)elementIds.set(element.id,(elementIds.get(element.id)||0)+1);
      if(Number(element.z)<masterZMin||Number(element.z)>masterZMax)badLayers.push(`母版 / ${element.id||element.type||'元素'}`);
      if((element.type==='image'||element.type==='video')&&element.src&&String(element.src).startsWith('data:'))mediaBytes+=Math.ceil(String(element.src).length*.75);
    }
    const duplicateNodes=[...nodeIds].filter(([,count])=>count>1).map(([id])=>id);
    const duplicateElements=[...elementIds].filter(([,count])=>count>1).map(([id])=>id);
    const allNodeIds=new Set(nodeIds.keys()),staleOrder=(project.presentationOrder||[]).filter(id=>!allNodeIds.has(id));
    push(duplicateNodes.length?'fail':'pass','节点唯一性',duplicateNodes.length?`重复节点 ID：${duplicateNodes.slice(0,6).join(', ')}${duplicateNodes.length>6?' …':''}`:`${nodeCount} 个节点 ID 均唯一`);
    push(duplicateElements.length?'fail':'pass','元素唯一性',duplicateElements.length?`重复元素 ID：${duplicateElements.slice(0,6).join(', ')}${duplicateElements.length>6?' …':''}`:`${elementCount} 个页面/母版元素未发现重复 ID`);
    push(badGeometry.length?'fail':'pass','页面几何',badGeometry.length?`发现 ${badGeometry.length} 个尺寸或坐标异常元素：${badGeometry.slice(0,4).join('；')}`:'页面元素坐标和尺寸有效');
    push(badLayers.length?'warn':'pass','图层范围',badLayers.length?`发现 ${badLayers.length} 个图层值超出页面/母版约定范围`:'页面与母版图层区间正常');
    push(emptyMedia.length?'warn':'pass','媒体资源',emptyMedia.length?`发现 ${emptyMedia.length} 个图片/视频缺少资源地址`:`未发现空媒体资源；内嵌媒体约 ${mediaBytes} B`);
    push(staleOrder.length?'warn':'pass','演示顺序',staleOrder.length?`自定义顺序中有 ${staleOrder.length} 个已不存在的节点引用`:`${Presentation.order(project).length} 个当前可播放节点，顺序引用有效`);
    push(LAYOUTS.includes(project.mapLayout)?'pass':'fail','导图布局',LAYOUTS.includes(project.mapLayout)?`当前布局：${project.mapLayout}；当前可见节点 ${visibleCount}`:`未知布局：${project.mapLayout}`);
    push(THEMES.includes(project.uiTheme)?'pass':'fail','外观主题',THEMES.includes(project.uiTheme)?`当前主题：${project.uiTheme}`:`未知主题：${project.uiTheme}`);
    const tocOk=['auto','show','hide'].includes(project.master?.tocVisibility)&&['left','right'].includes(project.master?.tocSide);
    push(tocOk?'pass':'fail','演示目录',tocOk?`目录：${project.master.tocVisibility} / ${project.master.tocSide}`:'母版目录显示或位置配置无效');
    let serialized='';try{serialized=JSON.stringify(project);JSON.parse(serialized);push('pass','项目序列化',`项目数据约 ${Recovery.estimateUtf8Bytes(serialized)} B`)}catch(err){push('fail','项目序列化',err.message)}
    const fail=results.filter(x=>x.level==='fail').length,warn=results.filter(x=>x.level==='warn').length,pass=results.filter(x=>x.level==='pass').length;
    return {results,pass,warn,fail,score:Math.max(0,Math.round(100-fail*22-warn*5)),nodeCount,visibleCount,elementCount,mediaBytes,visibleIds:Tree.visibleIds(project),serializedBytes:Recovery.estimateUtf8Bytes(serialized)};
  }
};
