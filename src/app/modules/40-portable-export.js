

  function buildPortableHtml(kind){
    const project=buildPortableData(kind);
    const payload=JSON.stringify(project).replace(/</g,"\\u003c");
    const kindJson=JSON.stringify(kind);
    const portableTheme=UI_THEMES.includes(project.uiTheme)?project.uiTheme:"light";
    const title=((data.projectName||findNode(data.id)?.title||"MindDeck").replace(/[<>]/g,""));
    const sharedRuntimeSource=document.getElementById("minddeck-shared-runtime")?.textContent||"";
    // The Shared Runtime is already valid JavaScript, but when it is embedded into another
    // <script> block any literal closing-script token would terminate that block early.
    // Escape only the HTML parser sentinel; JavaScript semantics stay unchanged.
    const embeddedRuntimeSource=sharedRuntimeSource.replace(/<\/script/gi,"<\\/script");
    const shellSource=document.getElementById("minddeck-portable-shell")?.textContent||"";
    if(!shellSource)throw new Error("Portable shell missing");
    const bootstrap='<scr'+'ipt>\n'+embeddedRuntimeSource+'\nconst data='+payload+',KIND='+kindJson+',RUNTIME_VERSION='+JSON.stringify(RUNTIME_VERSION)+';\n'+
      'document.body.classList.add("kind-"+KIND);\nif(!globalThis.MindDeckCore||globalThis.MindDeckCore.VERSION!==RUNTIME_VERSION)throw new Error("MindDeck Portable Runtime mismatch");\n'+
      'globalThis.MindDeckCore.Portable.mount({data,kind:KIND,width:1600,height:900,document,window});\n</scr'+'ipt>';
    return shellSource
      .replaceAll('__PORTABLE_TITLE__',title)
      .replaceAll('__PORTABLE_THEME__',portableTheme)
      .replaceAll('__PORTABLE_RUNTIME_VERSION__',RUNTIME_VERSION)
      .replace('__PORTABLE_BOOTSTRAP__',bootstrap);
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