const CANVAS_W=1600,CANVAS_H=900;
const DEFAULT_BOX=Object.freeze({x:112,y:292,w:1280,h:470});
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const finite=value=>Number.isFinite(Number(value));

function safeBox(input={}){
  const x=finite(input.x)?Number(input.x):DEFAULT_BOX.x,y=finite(input.y)?Number(input.y):DEFAULT_BOX.y,w=finite(input.w)?Number(input.w):DEFAULT_BOX.w,h=finite(input.h)?Number(input.h):DEFAULT_BOX.h;
  const nx=clamp(x,72,1450),ny=clamp(y,258,790),nw=clamp(w,420,CANVAS_W-nx-72),nh=clamp(h,230,CANVAS_H-ny-60);
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
function scaleWidth(box,factor,alignment='center'){
  const nextW=clamp(box.w*factor,420,CANVAS_W-144),delta=box.w-nextW;
  const x=alignment==='left'?box.x:alignment==='right'?box.x+delta:box.x+delta/2;
  return safeBox({...box,x,w:nextW});
}
function scaleAll(box,factor,alignment='center'){
  const next=scaleWidth(box,factor,alignment),nextH=clamp(next.h*factor,230,CANVAS_H-next.y-60),delta=next.h-nextH;
  return safeBox({...next,y:next.y+delta/2,h:nextH});
}
function semanticTemplateBox(box,template={}){
  const family=String(template?.family||'').toLowerCase(),variant=String(template?.layout?.variant||'').toLowerCase();
  if(family.includes('kpi-dashboard'))return variant==='hero'?inset(box,{left:30,right:104,top:6,bottom:24}):inset(box,{left:72,right:72,top:20,bottom:28});
  if(family.includes('chart-story'))return variant==='hero'?expand(inset(box,{left:12,right:44,top:4,bottom:8}),{x:14,y:8}):inset(box,{left:48,right:26,top:16,bottom:16});
  if(family.includes('trend-chart-analysis'))return variant==='steps'?inset(box,{left:106,right:38,top:22,bottom:12}):inset(box,{left:18,right:52,top:6,bottom:10});
  if(family.includes('big-number'))return inset(expand(box,{x:20,y:6}),{left:104,right:26,top:26,bottom:4});
  if(variant==='hero')return expand(inset(box,{left:18,right:18,top:4,bottom:4}),{x:18,y:8});
  if(variant==='cards'||variant==='grid'||family.includes('dashboard'))return inset(box,{left:44,right:44,top:14,bottom:18});
  if(variant==='steps'||variant==='vertical')return inset(box,{left:92,right:52,top:18,bottom:10});
  if(variant==='bars'||variant==='line'||variant==='horizontal')return inset(box,{left:12,right:26,top:4,bottom:8});
  if(variant==='split')return inset(box,{left:36,right:36,top:10,bottom:10});
  if(variant==='list'||variant==='table')return inset(box,{left:64,right:46,top:14,bottom:18});
  return box;
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
  const base=bodyBounds(elements),templated=semanticTemplateBox(base,template||{}),geometry=applyIntent(templated,intent||{});
  return {geometry,meta:{templateId:template?.id||'',family:template?.family||'',variant:template?.layout?.variant||'',source:'template-body'}};
}
export const NativeChartLayout=Object.freeze({resolve:resolveNativeChartLayout,defaultBox:DEFAULT_BOX});
