  // Keep the established local Smart Compose entry stable and expose DeepSeek as an explicit sibling action.
  // Chromium native fetch must keep Window/globalThis as its receiver when stored as a callback.
  aiProviderV10=function(preset=aiPresetV10(),key=aiReadKeyV10()){
    if(!key)throw Object.assign(new Error('请先输入 DeepSeek API Key'),{code:'AI_KEY_MISSING'});
    const boundFetch=typeof globalThis.fetch==='function'?globalThis.fetch.bind(globalThis):undefined;
    return Core.DeepSeek.createProvider({preset,apiKey:key,fetch:boundFetch});
  };

  let aiComposeButtonV10=null,aiMobileComposeButtonV10=null;
  function installAIComposeEntryCompatV10(){
    if(smartComposeButton){
      smartComposeButton.textContent='智能组稿';
      smartComposeButton.title='从 Markdown / 大纲使用本地 Composer 生成整套可编辑演示';
      smartComposeButton.onclick=openSmartComposer;
    }
    if(smartMobileButton){
      smartMobileButton.textContent='组';
      smartMobileButton.title='智能组稿';
      smartMobileButton.onclick=openSmartComposer;
    }
    const host=document.querySelector('.desktop-project-tools');
    if(host&&!document.getElementById('aiV10ComposeBtn')){
      aiComposeButtonV10=document.createElement('button');
      aiComposeButtonV10.id='aiV10ComposeBtn';
      aiComposeButtonV10.className='btn primary';
      aiComposeButtonV10.type='button';
      aiComposeButtonV10.textContent='AI 组稿';
      aiComposeButtonV10.title='使用 DeepSeek 规划 DeckPlan，再由 Composer 生成可编辑演示';
      aiComposeButtonV10.onclick=openAISmartComposerV10;
      smartComposeButton?.insertAdjacentElement('beforebegin',aiComposeButtonV10);
    }
    if(!document.getElementById('aiV10MobileComposeBtn')){
      aiMobileComposeButtonV10=document.createElement('button');
      aiMobileComposeButtonV10.id='aiV10MobileComposeBtn';
      aiMobileComposeButtonV10.className='v99-smart-mobile ai-v10-mobile-compose';
      aiMobileComposeButtonV10.type='button';
      aiMobileComposeButtonV10.textContent='AI';
      aiMobileComposeButtonV10.title='DeepSeek AI 组稿';
      aiMobileComposeButtonV10.onclick=openAISmartComposerV10;
      aiMobileComposeButtonV10.style.bottom='140px';
      document.body.appendChild(aiMobileComposeButtonV10);
    }
  }
  setTimeout(installAIComposeEntryCompatV10,1);
