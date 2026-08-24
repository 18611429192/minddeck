

  // presentation host: rendering, TOC, viewport and input are shared by PresentationViewCore.
  function createMainPresentationView(){
    presentationSession=PresentationSessionCore.create(data,selectedNodeId,0);presentationSession.resetToc();
    presentationView=PresentationViewCore.create({
      data,session:presentationSession,document,window,stage:document.getElementById("presentStage"),stageWrap:document.getElementById("presentStageWrap"),touchTarget:document.getElementById("presentShell"),
      tocTree:document.getElementById("tocTree"),tocLayout:document.getElementById("presentLayout"),tocContainer:document.getElementById("toc"),tocToggle:document.getElementById("presentTocToggle"),tocCount:document.getElementById("tocCount"),
      rightClass:"toc-right",tocRightClass:"right",tocHiddenClass:"toc-hidden",moveToc:true,itemClass:"toc-item",foldClass:"fold-mini",numberClass:"num",labelClass:"label",elementClass:"present-el",fullscreenTarget:workspace,scrollActive:true,
      isActive:()=>presentation,onFold:()=>{save();renderMap();renderOrderPanel()},onExit:()=>exitPresentation(),
      decorateSlideElement:(el,item)=>{el.className=`present-el ${item.element.type}`}
    });
    presentationView.bindInput();return presentationView;
  }
  async function enterPresentation(){
    presentation=true;createMainPresentationView();
    document.querySelectorAll(".map-panel.open").forEach(p=>p.classList.remove("open"));document.getElementById("healthPanel")?.classList.remove("open");document.getElementById("welcomeOverlay")?.classList.remove("open");document.getElementById("mobileNodeContext")?.classList.remove("open");closeMobileMainSheet();document.body.classList.add("presentation-mode");nodePanel.classList.remove("open");orderPanel.classList.remove("open");document.getElementById("exportSettingsPanel").classList.remove("open");
    document.getElementById("presentShell").classList.add("open");presentationView.render();
    if(!(await FullscreenCore.enter(workspace)))toast("浏览器未允许全屏，已进入窗口演示；按 Esc 退出");
  }
  async function exitPresentation(fromFs=false){
    const wasPresentation=presentation;
    presentation=false;presentationView?.destroy();presentationView=null;presentationSession=null;
    document.body.classList.remove("presentation-mode");
    document.getElementById("presentShell")?.classList.remove("open");
    if(wasPresentation){renderMap();fitAll();updateMobileNodeContext()}
    if(!fromFs)await FullscreenCore.exit(document);
  }
  function applyTocSide(){return presentationView?.applySide()}
  function applyTocVisibility(){return presentationView?.applyTocVisibility()}
  function togglePresentationToc(){return presentationView?.toggleToc()}
  function renderToc(){return presentationView?.renderToc()}
  function updateTocHighlight(){return presentationView?.updateHighlight()}
  function refreshPresentation(){return presentationView?.refresh()}
  function renderPresentSlide(){return presentationView?.render()}
  function fitPresentStage(){return presentationView?.fit()}
  function navigate(d){if(!presentation)return;return presentationView?.step(d,true)}

  function toast(msg){const t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1600)}

  function buildPortableData(kind){return ExportDataCore.project(data,kind)}
