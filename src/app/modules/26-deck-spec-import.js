  // V9.9 DeckSpec host. Parsing/validation/matching/compilation stay inside Core.Composer.
  function openDeckSpecImporter(){
    const dialog=makeOverlay('从 DeckSpec 生成','粘贴或打开 DeckSpec v1 JSON。这里只负责输入与错误反馈，页面选择和编译全部交给 Core.Composer。');
    const body=document.createElement('div');
    body.className='v99-smart-body';
    body.innerHTML=`<div class="v99-smart-card"><h3>DeckSpec v1 JSON</h3><textarea id="v99DeckSpecJson" spellcheck="false" style="width:100%;height:390px;box-sizing:border-box;resize:vertical;border-radius:14px;border:1px solid rgba(128,138,160,.28);padding:14px 15px;background:var(--input,#fff);color:inherit;font:13px/1.6 ui-monospace,SFMono-Regular,Consolas,monospace"></textarea><input id="v99DeckSpecFile" type="file" accept=".json,application/json" style="display:none"><div id="v99DeckSpecStatus" class="v99-smart-note">schemaVersion 必须为 1；生成结果仍是现有 MindDeck Project / slideElements。</div></div><div class="v99-smart-actions"><button id="v99DeckSpecFileBtn" type="button">打开 JSON 文件</button><button id="v99DeckSpecCancel" type="button">取消</button><button id="v99DeckSpecGenerate" class="primary" type="button">验证并生成</button></div>`;
    dialog.appendChild(body);
    const input=body.querySelector('#v99DeckSpecJson'),file=body.querySelector('#v99DeckSpecFile'),status=body.querySelector('#v99DeckSpecStatus');
    const showError=(code,message,path='')=>{status.className='v99-smart-warning';status.textContent=`${code}${path?` · ${path}`:''}：${message}`};
    body.querySelector('#v99DeckSpecFileBtn').onclick=()=>file.click();
    file.onchange=async()=>{const selected=file.files?.[0];if(!selected)return;try{input.value=await selected.text();status.className='v99-smart-note';status.textContent=`已读取 ${selected.name}`;}catch(err){showError('JSON_READ_ERROR',err?.message||'文件读取失败')}finally{file.value=''}};
    body.querySelector('#v99DeckSpecCancel').onclick=removeSmartOverlay;
    body.querySelector('#v99DeckSpecGenerate').onclick=()=>{
      let raw;
      try{raw=JSON.parse(input.value)}catch(err){showError('JSON_PARSE_ERROR',err?.message||'JSON 格式错误');return}
      const validation=ComposerV99.validateDeckSpec(raw);
      if(!validation.ok){const first=validation.errors[0]||{};showError(first.code||'SPEC_VALIDATION_ERROR',first.message||'DeckSpec 校验失败',first.path||'');return}
      if(!confirm(`将根据 DeckSpec 生成 ${raw.slides?.length||0} 个内容页并替换当前项目。当前项目会先建立恢复备份，是否继续？`))return;
      checkpoint();createRecoveryBackup('before-v9.9-deck-spec');
      try{
        const result=ComposerV99.compileDeck(raw,{mapLayout:data.mapLayout||'balanced',uiTheme:data.uiTheme||'light'});
        if(!result.quality?.ok)throw Object.assign(new Error(result.quality?.errors?.[0]?.message||'Composer Quality Validator 未通过'),{code:'QUALITY_ERROR'});
        data=result.project;normalize();selectedNodeId=data.id;applyUiTheme();syncMapLayoutControls();save();renderMap();renderOrderPanel();fitAll();updateMobileNodeContext();removeSmartOverlay();toast(`DeckSpec 已生成 · ${result.assignments.length} 页已分配模板`);
      }catch(err){showError(err?.code||'COMPILE_ERROR',err?.message||'生成失败')}
    };
  }
  function initDeckSpecImporter(){
    if(!ComposerV99||document.getElementById('v99DeckSpecBtn'))return;
    const host=document.querySelector('.desktop-project-tools');
    if(host){const button=document.createElement('button');button.id='v99DeckSpecBtn';button.className='btn';button.textContent='DeckSpec';button.title='导入 DeckSpec v1 JSON 并生成项目';button.onclick=openDeckSpecImporter;const smart=document.getElementById('v99SmartComposeBtn');if(smart)smart.after(button);else host.prepend(button)}
  }
  setTimeout(initDeckSpecImporter,0);
