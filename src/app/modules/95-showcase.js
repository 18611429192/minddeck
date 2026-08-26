
  // Thin adapter for GitHub Pages Demo and browser-level regression tests.
  // It deliberately reuses the real app state, PresentationView and exporters.
  const showcaseMode=new URLSearchParams(location.search).get("showcase")==="1";

  globalThis.MindDeckApp=Object.freeze({
    version:APP_VERSION,
    runtimeVersion:RUNTIME_VERSION,
    getProject:()=>clone(data),
    loadProject(project){
      data=clone(project);normalize();selectedNodeId=data.id;applyUiTheme();syncMapLayoutControls();
      renderMap();renderOrderPanel();fitAll();return clone(data);
    },
    openEditor:(mode="slide",nodeId=selectedNodeId)=>openEditor(mode,nodeId),
    enterPresentation:(options={fullscreen:false})=>enterPresentation(options),
    exportHtml(kind="presentation"){
      return kind==="mindmap"?buildStandaloneMindmapHtml():kind==="fusion"?buildStandaloneFusionHtml():buildStandaloneViewerHtml();
    }
  });

  if(showcaseMode){
    // Showcase is read-only from the persistence point of view: folding and navigation
    // may mutate the in-memory demo project, but must never overwrite the user's project.
    const showcaseSaved=()=>{setSaveStatus("saved","Showcase");return true};
    persistProjectNow=showcaseSaved;
    save=showcaseSaved;
    saveNow=showcaseSaved;
    showWelcome=()=>{};

    setTimeout(async()=>{
      try{
        const response=await fetch("./examples/demo.json",{cache:"no-store"});
        if(!response.ok)throw new Error("HTTP "+response.status);
        data=clone(await response.json());normalize();selectedNodeId=data.id;appMode="presentation";
        applyUiTheme();syncMapLayoutControls();updateMasterPanel();renderExportSettings();setAppMode(appMode);
        renderMap();renderOrderPanel();fitAll();
        await enterPresentation({fullscreen:false});
      }catch(err){
        console.error("MindDeck showcase load failed",err);
        toast("Showcase 加载失败，已保留当前项目");
      }
    },0);
  }
