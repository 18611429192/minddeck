

  function buildPortableHtml(kind){
    const project=buildPortableData(kind);
    const payload=JSON.stringify(project).replace(/</g,"\\u003c");
    const kindJson=JSON.stringify(kind);
    const portableTheme=UI_THEMES.includes(project.uiTheme)?project.uiTheme:"light";
    const title=((data.projectName||findNode(data.id)?.title||"MindDeck").replace(/[<>]/g,""));
    const sharedRuntimeSource=document.getElementById("minddeck-shared-runtime")?.textContent||"";
    const sharedStylesSource=document.getElementById("minddeck-shared-styles")?.textContent||"";
    const doc=String.raw`<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${title}</title>
<style>
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;font-family:"Microsoft YaHei","PingFang SC",Arial,sans-serif;color:#1f2633;background:#f2f4f8;overscroll-behavior:none}
button,select{font:inherit}.hidden{display:none!important}
#top{height:54px;display:flex;align-items:center;gap:7px;padding:6px 9px;background:rgba(251,252,254,.97);backdrop-filter:blur(16px);border-bottom:1px solid #dfe4ec;position:fixed;left:0;right:0;top:0;z-index:80}
.brand{font-weight:900;white-space:nowrap}.brand small{display:block;font-size:9px;color:#98a0ac;font-weight:500}.switch{display:flex;padding:3px;gap:2px;border:1px solid #dde3eb;background:#edf0f4;border-radius:10px}.switch button{border:0;background:transparent;padding:6px 10px;border-radius:7px;color:#687181;cursor:pointer}.switch button.on{background:#fff;color:#202733;font-weight:800;box-shadow:0 1px 5px rgba(24,32,47,.10)}
.tool{border:1px solid #dce2ea;background:#fff;color:#505a68;border-radius:9px;padding:7px 9px;cursor:pointer;white-space:nowrap}.tool:hover{background:#f6f8fb}.tool.primary{background:#315efb;border-color:#315efb;color:#fff}.spacer{flex:1}.tip{font-size:10px;color:#8a93a1;white-space:nowrap}
.view{position:fixed;left:0;right:0;bottom:0;top:54px;display:none}.view.on{display:block}
/* map */
#mapVp{position:absolute;inset:0;overflow:hidden;cursor:grab;touch-action:none;background:radial-gradient(circle at 1px 1px,rgba(151,160,175,.28) 1px,transparent 1.2px),linear-gradient(180deg,#f7f8fb,#f1f3f7);background-size:24px 24px,100% 100%}
#mapWorld{position:absolute;left:0;top:0;width:1px;height:1px;transform-origin:0 0}#mapEdges{position:absolute;left:-9000px;top:-9000px;width:18000px;height:18000px;pointer-events:none}.edge{fill:none;stroke:#aeb8c7;stroke-width:2.2;stroke-linecap:round;opacity:.8}
.node{position:absolute;transform:translate(-50%,-50%);width:220px;min-height:82px;padding:12px 14px;background:#fff;border:1px solid #d9e0e9;border-radius:16px;box-shadow:0 8px 24px rgba(35,45,65,.08);user-select:none;cursor:move}.node.root{width:260px;border:2px solid #354052}.node.sel{border-color:#7894ff;box-shadow:0 0 0 3px rgba(49,94,251,.10),0 14px 34px rgba(35,58,135,.14)}
.ntitle{font-size:15px;font-weight:850;line-height:1.4;padding-right:28px}.root .ntitle{font-size:19px}.ndesc{font-size:12px;color:#707989;line-height:1.5;margin-top:6px;max-height:55px;overflow:hidden}.ndesc.empty{display:block;color:#a1a9b4;font-style:italic}.fold{position:absolute;right:7px;top:7px;width:25px;height:25px;padding:0;border:1px solid #e0e5ec;border-radius:50%;background:#f7f9fb;color:#667181;cursor:pointer}.ntitle[contenteditable="true"],.ndesc[contenteditable="true"]{outline:2px solid #315efb;outline-offset:3px;background:#fff;border-radius:5px;user-select:text;cursor:text}
/* presentation */
#pLayout{position:absolute;inset:0;display:grid;grid-template-columns:260px minmax(0,1fr);background:#0d1015}#pLayout.right{grid-template-columns:minmax(0,1fr) 260px}#pLayout.toc-hidden{grid-template-columns:minmax(0,1fr)!important}#pLayout.toc-hidden #toc{display:none}
#toc{position:relative;background:rgba(17,22,29,.985);color:#d9dee7;padding:12px 10px 16px;overflow:auto;border-right:1px solid rgba(255,255,255,.08);z-index:35;min-width:0}#pLayout.right #toc{grid-column:2;border-right:0;border-left:1px solid rgba(255,255,255,.08)}
#tocHead{position:sticky;top:-12px;z-index:3;background:rgba(17,22,29,.985);padding:12px 4px 9px;margin-bottom:4px;border-bottom:1px solid rgba(255,255,255,.07)}#tocHeadTop{display:flex;align-items:center;gap:5px}.tocTitle{flex:1;font-size:12px;font-weight:800;color:#b8c0cc}.tocAct{border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.05);color:#c7cfda;border-radius:8px;padding:5px 7px;font-size:10px;cursor:pointer}
.tocItem{display:flex;align-items:center;gap:5px;padding:4px 5px;border-radius:9px;color:#9da6b4;font-size:12px;cursor:pointer;min-height:36px;user-select:none}.tocItem:hover{background:rgba(255,255,255,.05)}.tocItem.active{background:#315efb;color:#fff;font-weight:800}.tocItem.ancestor{color:#d8ddea}.foldBtn{width:24px;height:24px;flex:none;border:0;border-radius:7px;background:rgba(255,255,255,.055);color:inherit;padding:0;font-size:14px;cursor:pointer}.foldBtn.placeholder{visibility:hidden}.num{min-width:22px;height:22px;border-radius:999px;padding:0 5px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.08);font-size:10px;font-weight:800;flex:none}.label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}
#stageWrap{position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#0d1015;min-width:0;min-height:0;touch-action:pan-y}#pLayout.right #stageWrap{grid-column:1;grid-row:1}#stage{position:relative;width:1600px;height:900px;min-width:1600px;min-height:900px;flex:0 0 auto;transform-origin:center center;overflow:hidden;background:#fff}.el{position:absolute;overflow:hidden;white-space:pre-wrap}.el img,.el video{width:100%;height:100%;display:block}
${sharedStylesSource}
#tocToggle{position:fixed;left:10px;top:64px;z-index:55;width:40px;height:40px;border:1px solid rgba(255,255,255,.16);border-radius:11px;background:rgba(10,14,20,.66);backdrop-filter:blur(8px);color:#fff;font-size:18px;display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.18)}#fullBtn{position:fixed;right:10px;bottom:10px;z-index:55;border:1px solid rgba(255,255,255,.13);background:rgba(10,14,20,.55);color:#d8dde6;border-radius:9px;padding:7px 9px;font-size:11px;backdrop-filter:blur(8px);cursor:pointer}
#toast{position:fixed;left:50%;top:66px;transform:translateX(-50%);background:#111827;color:#fff;padding:9px 13px;border-radius:9px;font-size:12px;opacity:0;transition:.2s;z-index:100;pointer-events:none}#toast.show{opacity:1}
body.kind-presentation #top{display:none}body.kind-presentation .view{top:0}body.kind-presentation #tocToggle{top:10px}:fullscreen #top{display:none!important}:fullscreen .view{top:0!important}:fullscreen #fullBtn{display:none!important}body.kind-mindmap #switchBox{display:none}body.kind-mindmap .presentOnly{display:none!important}body.kind-presentation .mapOnly{display:none!important}
body[data-ui-theme="dark"] #top{background:#171d25;border-color:#313a46;color:#e8edf4}body[data-ui-theme="dark"] #mapVp{background:radial-gradient(circle at 1px 1px,rgba(116,129,147,.25) 1px,transparent 1.2px),linear-gradient(180deg,#171d25,#131920);background-size:24px 24px,100% 100%}body[data-ui-theme="dark"] .node{background:#222a35;border-color:#3b4654;color:#edf1f7}body[data-ui-theme="dark"] .ndesc{color:#9da8b7}body[data-ui-theme="dark"] .tool,body[data-ui-theme="dark"] select{background:#222a35;border-color:#3b4654;color:#d9e0ea}body[data-ui-theme="business"] #mapVp{background:linear-gradient(180deg,#edf2f7,#e5ebf2)}body[data-ui-theme="business"] .node{border-radius:10px;border-color:#bdcada;box-shadow:0 5px 16px rgba(31,52,78,.08)}body[data-ui-theme="minimal"] #mapVp{background:#fafafa}body[data-ui-theme="minimal"] .node{border-radius:8px;box-shadow:none}body[data-ui-theme="minimal"] #top{box-shadow:none;background:#fff}\n@media(max-width:900px),(pointer:coarse){#pLayout,#pLayout.right{grid-template-columns:minmax(0,1fr)}#pLayout:not(.toc-hidden) #toc{display:block;position:fixed;left:0;top:0;bottom:0;width:min(84vw,310px);z-index:48;box-shadow:14px 0 38px rgba(0,0,0,.42);border-right:1px solid rgba(255,255,255,.08)}#pLayout.right:not(.toc-hidden) #toc{left:auto;right:0;box-shadow:-14px 0 38px rgba(0,0,0,.42);border-left:1px solid rgba(255,255,255,.08)}#stageWrap{grid-column:1!important;grid-row:1!important}.tocItem{min-height:43px;font-size:13px}.foldBtn{width:30px;height:30px}.tocAct{min-height:31px}}
@media(max-width:650px){#top{height:52px;padding:5px 6px;gap:5px;overflow-x:auto}.brand small,.tip{display:none}.brand{font-size:12px}.switch{min-width:185px;flex:1}.switch button{flex:1;font-size:10px;padding:6px}.tool{font-size:10px;padding:6px 7px}.view{top:52px}.node{width:188px;min-height:74px;padding:10px 11px}.node.root{width:218px}.ntitle{font-size:13px}.root .ntitle{font-size:17px}.ndesc{font-size:10px}#tocToggle{top:60px}body.kind-presentation #tocToggle{top:10px}}
</style></head><body data-ui-theme="${portableTheme}">
<div id="top"><div class="brand">MindDeck<small>Portable Runtime ${RUNTIME_VERSION}</small></div><div class="switch" id="switchBox"><button id="mapMode" class="on">思维导图</button><button id="presentMode">演示</button></div><button class="tool mapOnly" id="fitBtn">全局</button><select class="tool mapOnly" id="layoutSel"><option value="balanced">左右展开</option><option value="right">向右展开</option><option value="left">向左展开</option><option value="down">向下树状</option><option value="radial">自由放射</option></select><select class="tool mapOnly" id="themeSel"><option value="light">明亮</option><option value="dark">深色</option><option value="business">商务</option><option value="minimal">极简</option></select><button class="tool mapOnly" id="reflowBtn">重排</button><button class="tool mapOnly" id="expandBtn">全开</button><button class="tool mapOnly" id="collapseBtn">全收</button><button class="tool mapOnly" id="exportMapBtn">导出 JSON</button><div class="spacer"></div><div class="tip mapOnly">Tab 子节点 · Enter 同级 · Space 收放 · F2 编辑</div></div>
<div id="mapView" class="view"><div id="mapVp"><div id="mapWorld"><svg id="mapEdges" viewBox="-9000 -9000 18000 18000"></svg><div id="mapNodes"></div></div></div></div>
<div id="presentationView" class="view"><div id="pLayout"><aside id="toc"></aside><main id="stageWrap"><div id="stage"></div></main></div></div>
<button id="tocToggle" class="presentOnly" title="显示/隐藏目录">☰</button><button id="fullBtn" class="presentOnly">全屏</button><div id="toast"></div>
<script>
${sharedRuntimeSource}
const data=${payload},KIND=${kindJson},RUNTIME_VERSION="${RUNTIME_VERSION}";
document.body.classList.add("kind-"+KIND);
if(!globalThis.MindDeckCore||globalThis.MindDeckCore.VERSION!==RUNTIME_VERSION)throw new Error("MindDeck Portable Runtime mismatch");
globalThis.MindDeckCore.Portable.mount({data,kind:KIND,width:1600,height:900,document,window});
__SCRIPT_END__</body></html>`;
    return doc.replace("__SCRIPT_END__","</scr"+"ipt>");
  }

  function buildStandaloneViewerHtml(){return buildPortableHtml("presentation")}

  function buildStandaloneMindmapHtml(){return buildPortableHtml("mindmap")}

  function validateExportHtml(htmlText,kind="HTML"){
    if(typeof htmlText!=="string"||htmlText.length<1000)throw new Error(`${kind} 内容为空或不完整`);
    if(!htmlText.includes("<!DOCTYPE html")||!htmlText.includes("</html>"))throw new Error(`${kind} 文档结构不完整`);
    const rootTitle=(findNode(data.id)?.title||"").trim();
    if(rootTitle && !htmlText.includes(rootTitle))throw new Error(`${kind} 未包含当前项目内容`);
    if(!htmlText.includes(`Portable Runtime ${RUNTIME_VERSION}`))throw new Error(`${kind} 未使用当前统一运行时`);
    const scripts=[...htmlText.matchAll(/<script>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
    if(!scripts.length)throw new Error(`${kind} 缺少运行脚本`);
    for(const js of scripts){try{new Function(js)}catch(err){throw new Error(`${kind} 脚本校验失败：${err.message}`)}}
    return true;
  }

  function exportStandaloneMindmap(){
    try{
    assertProjectExportReady();
      normalize();
      const name=sanitizeFilename(data.projectName||findNode(data.id)?.title||"思维导图");
      const out=buildStandaloneMindmapHtml();
      validateExportHtml(out,"思维导图 HTML");
      downloadBlob(new Blob([out],{type:"text/html;charset=utf-8"}),name+"-思维导图.html");
      toast("已导出可浏览、可编辑的独立思维导图 HTML");
    }catch(err){
      console.error(err);toast("导出失败："+(err?.message||"未知错误"));
    }
  }

  function buildStandaloneFusionHtml(){return buildPortableHtml("fusion")}

  function exportFusionFiles(){
    try{
    assertProjectExportReady();
    normalize();
    const defaultName=sanitizeFilename(data.projectName||findNode(data.id)?.title||"MindDeck");
    const asked=prompt("导出文件名：",data.projectName||defaultName);
    if(asked===null)return;
    const projectName=sanitizeFilename(asked||defaultName);
    data.projectName=projectName;save();

    const viewer=buildStandaloneFusionHtml();
    validateExportHtml(viewer,"融合 HTML");
    downloadBlob(new Blob([viewer],{type:"text/html;charset=utf-8"}),projectName+".html");

    const stats=analyzeEmbeddedResources(),settings=getExportSettings();
    if(shouldGenerateMinddeck(stats,settings)){
      const zipBytes=buildMinddeckPackage(projectName);
      downloadBlob(new Blob([zipBytes],{type:"application/zip"}),projectName+".minddeck");
      toast("已导出融合 HTML + .minddeck");
    }else{
      toast("已导出融合 HTML");
    }
    }catch(err){
      console.error(err);toast("导出失败："+(err?.message||"未知错误"));
    }
  }

  function exportPresentationFiles(){
    try{
    assertProjectExportReady();
    normalize();
    const defaultName=sanitizeFilename(data.projectName||data.title||data?.title||data?.children?.[0]?.title||data?.id||"MindDeck演示");
    const rootTitle=sanitizeFilename(findNode(data.id)?.title||defaultName);
    const asked=prompt("导出文件名（HTML 和项目包会使用同一个名字）：",data.projectName||rootTitle);
    if(asked===null)return;
    const projectName=sanitizeFilename(asked||rootTitle);
    data.projectName=projectName;save();

    const viewer=buildStandaloneViewerHtml();
    validateExportHtml(viewer,"演示 HTML");
    const htmlBlob=new Blob([viewer],{type:"text/html;charset=utf-8"});
    const stats=analyzeEmbeddedResources(),settings=getExportSettings();
    const makePackage=shouldGenerateMinddeck(stats,settings);

    downloadBlob(htmlBlob,projectName+".html");
    if(makePackage){
      const zipBytes=buildMinddeckPackage(projectName);
      downloadBlob(new Blob([zipBytes],{type:"application/zip"}),projectName+".minddeck");
      const mb=(stats.totalBytes/1024/1024).toFixed(1);
      toast(`已导出 HTML + .minddeck（本地资源 ${mb} MB）`);
    }else{
      toast("资源较小：已只导出一个独立 HTML");
    }
    }catch(err){
      console.error(err);toast("导出失败："+(err?.message||"未知错误"));
    }
  }

  function saveProjectJson(){
    normalize();saveNow("save-project-json");
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),u=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=u;a.download=sanitizeFilename(data.projectName||findNode(data.id)?.title||"minddeck-project")+".json";a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);toast("项目 JSON 已保存");
  }
  function exportCurrentMode(){
    const cfg=getExportSettings();
    if(cfg.fusionMode==="fusion")exportFusionFiles();
    else appMode==="mindmap"?exportStandaloneMindmap():exportPresentationFiles();
  }
  function openOrderPanel(){renderOrderPanel();hideMobileNodeContext();document.getElementById("orderPanel")?.classList.remove("panel-collapsed");document.getElementById("panelRestoreHandle")?.classList.remove("open");activeCollapsedMapPanelId=null;orderPanel.classList.add("open");nodePanel.classList.remove("open");document.getElementById("healthPanel").classList.remove("open")}
  function openExportSettingsPanel(){renderExportSettings();hideMobileNodeContext();nodePanel.classList.remove("open");orderPanel.classList.remove("open");document.getElementById("healthPanel").classList.remove("open");document.getElementById("exportSettingsPanel")?.classList.remove("panel-collapsed");document.getElementById("panelRestoreHandle")?.classList.remove("open");activeCollapsedMapPanelId=null;document.getElementById("exportSettingsPanel").classList.add("open")}
  function openProjectPicker(){document.getElementById("importFile").click()}
  const APP_COMMANDS={
    fit:()=>fitAll(),
    reset:()=>autoLayout(true),
    reflow:()=>autoLayout(true),
    add:()=>addChildNode(),
    page:()=>openEditor("slide",selectedNodeId),
    master:()=>openEditor("master",selectedNodeId),
    order:()=>openOrderPanel(),
    present:()=>enterPresentation(),
    save:()=>saveProjectJson(),
    saveProject:()=>saveProjectJson(),
    import:()=>openProjectPicker(),
    openProject:()=>openProjectPicker(),
    export:()=>exportCurrentMode(),
    exportCurrent:()=>exportCurrentMode(),
    settings:()=>openExportSettingsPanel(),
    health:()=>openHealthPanel(),
    appearance:()=>openThemePanel(),
    help:()=>showWelcome(true),
  };
  function runAppCommand(name){
    const fn=APP_COMMANDS[name];if(!fn){console.warn("Unknown MindDeck command",name);return false}fn();return true;
  }
