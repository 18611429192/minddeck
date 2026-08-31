
  // Reopening a desktop panel must clear the collapsed state first.
  // `panel-collapsed` intentionally keeps pointer-events disabled while the restore
  // handle is shown; leaving it behind makes a reopened panel visible but untouchable.
  function prepareCollapsedPanelForOpen(panelId){
    const panel=document.getElementById(panelId);
    if(!panel)return;
    panel.classList.remove("panel-collapsed");
    if(activeCollapsedMapPanelId===panelId)activeCollapsedMapPanelId=null;
    document.getElementById("panelRestoreHandle")?.classList.remove("open");
  }

  const openHealthPanelBeforeReopenGuard=openHealthPanel;
  openHealthPanel=function(...args){
    prepareCollapsedPanelForOpen("healthPanel");
    return openHealthPanelBeforeReopenGuard(...args);
  };

  const openThemePanelBeforeReopenGuard=openThemePanel;
  openThemePanel=function(...args){
    prepareCollapsedPanelForOpen("themePanel");
    return openThemePanelBeforeReopenGuard(...args);
  };

  const assertProjectExportReadyBeforeReopenGuard=assertProjectExportReady;
  assertProjectExportReady=function(...args){
    try{return assertProjectExportReadyBeforeReopenGuard(...args)}
    catch(err){
      if(document.getElementById("healthPanel")?.classList.contains("open"))prepareCollapsedPanelForOpen("healthPanel");
      throw err;
    }
  };

  // The editor already has an overlap-aware insertion placer for touch devices.
  // Use the same placement contract on desktop so consecutive Text/Rect/Circle inserts
  // do not stack on the same hit target and block normal Shift-click multi-selection.
  const addElementBeforePlacementGuard=addElement;
  addElement=function(type){
    const beforeCount=currentEditorElements().length;
    const result=addElementBeforePlacementGuard(type);
    const elements=currentEditorElements();
    if(elements.length>beforeCount){
      const inserted=elements[elements.length-1];
      placeMobileInsertedElement(inserted,elements);
      save();renderEditor();
    }
    return result;
  };

  // Desktop inspector is docked rather than floating over the slide. Keep the editor shell
  // class in sync with the existing panel state and refit the fixed 1600x900 virtual stage
  // whenever the usable workspace actually changes. This preserves the slide/export model:
  // only the viewport scale changes.
  function syncEditorInspectorDock(){
    if(!editorShell||!propPanel)return;
    const docked=editorOpen && !isMobileEditor() && propPanel.classList.contains("open") && !propPanel.classList.contains("panel-collapsed");
    editorShell.classList.toggle("editor-inspector-docked",docked);
  }
  let editorWorkspaceFitFrame=0;
  function scheduleEditorWorkspaceFit(){
    syncEditorInspectorDock();
    if(editorWorkspaceFitFrame)cancelAnimationFrame(editorWorkspaceFitFrame);
    editorWorkspaceFitFrame=requestAnimationFrame(()=>{
      editorWorkspaceFitFrame=0;
      if(editorOpen)fitEditorStage(false);
    });
  }
  const editorInspectorObserver=new MutationObserver(scheduleEditorWorkspaceFit);
  editorInspectorObserver.observe(propPanel,{attributes:true,attributeFilter:["class"]});

  const editorStageWrapForResize=document.getElementById("editorStageWrap");
  if(editorStageWrapForResize&&typeof ResizeObserver!=="undefined"){
    let lastEditorWrapWidth=0,lastEditorWrapHeight=0;
    const editorWorkspaceResizeObserver=new ResizeObserver(entries=>{
      const rect=entries[0]?.contentRect;if(!rect||!editorOpen)return;
      if(Math.abs(rect.width-lastEditorWrapWidth)<.5&&Math.abs(rect.height-lastEditorWrapHeight)<.5)return;
      lastEditorWrapWidth=rect.width;lastEditorWrapHeight=rect.height;
      scheduleEditorWorkspaceFit();
    });
    editorWorkspaceResizeObserver.observe(editorStageWrapForResize);
  }
  window.addEventListener("resize",scheduleEditorWorkspaceFit);
  setTimeout(syncEditorInspectorDock,0);
