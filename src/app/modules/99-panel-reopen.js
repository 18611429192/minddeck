
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
