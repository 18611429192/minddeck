  // Input-entry polish: keep Markdown/DeckSpec controls visually consistent with the project toolbar.
  function inputEntryPolish(){
    const smart=document.getElementById('v99SmartComposeBtn'),deckSpec=document.getElementById('v99DeckSpecBtn');
    if(smart){smart.classList.remove('primary');smart.dataset.inputKind='markdown';smart.title='从 Markdown / 大纲生成整套可编辑演示'}
    if(deckSpec)deckSpec.dataset.inputKind='deckspec';
    if(!smart||smart.dataset.previewPolishBound==='1')return;
    smart.dataset.previewPolishBound='1';
    smart.addEventListener('click',()=>setTimeout(()=>{
      const preview=document.getElementById('v99Preview');if(!preview)return;
      const patch=()=>{
        const block=[...preview.children].find(element=>element.tagName==='DIV'&&/\d+ 个结构模板/.test(element.textContent||''));
        if(!block)return;
        const current=block.textContent||'',next=current.replace(/\d+ 个结构模板/,`${ComposerV99.templates.length} 个结构模板`);
        if(next!==current)block.textContent=next;
      };
      patch();new MutationObserver(patch).observe(preview,{childList:true,subtree:true,characterData:true});
    },0));
  }
  setTimeout(inputEntryPolish,0);
