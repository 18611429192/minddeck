(() => {
  const W=1600,H=900,APP_VERSION="9.7.0 RC",RUNTIME_VERSION="9.7.0",RELEASE_CHANNEL="rc";
  const Core=globalThis.MindDeckCore;
  if(!Core||Core.VERSION!==RUNTIME_VERSION)throw new Error(`MindDeck shared runtime mismatch: ${Core?.VERSION||"missing"} / ${RUNTIME_VERSION}`);
  const {Ids:IdsCore,Tree:TreeCore,Theme:ThemeCore,Project:ProjectCore,Layout:LayoutCore,Presentation:PresentationCore,PresentationSession:PresentationSessionCore,Commands:CommandsCore,Stage:StageCore,MapViewport:MapViewportCore,Element:ElementCore,Slide:SlideCore,Fullscreen:FullscreenCore,Input:InputCore,Recovery:RecoveryCore,Diagnostics:DiagnosticsCore,InlineEditor:InlineEditorCore,MapRenderer:MapRendererCore,TocRenderer:TocRendererCore,PresentationView:PresentationViewCore,ExportData:ExportDataCore,Portable:PortableCore}=Core;
  const animTypes=Core.Animation.types.map(type=>[type,Core.Animation.labels[type]||type]);

  const defaultMaster=()=>ProjectCore.createDefaultMaster({footerText:"MindDeck · 思维导图式演示"});
  function nodeSlideFromLegacy(n){return SlideCore.defaultElementsForNode(n,{uid:()=>IdsCore.create("e_",8)})}

  const demo={
    id:"root",title:"代码之外，研发真正的价值在哪里？",text:"从会写代码，走向理解业务、发现问题、解决真实需求。",
    collapsed:false,pos:{x:0,y:0},children:[
      {id:"business",title:"业务理解",text:"理解目标、流程和约束，而不是只接收需求转述。",collapsed:false,pos:{x:0,y:-400},children:[
        {id:"need",title:"真正的需求",text:"需求文档写的是功能，现场暴露的是问题。",collapsed:false,pos:{x:-250,y:-720},children:[
          {id:"deep",title:"把问题问到具体",text:"谁在用、什么时候用、真正卡住的是什么？",collapsed:false,pos:{x:-430,y:-1000},children:[]}
        ]},
        {id:"process",title:"业务流程",text:"搞清楚上下游、使用场景和失败后的影响。",collapsed:false,pos:{x:30,y:-760},children:[]},
        {id:"result",title:"结果价值",text:"不以功能数量衡量，而以是否真正解决问题衡量。",collapsed:false,pos:{x:310,y:-710},children:[]}
      ]},
      {id:"onsite",title:"到现场去",text:"现场不是替代研发，而是帮助研发建立真实认知。",collapsed:false,pos:{x:430,y:0},children:[
        {id:"observe",title:"看真实使用",text:"看用户怎么操作、在哪里卡住。",collapsed:false,pos:{x:750,y:-220},children:[]},
        {id:"talk",title:"直接沟通",text:"和真正使用系统的人聊。",collapsed:false,pos:{x:790,y:20},children:[]},
        {id:"return",title:"带着问题回来",text:"把现场问题转成可验证、可交付的方案。",collapsed:false,pos:{x:740,y:270},children:[]}
      ]},
      {id:"solid",title:"把功能做扎实",text:"少做自以为是的创新，多做真正有人用的功能。",collapsed:false,pos:{x:0,y:400},children:[
        {id:"stable",title:"稳定可用",text:"交付出去的东西首先要稳定、清晰、可维护。",collapsed:false,pos:{x:-190,y:720},children:[]},
        {id:"feedback",title:"快速反馈",text:"小步验证，让使用者尽快给反馈。",collapsed:false,pos:{x:190,y:720},children:[]}
      ]},
      {id:"growth",title:"我的成长",text:"价值不只来自代码量，而来自解决问题的能力。",collapsed:false,pos:{x:-430,y:0},children:[
        {id:"tech",title:"技术能力",text:"技术仍然是基础，但不是终点。",collapsed:false,pos:{x:-735,y:-250},children:[]},
        {id:"judge",title:"判断能力",text:"知道什么值得做、什么不值得做。",collapsed:false,pos:{x:-790,y:0},children:[]},
        {id:"owner",title:"对结果负责",text:"从完成任务转向把问题解决。",collapsed:false,pos:{x:-735,y:250},children:[]}
      ]}
    ],
    schemaVersion:1,presentationOrder:[],mapLayout:"balanced",uiTheme:"light",master:defaultMaster()
  };

  const STORAGE_KEY="minddeck-v9-data",BACKUP_KEY="minddeck-v9-backup",LEGACY_STORAGE_KEYS=["minddeck-v8-data","minddeck-v6-data","minddeck-v5-data"];
  let startupRecovery=null,loadedStorageKey=null;
  function safeStorageRead(key){
    try{const raw=localStorage.getItem(key);if(!raw)return null;return JSON.parse(raw)}catch(err){console.warn("MindDeck storage read failed",key,err);return null}
  }
  let stored=safeStorageRead(STORAGE_KEY);if(stored)loadedStorageKey=STORAGE_KEY;
  if(!stored){
    const envelope=safeStorageRead(BACKUP_KEY);
    if(envelope?.project){stored=envelope.project;startupRecovery={reason:"主自动保存不可用，已载入恢复备份",savedAt:envelope.savedAt};loadedStorageKey=BACKUP_KEY}
  }
  if(!stored){for(const key of LEGACY_STORAGE_KEYS){const old=safeStorageRead(key);if(old){stored=old;loadedStorageKey=key;break}}}
  if(!stored)stored=demo;
  let data=stored;
  ProjectCore.normalize(data,{schemaVersion:1,defaultMaster,legacySlideFactory:nodeSlideFromLegacy,layerRanges:{masterMin:Core.RANGES.MASTER_Z_MIN,slideMin:Core.RANGES.SLIDE_Z_MIN}});

  let selectedNodeId=data.id;
  let appMode=localStorage.getItem("minddeck-v8-app-mode")||"presentation";
  let scale=.78,tx=innerWidth/2,ty=innerHeight/2-20;
  let panning=false,lastX=0,lastY=0;
  let nodeDragging=false,dragNodeId=null,dragStart=null,dragTreeStart=null,moved=false;

  // editor state
  let editorOpen=false,editorMode="slide",editorNodeId=null,selectedEls=new Set(),selectionAnchorId=null;
  let editorScale=1,editorFitScale=1,editorPanX=0,editorPanY=0,editorViewTouched=false;
  let draggingEl=false,resizingEl=false,resizeCorner=null,activeElId=null,elStart=null,pointerStart=null;
  let mobileMultiSelectMode=false,mobilePropOpen=false,mobileEditorGesture=null;
  let elementClipboard=[];
  let undoStack=[],redoStack=[];
  let historyLock=false;
  // presentation
  let presentation=false,presentationSession=null,presentationView=null;

  const workspace=document.getElementById("workspace");
  const viewport=document.getElementById("viewport"),world=document.getElementById("world"),edges=document.getElementById("edges"),nodesEl=document.getElementById("nodes");
  const nodePanel=document.getElementById("nodePanel"),orderPanel=document.getElementById("orderPanel");
  const editorShell=document.getElementById("editorShell"),editorStage=document.getElementById("editorStage"),editorBg=document.getElementById("editorBg");
  const propPanel=document.getElementById("propPanel"),propContent=document.getElementById("propContent"),masterEmptyPanel=document.getElementById("masterEmptyPanel");

  function uid(){return IdsCore.create("e_",8)}
  const clone=ProjectCore.clone;
  let autosaveTimer=null,lastSavedJson="",lastBackupAt=0,storageError=false;
  function setSaveStatus(state,label){const el=document.getElementById("saveStatus");if(!el)return;el.classList.remove("saved","pending","error");el.classList.add(state);el.querySelector("b").textContent=label}
  function backupEnvelopeFromJson(json,reason){try{return RecoveryCore.createEnvelope(JSON.parse(json),reason)}catch{return null}}
  function writeRecoveryBackup(json,reason="autosave-previous",force=false){
    if(!json)return false;if(!force&&Date.now()-lastBackupAt<60000)return false;
    try{const env=backupEnvelopeFromJson(json,reason);if(!env)return false;localStorage.setItem(BACKUP_KEY,JSON.stringify(env));lastBackupAt=Date.now();updateRecoveryButton();return true}catch(err){console.warn("MindDeck backup skipped",err);return false}
  }
  function persistProjectNow(reason="autosave"){
    if(autosaveTimer){clearTimeout(autosaveTimer);autosaveTimer=null}
    try{
      const json=JSON.stringify(data);
      if(lastSavedJson&&lastSavedJson!==json)writeRecoveryBackup(lastSavedJson,"previous-save",false);
      localStorage.setItem(STORAGE_KEY,json);lastSavedJson=json;storageError=false;setSaveStatus("saved","已保存");return true;
    }catch(err){
      storageError=true;console.warn("MindDeck autosave failed",err);setSaveStatus("error","未保存");toast("浏览器本地存储空间不足，请保存项目 JSON 或 .minddeck");return false;
    }
  }
  function save(force=false){
    if(force)return persistProjectNow("manual");
    setSaveStatus("pending","待保存");if(autosaveTimer)clearTimeout(autosaveTimer);autosaveTimer=setTimeout(()=>persistProjectNow("autosave"),450);return true;
  }
  function saveNow(reason="manual"){return persistProjectNow(reason)}
  function createRecoveryBackup(reason="manual-backup"){
    try{const json=JSON.stringify(data);const env=backupEnvelopeFromJson(json,reason);if(!env)return false;localStorage.setItem(BACKUP_KEY,JSON.stringify(env));lastBackupAt=Date.now();updateRecoveryButton();return true}catch(err){console.warn("MindDeck recovery backup failed",err);return false}
  }
  function readRecoveryBackup(){const env=safeStorageRead(BACKUP_KEY);return env?.project?env:null}
  function updateRecoveryButton(){const btn=document.getElementById("restoreBackupBtn");if(!btn)return;const env=readRecoveryBackup();btn.disabled=!env;btn.title=env?`备份时间：${new Date(env.savedAt||Date.now()).toLocaleString()}`:"暂无可恢复备份"}
  function restoreRecoveryBackup(){
    const env=readRecoveryBackup();if(!env){toast("暂无可恢复备份");return}if(!confirm(`恢复 ${new Date(env.savedAt||Date.now()).toLocaleString()} 的备份？当前内容会先保存为新的恢复点。`))return;
    createRecoveryBackup("before-restore");data=clone(env.project);normalize();applyUiTheme();syncMapLayoutControls();selectedNodeId=data.id;saveNow("restore");renderMap();renderOrderPanel();fitAll();updateMobileNodeContext();toast("已恢复备份");
  }
  function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
  function visibleWalk(n,fn,parent=null,depth=0){return TreeCore.walkVisible(n,fn,parent,depth)}
  function findNode(id){return TreeCore.findNode(data,id)}
  function descendants(n){return TreeCore.descendants(n,true)}
  function effectiveOrder(){return PresentationCore.order(data)}
  function normalize(){
    ProjectCore.normalize(data,{schemaVersion:1,defaultMaster,legacySlideFactory:nodeSlideFromLegacy,layerRanges:{masterMin:Core.RANGES.MASTER_Z_MIN,slideMin:Core.RANGES.SLIDE_Z_MIN}});
  }

  function normalizeVideo(e){return ProjectCore.normalizeVideo(e)}

  function dataSnapshot(){return JSON.stringify(data)}
  function checkpoint(){
    if(historyLock)return;
    const s=dataSnapshot();
    if(!undoStack.length || undoStack[undoStack.length-1]!==s)undoStack.push(s);
    const historyLimit=RecoveryCore.historyLimitForBytes(RecoveryCore.estimateUtf8Bytes(s));
    while(undoStack.length>historyLimit)undoStack.shift();
    redoStack=[];
  }
  function restoreSnapshot(s){
    historyLock=true;
    data=JSON.parse(s);normalize();save();
    historyLock=false;
    if(editorOpen){
      selectedEls.clear();renderEditor();updateMasterPanel();
    }else{
      renderMap();renderOrderPanel();fitAll();
    }
  }
  function undo(){
    if(!undoStack.length)return;
    const cur=dataSnapshot(),prev=undoStack.pop();
    redoStack.push(cur);restoreSnapshot(prev);toast("已撤销");
  }
  function redo(){
    if(!redoStack.length)return;
    const cur=dataSnapshot(),next=redoStack.pop();
    undoStack.push(cur);restoreSnapshot(next);toast("已重做");
  }

  let lastHealthReport=null;
  function byteEstimate(str){return RecoveryCore.estimateUtf8Bytes(str)}
  function formatBytes(n){n=Math.max(0,Number(n)||0);if(n<1024)return n+" B";if(n<1024*1024)return (n/1024).toFixed(1)+" KB";return (n/1024/1024).toFixed(2)+" MB"}
  function healthResult(level,name,detail){return {level,name,detail}}
  function projectHealthChecks(){
    const report=DiagnosticsCore.inspect(data,{masterZMin:MASTER_Z_MIN,masterZMax:MASTER_Z_MAX,slideZMin:SLIDE_Z_MIN,slideZMax:SLIDE_Z_MAX});
    const results=report.results.map(r=>{
      if(r.name==="媒体资源"&&r.level==="pass")return {...r,detail:`未发现空媒体资源；内嵌媒体约 ${formatBytes(report.mediaBytes)}`};
      if(r.name==="项目序列化"&&r.level==="pass")return {...r,detail:`项目数据约 ${formatBytes(report.serializedBytes)}`};
      return r;
    });
    if(report.serializedBytes>4*1024*1024)results.push(healthResult("warn","浏览器本地存储","项目已超过约 4 MB；不同浏览器 localStorage 上限不同，请优先保存 JSON/.minddeck"));
    const recovery=readRecoveryBackup();results.push(storageError?healthResult("warn","自动保存","当前浏览器自动保存失败，请立即导出项目文件"):healthResult("pass","自动保存",recovery?`自动保存正常；有恢复备份 ${new Date(recovery.savedAt||Date.now()).toLocaleString()}`:"自动保存正常；首次产生改动后会建立恢复点"));
    results.push(Math.abs(W/H-16/9)<1e-9?healthResult("pass","16:9 舞台",`${W}×${H} 固定虚拟画布，响应式仅等比缩放`):healthResult("fail","16:9 舞台",`当前虚拟画布为 ${W}×${H}`));
    return results;
  }
  function exportHealthChecks(){
    const results=[];
    [["思维导图 HTML",buildStandaloneMindmapHtml],["独立演示 HTML",buildStandaloneViewerHtml],["融合 HTML",buildStandaloneFusionHtml]].forEach(([name,builder])=>{
      try{const out=builder();validateExportHtml(out,name);results.push(healthResult("pass",name,`生成成功，${formatBytes(byteEstimate(out))}，Runtime ${RUNTIME_VERSION}`))}
      catch(err){results.push(healthResult("fail",name,err?.message||String(err)))}
    });
    return results;
  }
  function runProjectHealthCheck(includeExports=true){
    normalize();
    const results=projectHealthChecks();
    if(includeExports)results.push(...exportHealthChecks());
    const fail=results.filter(r=>r.level==="fail").length,warn=results.filter(r=>r.level==="warn").length,pass=results.filter(r=>r.level==="pass").length;
    const score=Math.max(0,Math.round(100-fail*22-warn*5));
    lastHealthReport={version:APP_VERSION,runtimeVersion:RUNTIME_VERSION,time:new Date().toISOString(),score,pass,warn,fail,results};
    return lastHealthReport;
  }
  function renderHealthReport(report){
    const summary=document.getElementById("healthSummary"),score=document.getElementById("healthScore"),title=document.getElementById("healthTitle"),meta=document.getElementById("healthMeta"),list=document.getElementById("healthList");
    summary.classList.remove("ok","warn","fail");summary.classList.add(report.fail?"fail":report.warn?"warn":"ok");score.textContent=report.score;
    title.textContent=report.fail?`${report.fail} 项需要处理`:report.warn?`${report.warn} 项风险提示`:"核心检查全部通过";
    meta.textContent=`通过 ${report.pass} · 警告 ${report.warn} · 失败 ${report.fail} · ${new Date(report.time).toLocaleString()}`;
    list.innerHTML="";report.results.forEach(r=>{const row=document.createElement("div");row.className=`health-check ${r.level}`;row.innerHTML=`<div class="health-icon">${r.level==="pass"?"✓":r.level==="warn"?"!":"×"}</div><div><div class="health-name"></div><div class="health-detail"></div></div>`;row.querySelector(".health-name").textContent=r.name;row.querySelector(".health-detail").textContent=r.detail;list.appendChild(row)});
  }
  function openHealthPanel(){
    closeMobileMainSheet();hideMobileNodeContext();nodePanel.classList.remove("open");orderPanel.classList.remove("open");document.getElementById("exportSettingsPanel").classList.remove("open");
    const panel=document.getElementById("healthPanel");
    panel.classList.remove("panel-collapsed");panel.classList.add("open");
    if(activeCollapsedMapPanelId==="healthPanel")activeCollapsedMapPanelId=null;
    document.getElementById("panelRestoreHandle")?.classList.remove("open");
    const report=runProjectHealthCheck(true);renderHealthReport(report);
    toast(report.fail?"自检发现需要处理的问题":report.warn?"自检完成：有风险提示":"自检通过");
  }
  function healthReportText(report=lastHealthReport){
    if(!report)return "MindDeck 尚未运行项目自检";
    return [`MindDeck V${report.version} 项目自检`,`时间：${report.time}`,`评分：${report.score} / 100`,`通过 ${report.pass} · 警告 ${report.warn} · 失败 ${report.fail}`,"",...report.results.map(r=>`[${r.level.toUpperCase()}] ${r.name}：${r.detail}`)].join("\n");
  }
  function assertProjectExportReady(){
    const report=runProjectHealthCheck(false);if(report.fail){hideMobileNodeContext();renderHealthReport(report);document.getElementById("healthPanel").classList.add("open");throw new Error(`项目自检有 ${report.fail} 项失败，请先处理`)}return report;
  }

  const DEFAULT_EXPORT_SETTINGS={
    fusionMode:"separate",
    packageMode:"auto",
    imageLimitMB:1,
    videoLimitMB:3,
    totalLimitMB:15
  };

  function getExportSettings(){
    try{
      return {...DEFAULT_EXPORT_SETTINGS,...JSON.parse(localStorage.getItem("minddeck-v8-export-settings")||"{}")};
    }catch{return {...DEFAULT_EXPORT_SETTINGS}}
  }
  function setExportSettings(s){
    localStorage.setItem("minddeck-v8-export-settings",JSON.stringify(s));
  }
  function renderExportSettings(){
    const s=getExportSettings();
    document.getElementById("exportFusionMode").value=s.fusionMode||"separate";
    document.getElementById("exportPackageMode").value=s.packageMode;
    document.getElementById("exportImageLimit").value=s.imageLimitMB;
    document.getElementById("exportVideoLimit").value=s.videoLimitMB;
    document.getElementById("exportTotalLimit").value=s.totalLimitMB;
  }
  function readExportSettings(){
    return {
      fusionMode:document.getElementById("exportFusionMode").value,
      packageMode:document.getElementById("exportPackageMode").value,
      imageLimitMB:Math.max(0,Number(document.getElementById("exportImageLimit").value)||0),
      videoLimitMB:Math.max(0,Number(document.getElementById("exportVideoLimit").value)||0),
      totalLimitMB:Math.max(0,Number(document.getElementById("exportTotalLimit").value)||0)
    };
  }

  function sanitizeFilename(s){
    return String(s||"MindDeck演示").replace(/[\\/:*?"<>|]/g,"_").replace(/\s+/g," ").trim().slice(0,80)||"MindDeck演示";
  }
  function downloadBlob(blob,name){
    const u=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(u),2000);
  }

  function parseDataUrl(src){
    if(typeof src!=="string"||!src.startsWith("data:"))return null;
    const comma=src.indexOf(",");if(comma<0)return null;
    const header=src.slice(5,comma),payload=src.slice(comma+1);
    const parts=header.split(";"),mime=parts[0]||"application/octet-stream",base64=parts.includes("base64");
    return {mime,base64,payload};
  }
  function dataUrlByteSize(src){
    const p=parseDataUrl(src);if(!p)return 0;
    if(p.base64){
      const clean=p.payload.replace(/\s/g,""),pad=(clean.endsWith("==")?2:clean.endsWith("=")?1:0);
      return Math.max(0,Math.floor(clean.length*3/4)-pad);
    }
    try{return new TextEncoder().encode(decodeURIComponent(p.payload)).length}catch{return p.payload.length}
  }
  function dataUrlToBytes(src){
    const p=parseDataUrl(src);if(!p)return null;
    if(p.base64){
      const bin=atob(p.payload),out=new Uint8Array(bin.length);
      for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);
      return {mime:p.mime,bytes:out};
    }
    return {mime:p.mime,bytes:new TextEncoder().encode(decodeURIComponent(p.payload))};
  }
  function bytesToDataUrl(bytes,mime){
    let bin="",chunk=0x8000;
    for(let i=0;i<bytes.length;i+=chunk)bin+=String.fromCharCode(...bytes.subarray(i,Math.min(i+chunk,bytes.length)));
    return `data:${mime||"application/octet-stream"};base64,${btoa(bin)}`;
  }
  function extForMime(mime){
    const m=(mime||"").toLowerCase();
    const map={
      "image/png":"png","image/jpeg":"jpg","image/jpg":"jpg","image/webp":"webp","image/gif":"gif","image/svg+xml":"svg",
      "video/mp4":"mp4","video/webm":"webm","video/ogg":"ogv","video/quicktime":"mov"
    };
    return map[m]||(m.startsWith("image/")?m.split("/")[1]:(m.startsWith("video/")?m.split("/")[1]:"bin"));
  }
  function mimeForPath(path){
    const ext=(path.split(".").pop()||"").toLowerCase();
    const map={png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg",webp:"image/webp",gif:"image/gif",svg:"image/svg+xml",mp4:"video/mp4",webm:"video/webm",ogv:"video/ogg",ogg:"video/ogg",mov:"video/quicktime"};
    return map[ext]||"application/octet-stream";
  }

  function forEachResourceRef(root,fn){
    if(root.master?.bgImage)fn({owner:root.master,key:"bgImage",src:root.master.bgImage,kind:"image",label:"master-background"});
    (root.master?.elements||[]).forEach((e,i)=>{
      if((e.type==="image"||e.type==="video")&&e.src)fn({owner:e,key:"src",src:e.src,kind:e.type,label:`master-${e.type}-${i+1}`});
    });
    function visit(n){
      (n.slideElements||[]).forEach((e,i)=>{
        if((e.type==="image"||e.type==="video")&&e.src)fn({owner:e,key:"src",src:e.src,kind:e.type,label:`${n.id}-${e.type}-${i+1}`});
      });
      (n.children||[]).forEach(visit);
    }
    visit(root);
  }

  function analyzeEmbeddedResources(){
    let imageBytes=0,videoBytes=0,maxImage=0,maxVideo=0,count=0;
    forEachResourceRef(data,r=>{
      const size=dataUrlByteSize(r.src);if(!size)return;count++;
      if(r.kind==="video"){videoBytes+=size;maxVideo=Math.max(maxVideo,size)}else{imageBytes+=size;maxImage=Math.max(maxImage,size)}
    });
    return {imageBytes,videoBytes,totalBytes:imageBytes+videoBytes,maxImage,maxVideo,count};
  }
  function shouldGenerateMinddeck(stats,settings){
    if(settings.packageMode==="always")return true;
    if(settings.packageMode==="htmlOnly")return false;
    const MB=1024*1024;
    return stats.maxImage>settings.imageLimitMB*MB || stats.maxVideo>settings.videoLimitMB*MB || stats.totalBytes>settings.totalLimitMB*MB;
  }
  function crc32(bytes){
    let crc=0xffffffff;
    for(let i=0;i<bytes.length;i++){
      crc^=bytes[i];
      for(let k=0;k<8;k++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);
    }
    return (crc^0xffffffff)>>>0;
  }
  function dosTimeDate(date=new Date()){
    const year=Math.max(1980,date.getFullYear());
    const time=((date.getHours()&31)<<11)|((date.getMinutes()&63)<<5)|((Math.floor(date.getSeconds()/2))&31);
    const day=((year-1980)&127)<<9|((date.getMonth()+1)&15)<<5|(date.getDate()&31);
    return {time,day};
  }
  function zipStore(entries){
    const enc=new TextEncoder(),chunks=[],central=[];let offset=0;const dt=dosTimeDate();
    entries.forEach(entry=>{
      const name=enc.encode(entry.name),dataBytes=entry.bytes,crc=crc32(dataBytes);
      const local=new Uint8Array(30+name.length+dataBytes.length),dv=new DataView(local.buffer);
      dv.setUint32(0,0x04034b50,true);dv.setUint16(4,20,true);dv.setUint16(6,0,true);dv.setUint16(8,0,true);dv.setUint16(10,dt.time,true);dv.setUint16(12,dt.day,true);
      dv.setUint32(14,crc,true);dv.setUint32(18,dataBytes.length,true);dv.setUint32(22,dataBytes.length,true);dv.setUint16(26,name.length,true);dv.setUint16(28,0,true);
      local.set(name,30);local.set(dataBytes,30+name.length);chunks.push(local);
      const c=new Uint8Array(46+name.length),cd=new DataView(c.buffer);
      cd.setUint32(0,0x02014b50,true);cd.setUint16(4,20,true);cd.setUint16(6,20,true);cd.setUint16(8,0,true);cd.setUint16(10,0,true);cd.setUint16(12,dt.time,true);cd.setUint16(14,dt.day,true);
      cd.setUint32(16,crc,true);cd.setUint32(20,dataBytes.length,true);cd.setUint32(24,dataBytes.length,true);cd.setUint16(28,name.length,true);cd.setUint16(30,0,true);cd.setUint16(32,0,true);cd.setUint16(34,0,true);cd.setUint16(36,0,true);cd.setUint32(38,0,true);cd.setUint32(42,offset,true);c.set(name,46);central.push(c);offset+=local.length;
    });
    const centralSize=central.reduce((s,c)=>s+c.length,0),end=new Uint8Array(22),ed=new DataView(end.buffer);
    ed.setUint32(0,0x06054b50,true);ed.setUint16(4,0,true);ed.setUint16(6,0,true);ed.setUint16(8,entries.length,true);ed.setUint16(10,entries.length,true);ed.setUint32(12,centralSize,true);ed.setUint32(16,offset,true);ed.setUint16(20,0,true);
    const total=offset+centralSize+end.length,out=new Uint8Array(total);let p=0;chunks.forEach(c=>{out.set(c,p);p+=c.length});central.forEach(c=>{out.set(c,p);p+=c.length});out.set(end,p);return out;
  }
  function unzipStored(buffer){
    const bytes=new Uint8Array(buffer),dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),dec=new TextDecoder();let p=0;const entries={};
    while(p+30<=bytes.length && dv.getUint32(p,true)===0x04034b50){
      const method=dv.getUint16(p+8,true),size=dv.getUint32(p+18,true),nameLen=dv.getUint16(p+26,true),extraLen=dv.getUint16(p+28,true);if(method!==0)throw new Error("只支持 MindDeck 内置未压缩项目包");
      const name=dec.decode(bytes.slice(p+30,p+30+nameLen)),start=p+30+nameLen+extraLen;entries[name]=bytes.slice(start,start+size);p=start+size;
    }
    return entries;
  }
  function buildMinddeckPackage(projectName){
    const project=clone(data),assets=[],manifest={schemaVersion:1,kind:"minddeck-package",runtimeVersion:RUNTIME_VERSION,createdAt:new Date().toISOString(),projectFile:"project.json",assets:[]};let ai=0;
    forEachResourceRef(project,r=>{
      const parsed=dataUrlToBytes(r.src);if(!parsed)return;
      const ext=extForMime(parsed.mime),path=`assets/${String(++ai).padStart(3,"0")}-${sanitizeFilename(r.label)}.${ext}`;
      r.owner[r.key]=`minddeck-asset:${path}`;assets.push({name:path,bytes:parsed.bytes});manifest.assets.push({path,mime:parsed.mime,kind:r.kind,size:parsed.bytes.length});
    });
    project.projectName=projectName;
    const enc=new TextEncoder();
    return zipStore([
      {name:"project.json",bytes:enc.encode(JSON.stringify(project,null,2))},
      {name:"manifest.json",bytes:enc.encode(JSON.stringify(manifest,null,2))},
      ...assets
    ]);
  }
  function restoreMinddeckProject(entries){
    const dec=new TextDecoder(),pj=entries["project.json"];if(!pj)throw new Error("项目包缺少 project.json");
    const project=JSON.parse(dec.decode(pj)),manifest=entries["manifest.json"]?JSON.parse(dec.decode(entries["manifest.json"])):{assets:[]};
    const mimeMap={};(manifest.assets||[]).forEach(a=>mimeMap[a.path]=a.mime);
    forEachResourceRef(project,r=>{
      if(!String(r.src||"").startsWith("minddeck-asset:"))return;
      const path=r.src.slice("minddeck-asset:".length),bytes=entries[path];if(!bytes)throw new Error(`项目包缺少资源 ${path}`);
      r.owner[r.key]=bytesToDataUrl(bytes,mimeMap[path]||mimeForPath(path));
    });
    return project;
  }

  const ONBOARDING_KEY="minddeck-v9-onboarded";
  function showWelcome(force=false){
    if(!force){try{if(localStorage.getItem(ONBOARDING_KEY)==="1")return}catch{}}
    const el=document.getElementById("welcomeOverlay");el.classList.add("open");el.setAttribute("aria-hidden","false");
  }
  function closeWelcome(){
    const el=document.getElementById("welcomeOverlay");el.classList.remove("open");el.setAttribute("aria-hidden","true");
    if(document.getElementById("welcomeDontShow")?.checked){try{localStorage.setItem(ONBOARDING_KEY,"1")}catch{}}
  }

  const UI_THEMES=Core.THEMES;
  function applyUiTheme(){
    const theme=ThemeCore.apply(document.body,data.uiTheme);data.uiTheme=theme;
    document.querySelectorAll("[data-theme-choice]").forEach(el=>el.classList.toggle("active",el.dataset.themeChoice===theme));
  }
  function setUiTheme(theme){
    if(!Core.THEMES.includes(theme))return;checkpoint();data.uiTheme=ThemeCore.normalize(theme);applyUiTheme();save();toast(`已切换为${ThemeCore.label(theme)}主题`);
  }
  function openThemePanel(){
    closeMobileMainSheet();hideMobileNodeContext();nodePanel.classList.remove("open");orderPanel.classList.remove("open");document.getElementById("healthPanel").classList.remove("open");document.getElementById("exportSettingsPanel").classList.remove("open");
    document.getElementById("themePanel").classList.add("open");applyUiTheme();
  }

  function hideMobileNodeContext(){
    document.getElementById("mobileNodeContext")?.classList.remove("open");
  }

  let activeCollapsedMapPanelId=null;
  function collapseMapPanel(id){
    const p=document.getElementById(id);
    if(!p)return;
    p.classList.add("panel-collapsed");
    activeCollapsedMapPanelId=id;
    const h=document.getElementById("panelRestoreHandle");
    if(h)h.classList.add("open");
  }
  function restoreMapPanel(){
    if(!activeCollapsedMapPanelId)return;
    const p=document.getElementById(activeCollapsedMapPanelId);
    if(p){p.classList.remove("panel-collapsed");p.classList.add("open")}
    activeCollapsedMapPanelId=null;
    document.getElementById("panelRestoreHandle")?.classList.remove("open");
  }
  function collapseEditorPropPanel(){
    mobilePropOpen=false;
    propPanel.classList.remove("open");
    propPanel.classList.add("panel-collapsed");
    document.getElementById("editorPropRestoreHandle")?.classList.add("open");
    fitEditorStage(false);
  }
  function restoreEditorPropPanel(){
    propPanel.classList.remove("panel-collapsed");
    if(selectedEls.size===1){
      mobilePropOpen=true;
      showPropertyPanel([...selectedEls][0]);
      propPanel.classList.add("open");
    }
    document.getElementById("editorPropRestoreHandle")?.classList.remove("open");
    fitEditorStage(false);
  }

  function updateMobileNodeContext(){
    const bar=document.getElementById("mobileNodeContext");
    if(!bar)return;
    const n=findNode(selectedNodeId);
    document.getElementById("mobileNodeTitle").textContent=n?.title||"未选择节点";
    const show=window.innerWidth<=700 && appMode==="presentation" && !!n && !editorOpen && !presentation;
    bar.classList.toggle("open",show);
  }
  function closeMobileMainSheet(){
    document.getElementById("mobileMainSheet")?.classList.remove("open");
    updateMobileNodeContext();
  }
  function openMobileMainSheet(){
    if(window.innerWidth>700)return;
    const sheet=document.getElementById("mobileMainSheet"),box=document.getElementById("mobileMainSheetContent"),title=document.getElementById("mobileMainSheetTitle");
    hideMobileNodeContext();
    title.textContent=appMode==="presentation"?"演示与项目":"导图与项目";
    let items=`
      <button class="btn" data-mm="reset">按当前可见节点重排</button>
      <button class="btn" data-mm="save">保存项目 JSON</button>
      <button class="btn" data-mm="import">打开项目</button>
      <button class="btn" data-mm="export">导出当前模式</button>
      <button class="btn" data-mm="health">项目自检</button>
      <button class="btn" data-mm="appearance">外观主题</button>
      <button class="btn" data-mm="help">使用说明</button>`;
    if(appMode==="presentation")items+=`
      <button class="btn" data-mm="order">演示顺序</button>
      <button class="btn" data-mm="master">编辑母版</button>
      <button class="btn" data-mm="settings">导出设置</button>`;
    box.innerHTML=`<div class="mobile-main-sheet-grid">${items}
      <div class="mobile-layout-box">
        <label>思维导图布局</label>
        <select id="mobileMapLayoutSelect">
          <option value="balanced">左右展开</option>
          <option value="right">向右展开</option>
          <option value="left">向左展开</option>
          <option value="down">向下树状</option>
          <option value="radial">自由放射</option>
        </select>
      </div>
    </div>`;
    const layoutSel=box.querySelector("#mobileMapLayoutSelect");
    layoutSel.value=data.mapLayout||"radial";
    layoutSel.onchange=()=>{const v=layoutSel.value;closeMobileMainSheet();setMapLayout(v,true)};
    sheet.classList.add("open");
    box.querySelectorAll("[data-mm]").forEach(b=>b.onclick=()=>{
      const a=b.dataset.mm;closeMobileMainSheet();runAppCommand(a);
    });
  }

  function setAppMode(mode){
    appMode=mode==="mindmap"?"mindmap":"presentation";
    localStorage.setItem("minddeck-v8-app-mode",appMode);
    document.body.classList.toggle("mindmap-mode",appMode==="mindmap");
    document.getElementById("presentationModeBtn").classList.toggle("active",appMode==="presentation");
    document.getElementById("mindmapModeBtn").classList.toggle("active",appMode==="mindmap");
    const ex=getExportSettings();
    document.getElementById("exportViewerBtn").textContent=ex.fusionMode==="fusion"?"导出融合 HTML":(appMode==="mindmap"?"导出思维导图":"导出演示");
    document.getElementById("exportViewerBtn").title=ex.fusionMode==="fusion"?"导出一个可在思维导图和演示之间切换的 HTML":(appMode==="mindmap"?"导出一个可独立浏览和编辑的思维导图 HTML":"导出独立演示 HTML");
    document.getElementById("nodePanel").querySelector("h3").textContent=appMode==="mindmap"?"思维导图节点":"节点";
    if(appMode==="mindmap")document.getElementById("nodePanel").classList.remove("open");
    document.getElementById("exportSettingsPanel").classList.remove("open");
    document.getElementById("orderPanel").classList.remove("open");
    document.getElementById("healthPanel").classList.remove("open");
    document.getElementById("themePanel").classList.remove("open");
    closeMobileMainSheet();
    renderMap();renderOrderPanel();updateMobileNodeContext();
  }

  // The app closure continues in subsequent modules.
