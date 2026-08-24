(function(global){
  'use strict';

  const VERSION='9.7.0';
  const LAYOUTS=['balanced','right','left','down','radial'];
  const THEMES=['light','dark','business','minimal'];
  const THEME_LABELS=Object.freeze({light:'明亮',dark:'深色',business:'商务',minimal:'极简'});
  const ANIMATION_TYPES=['inherit','none','fade','soft','up','left','right','zoom'];
  const ANIMATION_LABELS=Object.freeze({inherit:'跟随默认',none:'无动画',fade:'淡入',soft:'平滑显现',up:'向上浮入',left:'从右向左',right:'从左向右',zoom:'轻微缩放'});
  const MASTER_Z_MIN=0,MASTER_Z_MAX=999,SLIDE_Z_MIN=1000,SLIDE_Z_MAX=999999;

  const Ids={
    create(prefix='e_',length=8){return prefix+Math.random().toString(36).slice(2,2+Math.max(4,length))}
  };


  const Tree={
    walkAll(root,fn,parent=null,depth=0){
      if(!root)return;
      fn(root,parent,depth);
      for(const child of root.children||[])Tree.walkAll(child,fn,root,depth+1);
    },
    walkVisible(root,fn,parent=null,depth=0){
      if(!root)return;
      fn(root,parent,depth);
      if(root.collapsed)return;
      for(const child of root.children||[])Tree.walkVisible(child,fn,root,depth+1);
    },
    findNode(root,id){let result=null;Tree.walkAll(root,node=>{if(node.id===id)result=node});return result},
    findParent(root,id){let result=null;Tree.walkAll(root,(node,parent)=>{if(node.id===id)result=parent});return result},
    visibleChildren(node){return node&&node.collapsed?[]:(node?.children||[])},
    descendants(node,includeSelf=true){const out=[];Tree.walkAll(node,n=>out.push(n));return includeSelf?out:out.slice(1)},
    ancestors(root,id,includeSelf=false){
      const out=[];let node=includeSelf?Tree.findNode(root,id):Tree.findParent(root,id);
      while(node){out.unshift(node);node=Tree.findParent(root,node.id)}
      return out;
    },
    visibleIds(root){const ids=[];Tree.walkVisible(root,node=>ids.push(node.id));return ids},
    setAllCollapsed(root,collapsed,includeRoot=false){
      Tree.walkAll(root,node=>{if((node.children||[]).length&&(includeRoot||node!==root))node.collapsed=!!collapsed});
      if(root&&!includeRoot)root.collapsed=false;
      return root;
    }
  };

  const Theme={
    names:Object.freeze(THEMES.slice()),labels:THEME_LABELS,
    normalize(value){return THEMES.includes(value)?value:'light'},
    label(value){const name=Theme.normalize(value);return THEME_LABELS[name]||name},
    apply(target,value){const name=Theme.normalize(value);if(target?.dataset)target.dataset.uiTheme=name;return name}
  };

  const Project={
    normalizeVideo(element){
      if(!element)return element;
      if(!element.fit)element.fit='contain';
      if(element.controls===undefined)element.controls=true;
      if(element.autoplay===undefined)element.autoplay=false;
      if(element.muted===undefined)element.muted=false;
      if(element.loop===undefined)element.loop=false;
      return element;
    },
    normalizeElement(element){
      if(!element)return element;
      if(!element.animation)element.animation={type:'inherit',delay:0,duration:.5};
      if(element.type==='video')Project.normalizeVideo(element);
      return element;
    },
    normalizeLayerRanges(project,ranges={}){
      const masterMin=ranges.masterMin??MASTER_Z_MIN,slideMin=ranges.slideMin??SLIDE_Z_MIN;
      const master=(project.master?.elements||[]).slice().sort((a,b)=>(Number(a.z)||0)-(Number(b.z)||0));
      master.forEach((e,i)=>e.z=masterMin+i);
      Tree.walkAll(project,node=>{
        const arr=(node.slideElements||[]).slice().sort((a,b)=>(Number(a.z)||slideMin)-(Number(b.z)||slideMin));
        arr.forEach((e,i)=>e.z=slideMin+i);
      });
      return project;
    },
    normalize(project,options={}){
      if(!project||typeof project!=='object')throw new Error('Invalid MindDeck project');
      project.schemaVersion ||= options.schemaVersion||1;
      if(!LAYOUTS.includes(project.mapLayout))project.mapLayout=options.fallbackLayout||'radial';
      project.uiTheme=Theme.normalize(project.uiTheme);
      if(!Array.isArray(project.presentationOrder))project.presentationOrder=[];
      if(!project.master||!Array.isArray(project.master.elements)){
        project.master=typeof options.defaultMaster==='function'?options.defaultMaster():{
          bgColor:'#f6f7fb',bgImage:null,bgFit:'cover',tocSide:'left',tocVisibility:'auto',defaultAnimation:'soft',elements:[]
        };
      }
      const master=project.master;
      if(!master.bgColor)master.bgColor='#f6f7fb';
      if(!('bgImage' in master))master.bgImage=null;
      if(!master.bgFit)master.bgFit='cover';
      if(!['left','right'].includes(master.tocSide))master.tocSide='left';
      if(!['auto','show','hide'].includes(master.tocVisibility))master.tocVisibility='auto';
      if(!ANIMATION_TYPES.includes(master.defaultAnimation)||master.defaultAnimation==='inherit')master.defaultAnimation='soft';
      master.elements.forEach(Project.normalizeElement);
      Tree.walkAll(project,node=>{
        if(!Array.isArray(node.children))node.children=[];
        node.collapsed=!!node.collapsed;
        if(!node.pos)node.pos={x:0,y:0};
        if(!Array.isArray(node.slideElements)){
          node.slideElements=typeof options.legacySlideFactory==='function'?options.legacySlideFactory(node):[];
        }
        node.slideElements.forEach(Project.normalizeElement);
      });
      if(options.normalizeLayers!==false)Project.normalizeLayerRanges(project,options.layerRanges||{});
      return project;
    },
    createDefaultMaster(options={}){
      const elements=[];
      if(options.footerText){
        elements.push({id:options.footerId||'m_footer',type:'text',x:70,y:835,w:460,h:34,z:1,text:options.footerText,fontSize:18,fontWeight:500,color:'#7b8390',textAlign:'left',animation:{type:'none',delay:0,duration:.5}});
      }
      return {bgColor:options.bgColor||'#f6f7fb',bgImage:null,bgFit:'cover',tocSide:'left',tocVisibility:'auto',defaultAnimation:'soft',elements};
    },
    createNode(options={}){
      const node={id:options.id||Ids.create('n_',7),title:options.title||'新节点',text:options.text||'',collapsed:false,pos:{x:0,y:0},children:[],slideElements:[]};
      if(typeof options.slideFactory==='function')node.slideElements=options.slideFactory(node)||[];
      return node;
    },
    clone(project){return JSON.parse(JSON.stringify(project))}
  };

  const Layout={
    layouts:LAYOUTS.slice(),
    subtreeWeight(node){
      const kids=Tree.visibleChildren(node);
      return kids.length?kids.reduce((sum,child)=>sum+Layout.subtreeWeight(child),0):1;
    },
    _horizontal(branches,side){
      if(!branches.length)return;
      const X=330,Y=165,state={slot:0},placed=[];
      function assign(node,depth){
        const kids=Tree.visibleChildren(node);let y;
        if(!kids.length)y=state.slot++*Y;
        else{const ys=kids.map(child=>assign(child,depth+1));y=(ys[0]+ys[ys.length-1])/2}
        node.pos={x:side*depth*X,y};placed.push(node);return y;
      }
      branches.forEach(branch=>assign(branch,1));
      if(!placed.length)return;
      const ys=placed.map(node=>node.pos.y),shift=(Math.min(...ys)+Math.max(...ys))/2;
      placed.forEach(node=>node.pos.y-=shift);
    },
    _down(branches){
      if(!branches.length)return;
      const X=220,Y=245,state={slot:0},placed=[];
      function assign(node,depth){
        const kids=Tree.visibleChildren(node);let x;
        if(!kids.length)x=state.slot++*X;
        else{const xs=kids.map(child=>assign(child,depth+1));x=(xs[0]+xs[xs.length-1])/2}
        node.pos={x,y:depth*Y};placed.push(node);return x;
      }
      branches.forEach(branch=>assign(branch,1));
      const xs=placed.map(node=>node.pos.x),shift=(Math.min(...xs)+Math.max(...xs))/2;
      placed.forEach(node=>node.pos.x-=shift);
    },
    _radialKids(parent,base,depth,parentSpan=.9){
      const kids=Tree.visibleChildren(parent);if(!kids.length)return;
      const weights=kids.map(Layout.subtreeWeight),total=Math.max(1,weights.reduce((a,b)=>a+b,0));
      const dist=300+Math.min(depth,2)*26;let cursor=base-parentSpan/2;
      kids.forEach((child,i)=>{
        const span=parentSpan*weights[i]/total,angle=cursor+span/2;cursor+=span;
        child.pos={x:parent.pos.x+Math.cos(angle)*dist,y:parent.pos.y+Math.sin(angle)*dist};
        Layout._radialKids(child,angle,depth+1,Math.max(.28,span*.88));
      });
    },
    _radial(branches){
      const total=Math.max(1,branches.reduce((sum,b)=>sum+Layout.subtreeWeight(b),0));let cursor=-Math.PI/2;
      branches.forEach(branch=>{
        const span=Math.PI*2*Layout.subtreeWeight(branch)/total,angle=cursor+span/2;cursor+=span;
        branch.pos={x:Math.cos(angle)*410,y:Math.sin(angle)*410};
        Layout._radialKids(branch,angle,1,Math.min(1.3,Math.max(.45,span*.72)));
      });
    },
    apply(root,layout=root?.mapLayout||'radial'){
      if(!root)return root;
      if(!LAYOUTS.includes(layout))layout='radial';
      root.mapLayout=layout;root.pos={x:0,y:0};
      const branches=Tree.visibleChildren(root);
      if(layout==='right')Layout._horizontal(branches,1);
      else if(layout==='left')Layout._horizontal(branches,-1);
      else if(layout==='down')Layout._down(branches);
      else if(layout==='balanced'){
        const left=[],right=[];let lw=0,rw=0;
        branches.forEach((branch,index)=>{
          const weight=Layout.subtreeWeight(branch);
          if(index===0||rw<=lw){right.push(branch);rw+=weight}else{left.push(branch);lw+=weight}
        });
        Layout._horizontal(right,1);Layout._horizontal(left,-1);
      }else Layout._radial(branches);
      return root;
    },
    edgePath(a,b,layout='radial'){
      const dx=b.x-a.x,dy=b.y-a.y;
      if(layout==='down'){
        const bend=Math.max(70,Math.abs(dy)*.56),sign=dy>=0?1:-1;
        return `M ${a.x} ${a.y} C ${a.x} ${a.y+sign*bend}, ${b.x} ${b.y-sign*bend}, ${b.x} ${b.y}`;
      }
      if(layout==='left'||layout==='right'||layout==='balanced'||Math.abs(dx)>=Math.abs(dy)){
        const bend=Math.max(80,Math.abs(dx)*.54),sign=dx>=0?1:-1;
        return `M ${a.x} ${a.y} C ${a.x+sign*bend} ${a.y}, ${b.x-sign*bend} ${b.y}, ${b.x} ${b.y}`;
      }
      const bend=Math.max(80,Math.abs(dy)*.52),sign=dy>=0?1:-1;
      return `M ${a.x} ${a.y} C ${a.x} ${a.y+sign*bend}, ${b.x} ${b.y-sign*bend}, ${b.x} ${b.y}`;
    },
    positionChild(root,parent,child,index=0,layout=root?.mapLayout||'radial'){
      const siblings=parent.children||[],offset=(index-Math.max(0,siblings.length-1)/2)*135;
      if(layout==='right'){child.pos={x:parent.pos.x+330,y:parent.pos.y+offset};return child}
      if(layout==='left'){child.pos={x:parent.pos.x-330,y:parent.pos.y+offset};return child}
      if(layout==='down'){child.pos={x:parent.pos.x+offset,y:parent.pos.y+245};return child}
      if(layout==='balanced'){
        const side=parent.id===root.id?(index%2===0?1:-1):(parent.pos.x>=0?1:-1);
        child.pos={x:parent.pos.x+side*330,y:parent.pos.y+offset};return child;
      }
      const gp=Tree.findParent(root,parent.id),gpPos=gp?gp.pos:{x:parent.pos.x-1,y:parent.pos.y};
      const base=parent.id===root.id?-Math.PI/2:Math.atan2(parent.pos.y-gpPos.y,parent.pos.x-gpPos.x);
      const angle=base+(index-Math.max(index,1)/2)*.28;
      child.pos={x:parent.pos.x+Math.cos(angle)*315,y:parent.pos.y+Math.sin(angle)*315};return child;
    }
  };

  const Presentation={
    order(root){
      const defaults=Tree.visibleIds(root),visible=new Set(defaults);
      const custom=(root.presentationOrder||[]).filter(id=>visible.has(id)),seen=new Set(custom);
      defaults.forEach(id=>{if(!seen.has(id))custom.push(id)});
      const rootIndex=custom.indexOf(root.id);
      if(rootIndex>0){custom.splice(rootIndex,1);custom.unshift(root.id)}else if(rootIndex<0)custom.unshift(root.id);
      return custom;
    },
    resolveIndex(root,order,preferredId,fallbackIndex=0){
      let index=order.indexOf(preferredId),parent=Tree.findParent(root,preferredId);
      while(index<0&&parent){index=order.indexOf(parent.id);parent=Tree.findParent(root,parent.id)}
      if(index>=0)return index;
      return Math.max(0,Math.min(fallbackIndex,Math.max(0,order.length-1)));
    },
    rebuild(root,preferredId,fallbackIndex=0){
      const order=Presentation.order(root);
      return {order,index:Presentation.resolveIndex(root,order,preferredId,fallbackIndex)};
    },
    currentId(order,index,rootId){return order[index]||rootId},
    stepIndex(order,index,delta,wrap=true){
      if(!order.length)return 0;
      if(wrap)return (index+delta+order.length)%order.length;
      return Math.max(0,Math.min(order.length-1,index+delta));
    },
    goto(order,id,fallback=0){const i=order.indexOf(id);return i>=0?i:fallback},
    ancestors(root,id){return new Set(Tree.ancestors(root,id,false).map(node=>node.id))},
    configuredTocVisible(master,width){
      const mode=master?.tocVisibility||'auto';
      return mode==='show'?true:mode==='hide'?false:Number(width)>900;
    },
    actualTocVisible(master,width,override=null){return override===null?Presentation.configuredTocVisible(master,width):!!override}
  };

  const Commands={
    addChild(root,parentId,options={}){
      const parent=Tree.findNode(root,parentId);if(!parent)return null;
      const child=options.createNode?options.createNode():{id:'n_'+Math.random().toString(36).slice(2,9),title:'新节点',text:'',collapsed:false,pos:{x:0,y:0},children:[],slideElements:[]};
      parent.children ||= [];
      Layout.positionChild(root,parent,child,parent.children.length,root.mapLayout||'radial');
      parent.children.push(child);parent.collapsed=false;return child;
    },
    addSibling(root,nodeId,options={}){
      const node=Tree.findNode(root,nodeId),parent=Tree.findParent(root,nodeId);if(!node)return null;
      if(!parent)return Commands.addChild(root,nodeId,options);
      const child=options.createNode?options.createNode():{id:'n_'+Math.random().toString(36).slice(2,9),title:'新节点',text:'',collapsed:false,pos:{x:0,y:0},children:[],slideElements:[]};
      const index=parent.children.findIndex(c=>c.id===nodeId);
      Layout.positionChild(root,parent,child,Math.max(0,index+1),root.mapLayout||'radial');
      parent.children.splice(index+1,0,child);parent.collapsed=false;return child;
    },
    deleteNode(root,nodeId){
      if(!root||nodeId===root.id)return {parent:null,removedIds:[]};
      const parent=Tree.findParent(root,nodeId),node=Tree.findNode(root,nodeId);if(!parent||!node)return {parent:null,removedIds:[]};
      const removedIds=Tree.descendants(node,true).map(n=>n.id),removed=new Set(removedIds);
      parent.children=parent.children.filter(c=>c.id!==nodeId);
      root.presentationOrder=(root.presentationOrder||[]).filter(id=>!removed.has(id));
      return {parent,removedIds};
    },
    setCollapsed(root,nodeId,value){const node=Tree.findNode(root,nodeId);if(!node||(node.children||[]).length===0)return null;node.collapsed=!!value;return node},
    toggleCollapsed(root,nodeId){const node=Tree.findNode(root,nodeId);if(!node||(node.children||[]).length===0)return null;return Commands.setCollapsed(root,nodeId,!node.collapsed)},
    setAllCollapsed(root,value){return Tree.setAllCollapsed(root,value,false)},
    applyMapAction(root,selectedId,action,options={}){
      let nextId=selectedId,changed=false,created=null,removed=null,editField=null,blocked=null;
      const current=Tree.findNode(root,selectedId);
      if(action==='type-title'||action==='edit-title'){editField='title';return {selectedId:nextId,changed,editField}}
      if(action==='parent'){
        const parent=Tree.findParent(root,selectedId);if(parent)nextId=parent.id;
      }else if(action==='add-child'){
        created=Commands.addChild(root,selectedId,options);if(created){nextId=created.id;changed=true}
      }else if(action==='add-sibling'){
        created=Commands.addSibling(root,selectedId,options);if(created){nextId=created.id;changed=true}
      }else if(action==='toggle'){
        if(current&&(current.children||[]).length){Commands.toggleCollapsed(root,current.id);changed=true}
      }else if(action==='first-child'){
        if(current?.collapsed&&(current.children||[]).length){Commands.setCollapsed(root,current.id,false);changed=true}
        if((current?.children||[]).length)nextId=current.children[0].id;
      }else if(action==='prev-sibling'||action==='next-sibling'){
        const parent=Tree.findParent(root,selectedId);
        if(parent){const i=parent.children.findIndex(child=>child.id===selectedId),j=i+(action==='prev-sibling'?-1:1);if(j>=0&&j<parent.children.length)nextId=parent.children[j].id}
      }else if(action==='delete'){
        if(selectedId===root.id)blocked='root-delete';
        else{removed=Commands.deleteNode(root,selectedId);if(removed.parent){nextId=removed.parent.id;changed=true}}
      }
      return {selectedId:nextId,changed,created,removed,editField,blocked};
    }
  };

  const Stage={
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

  const MapViewport={
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

  const Animation={
    types:Object.freeze(ANIMATION_TYPES.slice()),labels:ANIMATION_LABELS,
    resolve(element,defaultType='soft'){
      const a=element?.animation||{type:'inherit',delay:0,duration:.5};
      return {type:a.type==='inherit'?(defaultType||'soft'):(a.type||'none'),delay:Number(a.delay)||0,duration:Number(a.duration)||.5};
    },
    apply(dom,element,defaultType='soft'){
      if(!dom)return;
      const a=Animation.resolve(element,defaultType);dom.classList.add('anim-'+a.type);dom.style.animationDelay=a.delay+'s';dom.style.animationDuration=a.duration+'s';dom.style.setProperty('--dur',a.duration+'s');
    }
  };

  const Element={
    create(element,options={}){
      Project.normalizeElement(element);
      const doc=options.document||global.document;if(!doc)throw new Error('Element renderer requires a document');
      const el=doc.createElement('div');
      el.className=options.baseClass||'el';
      el.style.left=(Number(element.x)||0)+'px';el.style.top=(Number(element.y)||0)+'px';el.style.width=(Number(element.w)||0)+'px';el.style.height=(Number(element.h)||0)+'px';el.style.zIndex=element.z??1;
      if(element.type==='text'){
        if(options.textWrapperClass){const tc=doc.createElement('div');tc.className=options.textWrapperClass;tc.textContent=element.text||'';el.appendChild(tc)}else el.textContent=element.text||'';
        el.style.fontSize=(element.fontSize||32)+'px';el.style.fontWeight=element.fontWeight||400;el.style.color=element.color||'#222';el.style.textAlign=element.textAlign||'left';
        if(options.editorTextLayout){el.style.alignItems='flex-start';el.style.justifyContent=element.textAlign==='center'?'center':element.textAlign==='right'?'flex-end':'flex-start'}
      }else if(element.type==='image'){
        const img=doc.createElement('img');img.src=element.src||'';img.style.objectFit=element.fit||'contain';el.appendChild(img);
      }else if(element.type==='video'){
        const v=doc.createElement('video');v.src=element.src||'';v.preload=options.videoPreload||'metadata';v.style.objectFit=element.fit||'contain';v.controls=options.videoControls!==undefined?!!options.videoControls:element.controls!==false;v.autoplay=options.videoAutoplay!==undefined?!!options.videoAutoplay:!!element.autoplay;v.muted=options.videoMuted!==undefined?!!options.videoMuted:!!element.muted;v.loop=!!element.loop;v.playsInline=true;el.appendChild(v);
        if(v.autoplay&&options.playAutoplay!==false){const delay=(Number(element.animation?.delay)||0)*1000+(options.autoplayExtraDelay??80);setTimeout(()=>v.play().catch(()=>{}),Math.max(0,delay))}
      }else if(element.type==='shape'){
        el.style.background=element.fill||'#eee';el.style.borderStyle='solid';el.style.borderColor=element.borderColor||'transparent';el.style.borderWidth=(element.borderWidth||0)+'px';el.style.borderRadius=(element.shape==='circle'?999:(element.radius||0))+'px';
      }
      if(options.animate!==false)Animation.apply(el,element,options.defaultAnimation||'soft');
      return el;
    }
  };

  const Slide={
    defaultElementsForNode(node,options={}){
      const uid=options.uid||(()=>Ids.create('e_',8));
      const text=(value='')=>({id:uid(),type:'text',x:180,y:160,w:620,h:120,z:10,text:value,fontSize:44,fontWeight:700,color:'#1f2329',textAlign:'left',animation:{type:'inherit',delay:0,duration:.5}});
      const shape=(kind='rect')=>({id:uid(),type:'shape',shape:kind,x:260,y:250,w:300,h:180,z:5,fill:'#edf2ff',borderColor:'#b8c5ff',borderWidth:2,radius:kind==='circle'?999:22,animation:{type:'inherit',delay:0,duration:.5}});
      const elements=[{...text(node?.title||'未命名节点'),x:110,y:105,w:1180,h:110,fontSize:58,fontWeight:800,z:10}];
      if(node?.text)elements.push({...text(node.text),x:115,y:260,w:node.image?760:1270,h:340,fontSize:30,fontWeight:400,color:'#5f6878',z:10});
      if(node?.image)elements.push({id:uid(),type:'image',x:930,y:250,w:540,h:390,z:8,src:node.image,fit:'contain',animation:{type:'inherit',delay:.15,duration:.55}});
      if(Array.isArray(node?.points)&&node.points.some(Boolean)){
        node.points.filter(Boolean).slice(0,3).forEach((point,i)=>{
          elements.push({...shape('rect'),x:110+i*470,y:500,w:410,h:210,z:4,fill:'#f7f9fc',borderColor:'#dfe5ef',borderWidth:1,radius:22});
          elements.push({...text(point),x:145+i*470,y:548,w:340,h:110,fontSize:28,fontWeight:700,z:10,animation:{type:'up',delay:.15*i,duration:.5}});
        });
      }
      return elements;
    },
    compose(project,node){
      const items=[];
      for(const element of project.master?.elements||[])items.push({element,master:true});
      for(const element of node?.slideElements||[])items.push({element,master:false});
      items.sort((a,b)=>(Number(a.element.z)||0)-(Number(b.element.z)||0));return items;
    },
    applyBackground(stage,master={}){
      stage.style.backgroundColor=master.bgColor||'#fff';stage.style.backgroundImage=master.bgImage?`url("${master.bgImage}")`:'none';stage.style.backgroundSize=master.bgFit||'cover';stage.style.backgroundPosition='center';
    },
    render(stage,project,node,options={}){
      stage.innerHTML='';Slide.applyBackground(stage,project.master||{});
      for(const item of Slide.compose(project,node)){
        const el=Element.create(item.element,{...options.elementOptions,document:stage.ownerDocument,defaultAnimation:project.master?.defaultAnimation||'soft'});
        if(options.decorate)options.decorate(el,item);stage.appendChild(el);
      }
      return stage;
    }
  };

  const Fullscreen={
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

  const Input={
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


  const Recovery={
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

  const Diagnostics={
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

  const InlineEditor={
    start(options={}){
      const node=options.node,element=options.element,field=options.field||'title';
      if(!node||!element)return null;
      const emptyText=options.emptyText??'',fallbackTitle=options.fallbackTitle||'未命名节点';
      if(field==='text'&&!node.text)element.textContent='';
      element.classList?.remove('empty','inline-empty');
      element.contentEditable='true';element.focus?.();
      if(options.initial!==undefined&&options.initial!==null)element.textContent=String(options.initial);
      const doc=element.ownerDocument||global.document;
      if(doc?.createRange&&global.getSelection){
        const range=doc.createRange(),selection=global.getSelection();
        range.selectNodeContents(element);range.collapse(options.caretAtEnd!==false);
        selection.removeAllRanges();selection.addRange(range);
      }
      let composing=false;
      const sync=()=>{
        let value=String(element.innerText??element.textContent??'').replace(/\n+$/g,'');
        if(field==='title')value=value.replace(/\n/g,' ').trim();
        node[field]=field==='title'?(value||fallbackTitle):value;
        options.onInput?.(node[field],node);
      };
      element.oncompositionstart=()=>{composing=true};
      element.oncompositionend=()=>{composing=false;sync()};
      element.oninput=()=>{if(!composing)sync()};
      element.onkeydown=event=>{
        if(field==='title'&&event.key==='Enter'){event.preventDefault();element.blur()}
        if(event.key==='Escape'){event.preventDefault();element.blur()}
        event.stopPropagation();
      };
      element.onblur=()=>{
        sync();element.contentEditable='false';options.onCommit?.(node[field],node);
      };
      return {sync,stop:()=>element.blur?.()};
    }
  };

  const PresentationSession={
    create(root,preferredId=root?.id,fallbackIndex=0){
      const state=Presentation.rebuild(root,preferredId,fallbackIndex);
      const session={
        root,order:state.order,index:state.index,tocOverride:null,
        currentId(){return Presentation.currentId(this.order,this.index,this.root?.id)},
        currentNode(){return Tree.findNode(this.root,this.currentId())||this.root},
        rebuild(preferredId=this.currentId(),fallback=this.index){const next=Presentation.rebuild(this.root,preferredId,fallback);this.order=next.order;this.index=next.index;return this},
        goto(id){this.index=Presentation.goto(this.order,id,this.index);return this},
        step(delta,wrap=true){this.index=Presentation.stepIndex(this.order,this.index,delta,wrap);return this},
        next(wrap=true){return this.step(1,wrap)},prev(wrap=true){return this.step(-1,wrap)},
        first(){this.index=0;return this},last(){this.index=Math.max(0,this.order.length-1);return this},
        ancestors(){return Presentation.ancestors(this.root,this.currentId())},
        configuredTocVisible(width){return Presentation.configuredTocVisible(this.root?.master,width)},
        actualTocVisible(width){return Presentation.actualTocVisible(this.root?.master,width,this.tocOverride)},
        toggleToc(width){this.tocOverride=!this.actualTocVisible(width);return this.actualTocVisible(width)},
        resetToc(){this.tocOverride=null;return this},
        action(action){
          if(action==='next')this.next();
          else if(action==='prev')this.prev();
          else if(action==='first')this.first();
          else if(action==='last')this.last();
          return this;
        },
        setCollapsed(nodeId,value){const keep=this.currentId();Commands.setCollapsed(this.root,nodeId,value);return this.rebuild(keep,this.index)},
        toggleCollapsed(nodeId){const keep=this.currentId();Commands.toggleCollapsed(this.root,nodeId);return this.rebuild(keep,this.index)},
        setAllCollapsed(value){const keep=this.currentId();Commands.setAllCollapsed(this.root,value);return this.rebuild(keep,this.index)}
      };
      return session;
    }
  };

  const MapRenderer={
    render(root,options={}){
      const doc=options.document||global.document,nodes=options.nodes,edges=options.edges;
      if(!doc||!nodes||!edges)throw new Error('MapRenderer requires document, nodes and edges');
      nodes.innerHTML='';edges.innerHTML='';
      const fragment=doc.createDocumentFragment(),layout=options.layout||root.mapLayout||'radial';
      const orderMap=options.orderMap||null,selectedId=options.selectedId;
      const classes={
        node:options.nodeClass||'node',root:options.rootClass||'root',selected:options.selectedClass||'selected',
        title:options.titleClass||'title',desc:options.descriptionClass||'desc',meta:options.metaClass||'meta',
        fold:options.foldClass||'fold',badge:options.badgeClass||'order-badge',edge:options.edgeClass||'edge',
        empty:options.emptyDescriptionClass||'inline-empty'
      };
      function addNode(node,parent=null,depth=0){
        if(parent){
          const path=doc.createElementNS('http://www.w3.org/2000/svg','path');
          path.setAttribute('class',classes.edge);path.setAttribute('d',Layout.edgePath(parent.pos,node.pos,layout));
          path.dataset.from=parent.id;path.dataset.to=node.id;edges.appendChild(path);
        }
        const el=doc.createElement('div');
        el.className=classes.node+(node.id===root.id?' '+classes.root:'')+(node.id===selectedId?' '+classes.selected:'');
        el.dataset.id=node.id;el.style.left=(Number(node.pos?.x)||0)+'px';el.style.top=(Number(node.pos?.y)||0)+'px';
        if(options.showBadge!==false&&orderMap){
          const badge=doc.createElement('div');badge.className=classes.badge;badge.textContent=orderMap.get(node.id)||'';el.appendChild(badge);
        }
        if((node.children||[]).length){
          const fold=doc.createElement('button');fold.className=classes.fold;fold.textContent=node.collapsed?(options.expandGlyph||'＋'):(options.collapseGlyph||'−');
          fold.onclick=event=>{event.stopPropagation();options.onFold?.(node,event,el)};el.appendChild(fold);
        }
        const title=doc.createElement('div');title.className=classes.title;title.textContent=node.title||'未命名节点';el.appendChild(title);
        if(node.text||options.showEmptyDescription?.(node)){
          const desc=doc.createElement('div');desc.className=classes.desc+(!node.text?' '+classes.empty:'');
          desc.textContent=node.text||(options.emptyDescriptionText||'双击添加说明');el.appendChild(desc);
        }
        const metaText=options.getMeta?.(node,depth);
        if(metaText!==undefined&&metaText!==null&&metaText!==''){
          const meta=doc.createElement('div');meta.className=classes.meta;meta.textContent=String(metaText);el.appendChild(meta);
        }
        if(options.onPointerDown)el.addEventListener('mousedown',event=>options.onPointerDown(node,event,el));
        if(options.onTouchStart)el.addEventListener('touchstart',event=>options.onTouchStart(node,event,el),{passive:false});
        el.onclick=event=>{event.stopPropagation();options.onSelect?.(node,event,el)};
        el.ondblclick=event=>{event.preventDefault();event.stopPropagation();options.onDoubleClick?.(node,event,el)};
        options.decorateNode?.(el,node,depth);
        fragment.appendChild(el);
        if(!node.collapsed)(node.children||[]).forEach(child=>addNode(child,node,depth+1));
      }
      addNode(root,null,0);nodes.appendChild(fragment);
      return {nodes,edges};
    }
  };

  const TocRenderer={
    render(container,session,options={}){
      const doc=options.document||global.document;if(!container||!doc||!session)throw new Error('TocRenderer requires container and session');
      container.innerHTML='';
      const active=session.currentId(),ancestors=session.ancestors(),rank=new Map(session.order.map((id,i)=>[id,i+1]));
      const classes={
        item:options.itemClass||'toc-item',active:options.activeClass||'active',ancestor:options.ancestorClass||'ancestor',
        fold:options.foldClass||'fold-mini',placeholder:options.placeholderClass||'placeholder',
        number:options.numberClass||'num',label:options.labelClass||'label'
      };
      Tree.walkVisible(session.root,(node,parent,depth)=>{
        const item=doc.createElement('div');item.dataset.id=node.id;
        item.className=classes.item+(node.id===active?' '+classes.active:ancestors.has(node.id)?' '+classes.ancestor:'');
        item.style.paddingLeft=(options.baseIndent??8)+depth*(options.indent??15)+'px';
        const hasChildren=(node.children||[]).length>0;
        if(options.foldFirst!==false){
          const fold=doc.createElement('button');fold.className=classes.fold+(hasChildren?'':' '+classes.placeholder);
          fold.textContent=hasChildren?(node.collapsed?(options.expandGlyph||'＋'):(options.collapseGlyph||'−')):(options.leafGlyph||'·');
          if(!hasChildren&&options.hideLeafFold!==false)fold.style.visibility='hidden';
          if(hasChildren)fold.onclick=event=>{event.stopPropagation();options.onFold?.(node,event,item)};
          item.appendChild(fold);
        }
        const number=doc.createElement(options.numberTag||'span');number.className=classes.number;number.textContent=rank.get(node.id)||'';item.appendChild(number);
        const label=doc.createElement(options.labelTag||'span');label.className=classes.label;label.textContent=node.title||'未命名';item.appendChild(label);
        if(options.foldFirst===false&&hasChildren){
          const fold=doc.createElement('button');fold.className=classes.fold;fold.textContent=node.collapsed?(options.expandGlyph||'＋'):(options.collapseGlyph||'−');
          fold.onclick=event=>{event.stopPropagation();options.onFold?.(node,event,item)};item.appendChild(fold);
        }
        item.onclick=event=>{if(event.target.closest?.('.'+classes.fold))return;options.onGoto?.(node,event,item)};
        options.decorateItem?.(item,node,depth,rank.get(node.id)||0);
        container.appendChild(item);
      });
      return {active,count:session.order.length};
    },
    updateHighlight(container,session,options={}){
      if(!container||!session)return;
      const active=session.currentId(),ancestors=session.ancestors(),itemClass=options.itemClass||'toc-item',activeClass=options.activeClass||'active',ancestorClass=options.ancestorClass||'ancestor';
      container.querySelectorAll('.'+itemClass).forEach(el=>{
        el.classList.toggle(activeClass,el.dataset.id===active);
        el.classList.toggle(ancestorClass,el.dataset.id!==active&&ancestors.has(el.dataset.id));
      });
    }
  };

  const PresentationView={
  defaults:Object.freeze({
    width:1600,height:900,stagePadding:20,tocBaseIndent:8,tocIndent:15,
    expandGlyph:'＋',collapseGlyph:'−',wheelThreshold:12,wheelThrottle:420,swipeAxisRatio:1.3
  }),
  create(options={}){
    const doc=options.document||global.document,win=options.window||global;
    const data=options.data,session=options.session;
    if(!doc||!win||!data||!session)throw new Error('PresentationView requires document, window, data and session');
    const resolve=value=>typeof value==='function'?value():value;
    const cfg={...PresentationView.defaults,...(options.config||{})};
    let bound=false,touchStart=null,wheelLocked=false;
    const listeners=[];
    const on=(target,type,handler,listenerOptions)=>{if(!target?.addEventListener)return;target.addEventListener(type,handler,listenerOptions);listeners.push(()=>target.removeEventListener(type,handler,listenerOptions))};
    const active=()=>options.isActive?!!options.isActive():true;
    const view={
      data,session,
      fit(){return Stage.apply(resolve(options.stage),resolve(options.stageWrap),{width:cfg.width,height:cfg.height,padding:cfg.stagePadding})},
      applySide(){
        const layout=resolve(options.tocLayout),toc=resolve(options.tocContainer),right=data.master?.tocSide==='right';
        if(layout&&options.rightClass)layout.classList.toggle(options.rightClass,right);
        if(toc&&options.tocRightClass)toc.classList.toggle(options.tocRightClass,right);
        if(layout&&toc&&options.moveToc){if(right)layout.appendChild(toc);else layout.insertBefore(toc,layout.firstChild)}
        return right;
      },
      applyTocVisibility(fit=true){
        const layout=resolve(options.tocLayout),button=resolve(options.tocToggle),show=session.actualTocVisible(win.innerWidth);
        if(layout)layout.classList.toggle(options.tocHiddenClass||'toc-hidden',!show);
        if(button){button.textContent=show?'×':'☰';button.title=show?'隐藏目录':'显示目录'}
        options.onTocVisibility?.(show,view);
        if(fit)win.requestAnimationFrame?.(()=>view.fit());
        return show;
      },
      toggleToc(){session.toggleToc(win.innerWidth);return view.applyTocVisibility()},
      renderToc(){
        const tree=resolve(options.tocTree);if(!tree)return null;
        const count=resolve(options.tocCount);
        if(count){const format=options.tocCountFormatter||((n)=>n+' 项');count.textContent=format(session.order.length)}
        return TocRenderer.render(tree,session,{
          document:doc,itemClass:options.itemClass||'toc-item',activeClass:options.activeClass||'active',ancestorClass:options.ancestorClass||'ancestor',
          foldClass:options.foldClass||'fold-mini',placeholderClass:options.placeholderClass||'placeholder',numberClass:options.numberClass||'num',labelClass:options.labelClass||'label',
          foldFirst:false,baseIndent:cfg.tocBaseIndent,indent:cfg.tocIndent,expandGlyph:cfg.expandGlyph,collapseGlyph:cfg.collapseGlyph,
          onFold:node=>{session.toggleCollapsed(node.id);options.onFold?.(node,view);view.render({rebuild:false})},
          onGoto:node=>{session.goto(node.id);options.onGoto?.(node,view);view.render({rebuild:false})},
          decorateItem:options.decorateTocItem
        });
      },
      updateHighlight(){
        const tree=resolve(options.tocTree);if(!tree)return;
        TocRenderer.updateHighlight(tree,session,{itemClass:options.itemClass||'toc-item',activeClass:options.activeClass||'active',ancestorClass:options.ancestorClass||'ancestor'});
      },
      render(renderOptions={}){
        if(renderOptions.rebuild!==false)session.rebuild(session.currentId(),session.index);
        const stage=resolve(options.stage);if(!stage)return null;
        Slide.render(stage,data,session.currentNode()||data,{
          elementOptions:{baseClass:options.elementClass||'present-el',animate:true,defaultAnimation:data.master?.defaultAnimation||'soft',...(options.elementOptions||{})},
          decorate:options.decorateSlideElement
        });
        view.applySide();view.renderToc();view.applyTocVisibility(false);view.updateHighlight();view.fit();
        if(options.scrollActive){const tree=resolve(options.tocTree);tree?.querySelector?.('.'+(options.itemClass||'toc-item')+'.'+(options.activeClass||'active'))?.scrollIntoView?.({behavior:'smooth',block:'center'})}
        options.afterRender?.(session.currentNode()||data,view);
        return stage;
      },
      refresh(preferredId=session.currentId(),fallback=session.index){session.rebuild(preferredId,fallback);return view.render({rebuild:false})},
      step(delta,wrap=true){session.step(delta,wrap);return view.render({rebuild:false})},
      action(action){
        if(['next','prev','first','last'].includes(action)){session.action(action);view.render({rebuild:false});return true}
        if(action==='toc'){view.toggleToc();return true}
        if(action==='fullscreen'){Fullscreen.toggle(resolve(options.fullscreenTarget)||doc.documentElement,doc);return true}
        if(action==='exit'){
          if(options.onExit)options.onExit(view);
          else if(Fullscreen.isActive(doc))Fullscreen.exit(doc);
          return true;
        }
        return false;
      },
      handleKey(event){
        if(!active())return false;
        const action=Input.presentationKeyAction(event);if(!action)return false;
        event.preventDefault?.();return view.action(action);
      },
      bindInput(){
        if(bound)return view;bound=true;
        const touchTarget=resolve(options.touchTarget)||resolve(options.stageWrap),exclude=options.excludeSelector||'.toc,#toc,video,input,textarea,select,[contenteditable="true"]';
        on(touchTarget,'touchstart',event=>{
          if(!active()||event.touches?.length!==1||event.target?.closest?.(exclude))return;
          const t=event.touches[0];touchStart={x:t.clientX,y:t.clientY,time:Date.now()};
        },{passive:true});
        on(touchTarget,'touchend',event=>{
          if(!active()||!touchStart||!event.changedTouches?.length)return;
          const t=event.changedTouches[0],step=Input.swipeStep(touchStart,{x:t.clientX,y:t.clientY,time:Date.now()},{axisRatio:cfg.swipeAxisRatio});touchStart=null;
          if(step)view.step(step);
        },{passive:true});
        on(win,'wheel',event=>{
          if(!active()||event.target?.closest?.(exclude))return;
          const step=Input.wheelStep(event,cfg.wheelThreshold);if(!step)return;
          event.preventDefault?.();if(wheelLocked)return;wheelLocked=true;view.step(step);win.setTimeout(()=>wheelLocked=false,cfg.wheelThrottle);
        },{passive:false});
        on(win,'resize',()=>{if(!active())return;if(session.tocOverride===null)view.applyTocVisibility();else view.fit()});
        return view;
      },
      destroy(){listeners.splice(0).forEach(off=>off());bound=false;touchStart=null;wheelLocked=false}
    };
    return view;
  }
};

  const ExportData={
    project(project,kind='fusion'){
      const copy=Project.clone(project);
      if(kind==='mindmap'){
        delete copy.master;delete copy.presentationOrder;
        Tree.walkAll(copy,node=>{delete node.slideElements});
      }
      return copy;
    }
  };

  const Portable={
    mount(options={}){
      const data=options.data,kind=options.kind||'fusion',doc=options.document||global.document,win=options.window||global;
      if(!data||!doc)throw new Error('Portable.mount requires data and document');
      const W=options.width||1600,H=options.height||900;
      Project.normalize(data,{normalizeLayers:false});
      let mode=kind==='presentation'?'presentation':'map',selectedId=data.id;
      let mapScale=.8,mapTx=win.innerWidth/2,mapTy=win.innerHeight/2,moved=false,nodeDrag=null,mapPan=null,touchState=null;
      const session=PresentationSession.create(data,data.id,0);
      const $=id=>doc.getElementById(id),find=id=>Tree.findNode(data,id),parent=id=>Tree.findParent(data,id);
      const mapVp=$('mapVp'),mapWorld=$('mapWorld');
      const toast=message=>{const t=$('toast');if(!t)return;t.textContent=message;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1400)};
      const storageKey='minddeck-portable-'+(data.projectName||data.id);
      const saveLocal=()=>{if(kind==='presentation')return;try{win.localStorage?.setItem(storageKey,JSON.stringify(data))}catch{}};
      if(kind!=='presentation'){try{const raw=win.localStorage?.getItem(storageKey);if(raw){const parsed=JSON.parse(raw);Object.keys(data).forEach(k=>delete data[k]);Object.assign(data,parsed);Project.normalize(data,{normalizeLayers:false});session.root=data;session.rebuild(data.id,0)}}catch{}}
      const mapTransform=()=>{if(mapWorld)mapWorld.style.transform=`translate(${mapTx}px,${mapTy}px) scale(${mapScale})`};
      const orderMap=()=>new Map(Presentation.order(data).map((id,i)=>[id,i+1]));
      const renderMap=()=>{
        MapRenderer.render(data,{
          document:doc,nodes:$('mapNodes'),edges:$('mapEdges'),selectedId,layout:data.mapLayout,orderMap:orderMap(),
          rootClass:'root',selectedClass:'sel',titleClass:'ntitle',descriptionClass:'ndesc',emptyDescriptionClass:'empty',
          metaClass:'meta',badgeClass:'order-badge',foldClass:'fold',showBadge:false,emptyDescriptionText:'双击添加说明',
          showEmptyDescription:node=>node.id===selectedId,
          onFold:node=>{Commands.toggleCollapsed(data,node.id);saveLocal();session.rebuild(session.currentId(),session.index);renderMap();if(mode==='presentation')renderPresentation()},
          onSelect:()=>{}, // overwritten after render by decorateNode to preserve drag-click semantics
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
      const applyToc=()=>presentationView.applyTocVisibility();
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

  const Architecture=Object.freeze({
    singleSources:Object.freeze({
      ids:'Ids',tree:'Tree',project:'Project',layout:'Layout',commands:'Commands',presentation:'Presentation + PresentationSession + PresentationView',
      mapRender:'MapRenderer',tocRender:'TocRenderer',slideRender:'Slide + Element',animation:'Animation',
      viewport:'Stage + MapViewport',input:'Input',fullscreen:'Fullscreen',theme:'Theme',
      diagnostics:'Diagnostics',recovery:'Recovery',presentationView:'PresentationView',portable:'Portable'
    }),
    adapters:Object.freeze(['main-editor-ui','portable-shell','storage-adapters','file-system-build'])
  });

  global.MindDeckCore=Object.freeze({VERSION,LAYOUTS:Object.freeze(LAYOUTS.slice()),THEMES:Object.freeze(THEMES.slice()),RANGES:Object.freeze({MASTER_Z_MIN,MASTER_Z_MAX,SLIDE_Z_MIN,SLIDE_Z_MAX}),Ids,Tree,Theme,Project,Layout,Presentation,PresentationSession,Commands,Stage,MapViewport,Animation,Element,Slide,Fullscreen,Input,Recovery,Diagnostics,InlineEditor,MapRenderer,TocRenderer,PresentationView,ExportData,Portable,Architecture});
})(typeof globalThis!=='undefined'?globalThis:window);
