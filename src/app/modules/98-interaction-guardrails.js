

  // V10 interaction guardrails for controls that share the map/editor chrome.
  // These aliases restore the editor's element factories after the V10 module split.
  // The actual normalization/rendering contract still belongs to the Shared Runtime.
  const baseText=()=>({
    id:uid(),type:'text',x:220,y:180,w:760,h:140,z:SLIDE_Z_MIN,
    text:'双击编辑文字',fontSize:42,fontWeight:700,color:'#1f2329',textAlign:'left',
    animation:{type:'inherit',delay:0,duration:.5}
  });
  const baseShape=(shape='rect')=>({
    id:uid(),type:'shape',shape,x:340,y:280,w:420,h:240,z:SLIDE_Z_MIN,
    fill:'#edf2ff',borderColor:'#b8c5ff',borderWidth:2,radius:shape==='circle'?999:24,
    animation:{type:'inherit',delay:0,duration:.5}
  });

  const exportResetButton=document.getElementById('resetExportSettingsBtn');
  exportResetButton?.addEventListener('click',()=>setTimeout(()=>{
    document.getElementById('exportSettingsPanel')?.classList.add('open');
  },0));

  const interactionGuardStyle=document.createElement('style');
  interactionGuardStyle.id='minddeck-v10-interaction-guardrails';
  interactionGuardStyle.textContent=`
    #v99SmartMobileBtn{z-index:100!important}
    #v99SmartMobileBtn.v10-smart-mobile-hidden{display:none!important}
  `;
  document.head.appendChild(interactionGuardStyle);

  function syncSmartMobileEntry(){
    const button=document.getElementById('v99SmartMobileBtn');
    if(!button)return;
    const blocked=document.getElementById('mobileNodeContext')?.classList.contains('open')||
      document.getElementById('editorShell')?.classList.contains('open')||
      document.body.classList.contains('presentation-mode');
    button.classList.toggle('v10-smart-mobile-hidden',!!blocked);
  }
  const interactionGuardObserver=new MutationObserver(syncSmartMobileEntry);
  [document.getElementById('mobileNodeContext'),document.getElementById('editorShell')].filter(Boolean).forEach(target=>interactionGuardObserver.observe(target,{attributes:true,attributeFilter:['class']}));
  interactionGuardObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
  setTimeout(syncSmartMobileEntry,0);

  // Applying an A/B/C template is a generated edit. The UI normalizes and renders the
  // generated elements immediately afterward, so seal provenance at that final boundary.
  let templateApplySnapshot=null;
  document.addEventListener('click',event=>{
    if(event.target?.id!=='v99ApplyTemplate')return;
    const node=editorNodeId?findNode(editorNodeId):null;
    templateApplySnapshot=node?{
      node,
      hash:node.composer?.generatedHash||'',
      templateId:node.composer?.selectedTemplateId||''
    }:null;
  },true);
  document.addEventListener('click',event=>{
    if(event.target?.id!=='v99ApplyTemplate'||!templateApplySnapshot)return;
    const snapshot=templateApplySnapshot;templateApplySnapshot=null;
    const node=snapshot.node;
    const generatedChanged=(node.composer?.generatedHash||'')!==snapshot.hash||
      (node.composer?.selectedTemplateId||'')!==snapshot.templateId;
    if(generatedChanged)ComposerV99.Provenance.refresh(node);
  });
