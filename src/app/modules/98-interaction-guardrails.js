

  // V10 interaction guardrails for controls that share the map/editor chrome.
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
