  // V10 local Markdown compose UX fix: direct .md loading and visible generation feedback.
  const openSmartComposerBeforeMarkdownImportV10=openSmartComposer;

  function enhanceLocalMarkdownComposeV10(){
    const dialog=smartOverlay?.querySelector('.v99-smart-dialog');
    const source=dialog?.querySelector('#v99Outline');
    const generate=dialog?.querySelector('#v99GenerateBtn');
    if(!dialog||!source||!generate||dialog.dataset.localMarkdownImportEnhanced==='1')return;
    dialog.dataset.localMarkdownImportEnhanced='1';

    const sourceCard=source.closest('.v99-smart-card');
    const controls=document.createElement('div');
    controls.style.cssText='display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px';
    controls.innerHTML=`<button type="button" id="v99MarkdownFileBtn" class="ai-v10-chip">打开 Markdown 文件</button><input id="v99MarkdownFile" type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" style="display:none"><span class="v99-smart-note" style="margin:0">支持 .md / .markdown / .txt；文件内容会先进入预览，再生成 MindDeck 页面。</span>`;
    const status=document.createElement('div');
    status.id='v99LocalComposeStatus';
    status.className='v99-smart-note';
    status.textContent='等待 Markdown / 大纲输入。';
    sourceCard?.insertBefore(controls,source.nextSibling);
    sourceCard?.insertBefore(status,controls.nextSibling);

    const file=controls.querySelector('#v99MarkdownFile');
    const fileButton=controls.querySelector('#v99MarkdownFileBtn');
    const baseLabel='本地生成整套演示';
    const setStatus=(text,state='note')=>{
      status.className=state==='error'?'v99-smart-warning':state==='ok'?'v99-smart-ok':'v99-smart-note';
      status.textContent=text;
    };
    const resetGenerate=()=>{
      generate.textContent=baseLabel;
      generate.disabled=false;
    };

    fileButton.onclick=()=>file.click();
    file.onchange=async()=>{
      const selected=file.files?.[0];
      if(!selected)return;
      resetGenerate();
      setStatus(`正在读取 ${selected.name}…`);
      try{
        source.value=await selected.text();
        source.dispatchEvent(new Event('input',{bubbles:true}));
        const parsed=sourcePreview(source.value.trim());
        setStatus(parsed.pageCount?`已读取 ${selected.name} · 解析为 ${parsed.pageCount} 页。可以直接生成。`:`已读取 ${selected.name}，但没有解析出可生成页面。`,parsed.pageCount?'ok':'error');
      }catch(err){
        setStatus(`Markdown 文件读取失败：${err?.message||err}`,'error');
      }finally{
        file.value='';
      }
    };

    source.addEventListener('input',()=>{
      resetGenerate();
      const raw=source.value.trim();
      if(!raw){setStatus('等待 Markdown / 大纲输入。');return}
      const parsed=sourcePreview(raw);
      setStatus(parsed.pageCount?`已解析 ${parsed.pageCount} 页。点击“${baseLabel}”后会先建立恢复备份，再替换当前项目。`:'当前内容没有解析出可生成页面。',parsed.pageCount?'note':'error');
    });

    generate.textContent=baseLabel;
    generate.onclick=()=>{
      const raw=source.value.trim();
      if(!raw){setStatus('请先粘贴 Markdown、大纲，或打开 .md 文件。','error');toast('请先输入 Markdown / 大纲');source.focus();return}
      const parsed=sourcePreview(raw);
      if(!parsed.pageCount){setStatus('大纲无法解析：请至少提供标题或一个章节。','error');toast('大纲无法解析');return}

      generate.disabled=true;
      generate.textContent='正在生成…';
      setStatus(`正在本地生成 ${parsed.pageCount} 页，并创建恢复备份…`,'ok');
      try{
        checkpoint();
        createRecoveryBackup('before-v10-local-markdown-compose');
        const next=ComposerV99.compose(raw,{theme:dialog.querySelector('#v99Theme').value,density:dialog.querySelector('#v99Density').value,mapLayout:dialog.querySelector('#v99Layout').value,uiTheme:data.uiTheme||'light'});
        const quality=ComposerV99.Quality.validateProject(next);
        if(!quality.ok)throw new Error(quality.errors[0]?.message||'Composer Quality Validator 未通过');
        data=next;
        normalize();
        selectedNodeId=data.id;
        applyUiTheme();
        syncMapLayoutControls();
        save();
        renderMap();
        renderOrderPanel();
        fitAll();
        updateMobileNodeContext();
        removeSmartOverlay();
        toast(`已生成 ${ComposerV99.describe(data).pages} 页 · 使用 ${quality.metrics.templateCount} 个模板`);
      }catch(err){
        console.error(err);
        resetGenerate();
        setStatus(`本地组稿失败：${err?.message||err}`,'error');
        toast('本地组稿失败：'+(err?.message||err));
      }
    };
  }

  openSmartComposer=function(){
    openSmartComposerBeforeMarkdownImportV10();
    enhanceLocalMarkdownComposeV10();
  };
