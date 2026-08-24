

  // bindings map
  document.querySelectorAll("[data-close-panel]").forEach(b=>b.onclick=()=>{
    const id=b.dataset.closePanel;
    if(window.innerWidth>700)collapseMapPanel(id);
    else document.getElementById(id)?.classList.remove("open");
    updateMobileNodeContext();
  });
    document.getElementById("panelRestoreHandle").onclick=restoreMapPanel;
  document.getElementById("editorPropRestoreHandle").onclick=restoreEditorPropPanel;
  document.getElementById("desktopPropCollapse")?.addEventListener("click",collapseEditorPropPanel);

  document.getElementById("mobileMainSheetClose").onclick=closeMobileMainSheet;
  document.getElementById("mobileMainMore").onclick=openMobileMainSheet;
  document.getElementById("mobileMainFit").onclick=()=>{closeMobileMainSheet();runAppCommand("fit")};
  document.getElementById("mobileMainAdd").onclick=()=>{closeMobileMainSheet();runAppCommand("add")};
  document.getElementById("mobileMainPage").onclick=()=>runAppCommand("page");
  document.getElementById("mobileMainPresent").onclick=()=>runAppCommand("present");
  document.getElementById("mobileEditPageBtn").onclick=()=>runAppCommand("page");
  document.getElementById("mobileNodeDetailBtn").onclick=()=>{closeMobileMainSheet();hideMobileNodeContext();document.getElementById("nodePanel")?.classList.remove("panel-collapsed");document.getElementById("panelRestoreHandle")?.classList.remove("open");activeCollapsedMapPanelId=null;nodePanel.classList.add("open")};
  document.getElementById("mobileNodeChildBtn").onclick=()=>runAppCommand("add");
  document.getElementById("mobileNodeContextClose").onclick=()=>document.getElementById("mobileNodeContext").classList.remove("open");

  document.getElementById("healthCheckBtn").onclick=()=>runAppCommand("health");
  document.getElementById("appearanceBtn").onclick=()=>runAppCommand("appearance");
  document.getElementById("helpBtn").onclick=()=>runAppCommand("help");
  document.querySelectorAll("[data-theme-choice]").forEach(btn=>btn.onclick=()=>setUiTheme(btn.dataset.themeChoice));
  document.getElementById("welcomeClose").onclick=closeWelcome;
  document.getElementById("welcomeStart").onclick=closeWelcome;
  document.getElementById("welcomeMindmap").onclick=()=>{setAppMode("mindmap");closeWelcome();setTimeout(fitAll,40)};
  document.getElementById("welcomeOverlay").onclick=e=>{if(e.target.id==="welcomeOverlay")closeWelcome()};
  document.getElementById("runHealthCheckBtn").onclick=()=>{const r=runProjectHealthCheck(true);renderHealthReport(r);toast(r.fail?"自检发现失败项":r.warn?"自检完成：有风险提示":"自检通过")};
  document.getElementById("copyHealthReportBtn").onclick=async()=>{if(!lastHealthReport){renderHealthReport(runProjectHealthCheck(true))}const text=healthReportText();try{await navigator.clipboard.writeText(text);toast("自检报告已复制")}catch{const ta=document.createElement("textarea");ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand("copy");ta.remove();toast("自检报告已复制")}};
  document.getElementById("restoreBackupBtn").onclick=restoreRecoveryBackup;
  document.getElementById("presentationModeBtn").onclick=()=>setAppMode("presentation");
  document.getElementById("mindmapModeBtn").onclick=()=>setAppMode("mindmap");
  document.getElementById("fitBtn").onclick=()=>runAppCommand("fit");
  document.getElementById("mapLayoutSelect").onchange=e=>setMapLayout(e.target.value,true);
  document.getElementById("resetLayoutBtn").onclick=()=>runAppCommand("reflow");
  document.getElementById("orderBtn").onclick=()=>runAppCommand("order");
  document.getElementById("masterBtn").onclick=()=>runAppCommand("master");
  document.getElementById("presentBtn").onclick=()=>runAppCommand("present");
  document.getElementById("presentTocToggle").onclick=e=>{e.stopPropagation();togglePresentationToc()};
  document.getElementById("saveNodeBtn").onclick=()=>{checkpoint();const n=findNode(selectedNodeId);n.title=document.getElementById("nodeTitle").value.trim()||"未命名节点";n.text=document.getElementById("nodeText").value.trim();save();renderMap();toast("节点已保存")};
  document.getElementById("editSlideBtn").onclick=()=>openEditor("slide",selectedNodeId);
  document.getElementById("addChildBtn").onclick=()=>addChildNode();
  document.getElementById("deleteNodeBtn").onclick=()=>deleteCurrentNode();
  document.getElementById("defaultOrderBtn").onclick=()=>{checkpoint();data.presentationOrder=[];save();renderMap();renderOrderPanel();toast("已恢复默认顺序")};
  document.getElementById("saveOrderBtn").onclick=()=>{
    checkpoint();
    const pairs=[...document.querySelectorAll("[data-order-id]")].map(i=>({id:i.dataset.orderId,n:Number(i.value)||9999})).sort((a,b)=>a.n-b.n);
    data.presentationOrder=[data.id,...pairs.map(x=>x.id)];save();renderMap();renderOrderPanel();toast("顺序已保存")
  };
  document.getElementById("exportBtn").onclick=()=>runAppCommand("saveProject");
  document.getElementById("exportViewerBtn").onclick=()=>runAppCommand("exportCurrent");
  document.getElementById("exportSettingsBtn").onclick=()=>runAppCommand("settings");
  document.getElementById("saveExportSettingsBtn").onclick=()=>{setExportSettings(readExportSettings());document.getElementById("exportSettingsPanel").classList.remove("open");setAppMode(appMode);toast("高级导出设置已保存")};
  document.getElementById("resetExportSettingsBtn").onclick=()=>{setExportSettings(DEFAULT_EXPORT_SETTINGS);renderExportSettings();setAppMode(appMode);toast("已恢复默认导出设置")};
  document.getElementById("importBtn").onclick=()=>runAppCommand("openProject");
  document.getElementById("importFile").onchange=async e=>{
    const f=e.target.files?.[0];if(!f)return;
    createRecoveryBackup("before-import");
    try{
      if(f.name.toLowerCase().endsWith(".minddeck")){
        const entries=unzipStored(await f.arrayBuffer());
        data=restoreMinddeckProject(entries);
        normalize();applyUiTheme();syncMapLayoutControls();saveNow("import-minddeck");renderMap();renderOrderPanel();fitAll();{const hr=runProjectHealthCheck(false);toast(hr.fail?"MindDeck 项目包已打开，但自检发现问题":hr.warn?"MindDeck 项目包已打开，有风险提示":"MindDeck 项目包已打开")};
      }else{
        data=JSON.parse(await f.text());
        normalize();applyUiTheme();syncMapLayoutControls();saveNow("import-json");renderMap();renderOrderPanel();fitAll();{const hr=runProjectHealthCheck(false);toast(hr.fail?"JSON 项目已导入，但自检发现问题":hr.warn?"JSON 项目已导入，有风险提示":"JSON 项目已导入")};
      }
    }catch(err){
      console.error(err);toast("打开失败："+(err?.message||"文件格式不正确"));
    }finally{e.target.value=""}
  };

  // editor bindings
  document.getElementById("mobileSheetClose").onclick=closeMobileEditorSheet;
  document.getElementById("mobilePropClose").onclick=()=>{if(window.innerWidth>700)collapseEditorPropPanel();else{mobilePropOpen=false;propPanel.classList.remove("open")}};
  document.getElementById("mobileInsertBtn").onclick=()=>openMobileEditorSheet("insert");
  document.getElementById("mobileAlignBtn").onclick=()=>{if(selectedEls.size<2){toast("请先多选至少两个元素");return}openMobileEditorSheet("align")};
  document.getElementById("mobileLayerBtn").onclick=()=>{if(!selectedEls.size){toast("请先选择元素");return}openMobileEditorSheet("layer")};
  document.getElementById("mobilePropBtn").onclick=()=>{
    closeMobileEditorSheet();
    propPanel.classList.remove("panel-collapsed");document.getElementById("editorPropRestoreHandle")?.classList.remove("open");mobilePropOpen=true;
    if(selectedEls.size===1)showPropertyPanel([...selectedEls][0]);
    else if(editorMode==="master")showMasterSettingsPanel();
    else{toast("请先选择一个元素");return}
    propPanel.classList.add("open");
  };
  document.getElementById("mobileMultiBtn").onclick=()=>{
    mobileMultiSelectMode=!mobileMultiSelectMode;mobilePropOpen=false;propPanel.classList.remove("open");closeMobileEditorSheet();
    document.getElementById("mobileMultiBtn").classList.toggle("active",mobileMultiSelectMode);
    toast(mobileMultiSelectMode?"多选已开启：依次点选元素":"多选已关闭");
  };
  document.getElementById("mobileViewBtn").onclick=()=>{
    closeMobileEditorSheet();mobilePropOpen=false;propPanel.classList.remove("open");
    if(editorViewTouched)resetEditorView();
    else setEditorZoom(editorScale*1.55);
  };
  document.getElementById("backToMapBtn").onclick=closeEditor;
  document.getElementById("saveEditorBtn").onclick=()=>{save();toast(editorMode==="master"?"母版已保存":"页面已保存")};
  document.getElementById("masterSettingsBtn").onclick=showMasterSettingsPanel;
  document.getElementById("toggleMasterModeBtn").onclick=()=>openEditor(editorMode==="master"?"slide":"master",editorNodeId||selectedNodeId);
  document.getElementById("addTextBtn").onclick=()=>addElement("text");
  document.getElementById("addRectBtn").onclick=()=>addElement("rect");
  document.getElementById("addCircleBtn").onclick=()=>addElement("circle");
  document.getElementById("addImageBtn").onclick=()=>document.getElementById("editorImageFile").click();
  document.getElementById("editorImageFile").onchange=e=>{const f=e.target.files?.[0];if(f){checkpoint();addImageFromFile(f)}e.target.value="";closeMobileEditorSheet()};
  document.getElementById("addVideoBtn").onclick=()=>document.getElementById("editorVideoFile").click();
  document.getElementById("editorVideoFile").onchange=e=>{const f=e.target.files?.[0];if(f)addVideoFromFile(f);e.target.value="";closeMobileEditorSheet()};
  document.getElementById("addVideoUrlBtn").onclick=()=>{
    const u=prompt("输入 MP4 / WebM / OGG 视频 URL：","https://");
    if(u&&u!=="https://")addVideoElement(u.trim());
  };
  document.getElementById("deleteElBtn").onclick=deleteSelected;
  document.getElementById("duplicateElBtn").onclick=duplicateSelected;
  document.getElementById("layerUpBtn").onclick=()=>moveLayerStep(1);
  document.getElementById("layerDownBtn").onclick=()=>moveLayerStep(-1);
  document.getElementById("frontBtn").onclick=()=>zMove(true);
  document.getElementById("backBtn").onclick=()=>zMove(false);
  document.querySelectorAll("[data-align]").forEach(b=>b.onclick=()=>alignSelected(b.dataset.align));

  document.getElementById("masterBgColor").onfocus=()=>checkpoint();
  document.getElementById("masterBgColor").oninput=e=>{data.master.bgColor=e.target.value;save();renderEditor()};
  document.getElementById("masterBgFit").onchange=e=>{checkpoint();data.master.bgFit=e.target.value;save();renderEditor()};
  document.getElementById("masterTocVisibility").onchange=e=>{checkpoint();data.master.tocVisibility=e.target.value;save()};
    document.getElementById("masterTocSide").onchange=e=>{checkpoint();data.master.tocSide=e.target.value;save()};
  document.getElementById("masterBgFile").onchange=e=>{
    checkpoint();
    const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{data.master.bgImage=r.result;save();renderEditor()};r.readAsDataURL(f)
  };

  document.addEventListener("fullscreenchange",()=>{if(presentation&&!document.fullscreenElement)exitPresentation(true)});
  function isTextEditingTarget(){
    const a=document.activeElement;
    return !!a && (["INPUT","TEXTAREA","SELECT"].includes(a.tagName) || a.isContentEditable);
  }
  
window.addEventListener("keydown",e=>{
    const mod=e.ctrlKey||e.metaKey;
    const textEditing=isTextEditingTarget();

    if(mod && (e.key==="s"||e.key==="S")){
      e.preventDefault();saveNow("shortcut");toast(appMode==="mindmap"?"思维导图已保存到浏览器":"已保存到浏览器；建议同时导出项目 JSON");
      return
    }

    if(editorOpen){
      if(!textEditing && mod && (e.key==="c"||e.key==="C")){e.preventDefault();copySelectedElements();return}
      if(!textEditing && mod && (e.key==="x"||e.key==="X")){e.preventDefault();cutSelectedElements();return}
      if(!textEditing && mod && (e.key==="v"||e.key==="V")){e.preventDefault();pasteElements();return}
      if(!textEditing && mod && e.key==="]"){e.preventDefault();e.shiftKey?zMove(true):moveLayerStep(1);return}
      if(!textEditing && mod && e.key==="["){e.preventDefault();e.shiftKey?zMove(false):moveLayerStep(-1);return}
      if(!textEditing && mod && (e.key==="z"||e.key==="Z") && !e.shiftKey){e.preventDefault();undo();return}
      if(!textEditing && ((mod && (e.key==="y"||e.key==="Y")) || (mod&&e.shiftKey&&(e.key==="z"||e.key==="Z")))){e.preventDefault();redo();return}
      if((e.key==="Delete"||e.key==="Backspace")&&!textEditing){e.preventDefault();deleteSelected();return}
      if(!textEditing && ["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key) && selectedEls.size){
        e.preventDefault();checkpoint();const step=e.shiftKey?10:1;
        selectedEls.forEach(id=>{const el=findEditorEl(id);if(!el)return;if(e.key==="ArrowLeft")el.x-=step;if(e.key==="ArrowRight")el.x+=step;if(e.key==="ArrowUp")el.y-=step;if(e.key==="ArrowDown")el.y+=step});
        save();renderEditorLight();syncSelectedGeometryFields();return
      }
      if(e.key==="Escape"&&!textEditing){selectedEls.clear();selectionAnchorId=null;refreshSelectionUI()}
      return
    }

    if(presentation){presentationView?.handleKey(e);return}

    if(!textEditing && e.key==="?"){e.preventDefault();showWelcome(true);return}

    if(appMode==="mindmap" && !textEditing){
      const action=InputCore.mapKeyAction(e);
      if(action){
        e.preventDefault();
        if(action==="type-title")beginInlineMapEdit(selectedNodeId,"title",e.key);
        else if(action==="edit-title")focusNodeTitle();
        else applyMainMapAction(action);
        return
      }
    }

    if(!textEditing && mod && (e.key==="z"||e.key==="Z")&&!e.shiftKey){e.preventDefault();undo();return}
    if(!textEditing && ((mod&&(e.key==="y"||e.key==="Y"))||(mod&&e.shiftKey&&(e.key==="z"||e.key==="Z")))){e.preventDefault();redo();return}
    if(e.key==="0")fitAll()
  });
  window.addEventListener("beforeunload",()=>{try{saveNow("beforeunload")}catch{}});
  window.addEventListener("resize",()=>{
    if(editorOpen)fitEditorStage(false);
    if(!presentation){fitAll();updateMobileNodeContext();if(window.innerWidth>700)closeMobileMainSheet()}
  });

  normalize();applyUiTheme();syncMapLayoutControls();updateMasterPanel();renderExportSettings();lastSavedJson=JSON.stringify(data);saveNow("startup-migrate");updateRecoveryButton();setAppMode(appMode);renderOrderPanel();setTimeout(()=>{fitAll();if(startupRecovery)toast("已从自动恢复备份载入项目");setTimeout(()=>showWelcome(false),220)},60);
})();
