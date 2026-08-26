import { global } from './env.js';
import { ANIMATION_TYPES, ANIMATION_LABELS, Project, Ids } from './model.js';

export const Animation={
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

export const Element={
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

export const Slide={
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
