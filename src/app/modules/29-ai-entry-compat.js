  // V10 unified compose entry: expose one user-facing entry while keeping the existing
  // AI planner, local Composer and DeckSpec compiler as separate internal capabilities.
  // Chromium native fetch must keep Window/globalThis as its receiver when stored as a callback.
  aiProviderV10=function(preset=aiPresetV10(),key=aiReadKeyV10()){
    if(!key)throw Object.assign(new Error('请先输入 DeepSeek API Key'),{code:'AI_KEY_MISSING'});
    const boundFetch=typeof globalThis.fetch==='function'?globalThis.fetch.bind(globalThis):undefined;
    return Core.DeepSeek.createProvider({preset,apiKey:key,fetch:boundFetch});
  };

  const openAISmartComposerOriginalV10=openAISmartComposerV10;
  const openSmartComposerOriginalV10=openSmartComposer;
  const openDeckSpecImporterOriginalV10=openDeckSpecImporter;

  function installUnifiedComposeStylesV10(){
    if(document.getElementById('minddeck-v10-unified-compose-styles'))return;
    const style=document.createElement('style');
    style.id='minddeck-v10-unified-compose-styles';
    style.textContent=`
      .compose-v10-modebar{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:14px 26px 0}
      .compose-v10-mode{min-height:42px;border:1px solid rgba(128,138,160,.22);border-radius:12px;background:rgba(128,138,160,.045);color:inherit;font-weight:750;cursor:pointer;padding:7px 10px;line-height:1.2}
      .compose-v10-mode small{display:block;margin-top:4px;color:var(--muted,#737b8b);font-size:10px;font-weight:600}
      .compose-v10-mode:hover{border-color:#6374ff;background:rgba(99,116,255,.08)}
      .compose-v10-mode.active{border-color:#5b6cff;background:rgba(91,108,255,.12);box-shadow:inset 0 0 0 1px rgba(91,108,255,.28)}
      .compose-v10-mode.active small{color:inherit;opacity:.72}
      @media(max-width:700px){.compose-v10-modebar{grid-template-columns:1fr;padding:12px 16px 0}.compose-v10-mode{min-height:38px;text-align:left}.compose-v10-mode small{display:inline;margin-left:6px}}
    `;
    document.head.appendChild(style);
  }

  function decorateUnifiedComposeV10(mode){
    installUnifiedComposeStylesV10();
    const dialog=smartOverlay?.querySelector('.v99-smart-dialog');
    if(!dialog)return;
    const head=dialog.querySelector('.v99-smart-head');
    const title=head?.querySelector('h2');
    const subtitle=head?.querySelector('p');
    if(title)title.textContent='智能组稿';
    if(subtitle)subtitle.textContent='一个入口完成 AI 智能规划、本地快速组稿和 DeckSpec 高级输入；三种方式最终都生成同一套可编辑 MindDeck 页面。';

    let modebar=dialog.querySelector('.compose-v10-modebar');
    if(!modebar){
      modebar=document.createElement('div');
      modebar.className='compose-v10-modebar';
      const modes=[
        ['ai','AI 智能规划','适合原始材料与复杂结构'],
        ['local','本地快速组稿','适合已经整理好的 Markdown'],
        ['deckspec','DeckSpec 高级输入','适合精确 JSON / 自动化输入']
      ];
      for(const [id,label,note] of modes){
        const button=document.createElement('button');
        button.type='button';
        button.className='compose-v10-mode';
        button.dataset.composeMode=id;
        button.innerHTML=`${label}<small>${note}</small>`;
        button.onclick=()=>{
          if(id===mode)return;
          if(id==='ai')openAISmartComposerV10();
          else if(id==='local')openSmartComposer();
          else openDeckSpecImporter();
        };
        modebar.appendChild(button);
      }
      const body=dialog.querySelector('.v99-smart-body');
      if(body)dialog.insertBefore(modebar,body);else dialog.appendChild(modebar);
    }
    modebar.querySelectorAll('[data-compose-mode]').forEach(button=>{
      const active=button.dataset.composeMode===mode;
      button.classList.toggle('active',active);
      button.disabled=active;
      button.setAttribute('aria-pressed',active?'true':'false');
    });

    if(mode==='ai'){
      const local=document.getElementById('aiV10LocalCompose');
      const generate=document.getElementById('aiV10ComposeGenerate');
      if(local){local.textContent='本地快速组稿';local.title='切换到本地 Markdown / 大纲模式'}
      if(generate)generate.textContent='AI 智能生成';
    }else if(mode==='local'){
      const generate=document.getElementById('v99GenerateBtn');
      if(generate)generate.textContent='本地生成整套演示';
    }else if(mode==='deckspec'){
      const generate=document.getElementById('v99DeckSpecGenerate');
      if(generate)generate.textContent='验证并生成 DeckSpec';
    }
  }

  openAISmartComposerV10=function(){
    openAISmartComposerOriginalV10();
    decorateUnifiedComposeV10('ai');
  };
  openSmartComposer=function(){
    openSmartComposerOriginalV10();
    decorateUnifiedComposeV10('local');
  };
  openDeckSpecImporter=function(){
    openDeckSpecImporterOriginalV10();
    decorateUnifiedComposeV10('deckspec');
  };

  function openUnifiedComposeV10(){openAISmartComposerV10()}
  function installUnifiedComposeEntryV10(){
    installUnifiedComposeStylesV10();
    document.getElementById('aiV10ComposeBtn')?.remove();
    document.getElementById('v99DeckSpecBtn')?.remove();
    document.getElementById('aiV10MobileComposeBtn')?.remove();
    if(smartComposeButton){
      smartComposeButton.textContent='智能组稿';
      smartComposeButton.classList.remove('primary');
      smartComposeButton.title='AI / 本地 / DeckSpec 统一组稿入口';
      smartComposeButton.onclick=openUnifiedComposeV10;
    }
    if(smartMobileButton){
      smartMobileButton.textContent='组';
      smartMobileButton.title='智能组稿';
      smartMobileButton.onclick=openUnifiedComposeV10;
      smartMobileButton.style.bottom='82px';
    }
  }
  setTimeout(installUnifiedComposeEntryV10,2);
