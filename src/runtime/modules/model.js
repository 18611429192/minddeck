import { global } from './env.js';

export const LAYOUTS=['balanced','right','left','down','radial'];
export const THEMES=['light','dark','business','minimal'];
export const THEME_LABELS=Object.freeze({light:'明亮',dark:'深色',business:'商务',minimal:'极简'});
export const ANIMATION_TYPES=['inherit','none','fade','soft','up','left','right','zoom'];
export const ANIMATION_LABELS=Object.freeze({inherit:'跟随默认',none:'无动画',fade:'淡入',soft:'平滑显现',up:'向上浮入',left:'从右向左',right:'从左向右',zoom:'轻微缩放'});
export const MASTER_Z_MIN=0,MASTER_Z_MAX=999,SLIDE_Z_MIN=1000,SLIDE_Z_MAX=999999;

export const Ids={
  create(prefix='e_',length=8){
    const size=Math.max(4,length);
    const random=global.crypto?.randomUUID?.().replaceAll('-','')||Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2);
    return prefix+random.slice(0,size);
  }
};

export const Tree={
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

export const Theme={
  names:Object.freeze(THEMES.slice()),labels:THEME_LABELS,
  normalize(value){return THEMES.includes(value)?value:'light'},
  label(value){const name=Theme.normalize(value);return THEME_LABELS[name]||name},
  apply(target,value){const name=Theme.normalize(value);if(target?.dataset)target.dataset.uiTheme=name;return name}
};

export const Project={
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

export const Layout={
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

export const Presentation={
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

export const Commands={
  addChild(root,parentId,options={}){
    const parent=Tree.findNode(root,parentId);if(!parent)return null;
    const child=options.createNode?options.createNode():Project.createNode();
    parent.children ||= [];
    Layout.positionChild(root,parent,child,parent.children.length,root.mapLayout||'radial');
    parent.children.push(child);parent.collapsed=false;return child;
  },
  addSibling(root,nodeId,options={}){
    const node=Tree.findNode(root,nodeId),parent=Tree.findParent(root,nodeId);if(!node)return null;
    if(!parent)return Commands.addChild(root,nodeId,options);
    const child=options.createNode?options.createNode():Project.createNode();
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
