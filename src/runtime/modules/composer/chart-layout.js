const CANVAS_W=1600,CANVAS_H=900;
const DEFAULT_BOX=Object.freeze({x:112,y:292,w:1280,h:470});
const SAFE_LEFT=72,SAFE_RIGHT=1528,SAFE_TOP=258,SAFE_BOTTOM=840;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const finite=value=>Number.isFinite(Number(value));

function safeBox(input={}){
  const x=finite(input.x)?Number(input.x):DEFAULT_BOX.x,y=finite(input.y)?Number(input.y):DEFAULT_BOX.y,w=finite(input.w)?Number(input.w):DEFAULT_BOX.w,h=finite(input.h)?Number(input.h):DEFAULT_BOX.h;
  const nw=clamp(w,420,SAFE_RIGHT-SAFE_LEFT),nh=clamp(h,230,SAFE_BOTTOM-SAFE_TOP),nx=clamp(x,SAFE_LEFT,SAFE_RIGHT-nw),ny=clamp(y,SAFE_TOP,SAFE_BOTTOM-nh);
  return {x:nx,y:ny,w:nw,h:nh};
}
function bodyBounds(elements=[]){
  const body=(elements||[]).filter(element=>{
    if(!element||element.hidden||element.type==='chart')return false;
    const y=Number(element.y),h=Number(element.h),w=Number(element.w),x=Number(element.x);
    return [x,y,w,h].every(Number.isFinite)&&w>20&&h>12&&(y>=255||y+h>=330);
  });
  if(!body.length)return {...DEFAULT_BOX};
  const minX=Math.min(...body.map(item=>Number(item.x))),minY=Math.min(...body.map(item=>Number(item.y))),maxX=Math.max(...body.map(item=>Number(item.x)+Number(item.w))),maxY=Math.max(...body.map(item=>Number(item.y)+Number(item.h)));
  return safeBox({x:minX,y:Math.max(270,minY),w:maxX-minX,h:maxY-Math.max(270,minY)});
}
function inset(box,{left=0,right=0,top=0,bottom=0}={}){return safeBox({x:box.x+left,y:box.y+top,w:box.w-left-right,h:box.h-top-bottom})}
function expand(box,{x=0,y=0}={}){return safeBox({x:box.x-x,y:box.y-y,w:box.w+x*2,h:box.h+y*2})}
function scaleAll(box,factor,alignment='center'){
  const nextW=clamp(box.w*factor,420,SAFE_RIGHT-SAFE_LEFT),nextH=clamp(box.h*factor,230,SAFE_BOTTOM-SAFE_TOP),dx=box.w-nextW,dy=box.h-nextH;
  const x=alignment==='left'?box.x:alignment==='right'?box.x+dx:box.x+dx/2;
  return safeBox({x,y:box.y+dy/2,w:nextW,h:nextH});
}
function templateProfile(template={}){
  const family=String(template?.family||'').toLowerCase(),variant=String(template?.layout?.variant||'').toLowerCase();
  if(family.includes('kpi-dashboard'))return variant==='hero'?{width:820,height:430,align:'right',yBias:8}:{width:1060,height:390,align:'center',yBias:20};
  if(family.includes('chart-story'))return variant==='hero'?{width:1310,height:480,align:'left',yBias:0}:{width:1160,height:410,align:'center',yBias:12};
  if(family.includes('trend-chart-analysis'))return variant==='steps'?{width:930,height:430,align:'left',yBias:18}:{width:1360,height:480,align:'center',yBias:0};
  if(family.includes('big-number'))return variant==='hero'?{width:760,height:445,align:'right',yBias:24}:{width:980,height:400,align:'center',yBias:18};
  if(family.includes('metrics-hero'))return {width:850,height:430,align:'right',yBias:12};
  if(family.includes('metrics-cards'))return {width:1100,height:395,align:'center',yBias:16};
  if(family.includes('trend-bars'))return {width:1340,height:475,align:'left',yBias:2};
  if(family.includes('trend-steps'))return {width:950,height:425,align:'left',yBias:18};
  if(variant==='hero')return {width:840,height:430,align:'right',yBias:10};
  if(variant==='cards'||variant==='grid')return {width:1110,height:400,align:'center',yBias:14};
  if(variant==='steps'||variant==='vertical')return {width:960,height:425,align:'left',yBias:18};
  if(variant==='bars'||variant==='line'||variant==='horizontal')return {width:1330,height:470,align:'center',yBias:4};
  if(variant==='split')return {width:1140,height:420,align:'right',yBias:10};
  if(variant==='list'||variant==='table')return {width:1040,height:400,align:'center',yBias:16};
  return {width:1180,height:430,align:'center',yBias:10};
}
function semanticTemplateBox(box,template={}){
  const profile=templateProfile(template),left=clamp(box.x,SAFE_LEFT,SAFE_RIGHT),right=clamp(box.x+box.w,SAFE_LEFT,SAFE_RIGHT),center=(left+right)/2;
  const w=clamp(profile.width,420,SAFE_RIGHT-SAFE_LEFT),h=clamp(profile.height,230,SAFE_BOTTOM-SAFE_TOP);
  let x=center-w/2;
  if(profile.align==='left')x=left;
  else if(profile.align==='right')x=right-w;
  const bodyCenterY=clamp(box.y+box.h/2,SAFE_TOP,SAFE_BOTTOM),y=bodyCenterY-h/2+(profile.yBias||0);
  return safeBox({x,y,w,h});
}
function applyIntent(box,intent={}){
  let next={...box};
  const alignment=['left','center','right'].includes(intent.alignment)?intent.alignment:'center';
  if(intent.contentBalance==='visual')next=expand(next,{x:26,y:10});
  else if(intent.contentBalance==='text')next=inset(next,{left:54,right:54,top:8,bottom:14});
  if(intent.density==='compact')next=inset(next,{left:22,right:22,top:12,bottom:18});
  else if(intent.density==='rich')next=expand(next,{x:18,y:8});
  if(finite(intent.visualWeight))next=scaleAll(next,clamp(Number(intent.visualWeight),.8,1.2),alignment);
  if(intent.titleWeight==='strong')next=inset(next,{top:18});
  else if(intent.titleWeight==='quiet')next=expand(next,{y:8});
  return safeBox(next);
}
export function resolveNativeChartLayout({elements=[],template=null,intent={}}={}){
  const base=bodyBounds(elements),profile=templateProfile(template||{}),templated=semanticTemplateBox(base,template||{}),geometry=applyIntent(templated,intent||{});
  return {geometry,meta:{templateId:template?.id||'',family:template?.family||'',variant:template?.layout?.variant||'',profile,source:'template-body'}};
}
export const NativeChartLayout=Object.freeze({resolve:resolveNativeChartLayout,defaultBox:DEFAULT_BOX});
