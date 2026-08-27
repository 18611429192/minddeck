  // V9.9 Smart Deck: UI only. Outline parsing, role inference and slide generation live in Shared Runtime Composer.
  const ComposerV99=Core.Composer;
  const SMART_SAMPLE=`# 项目复盘：从问题到结果
> 面向团队的一次 10 分钟复盘

## 为什么要做
- 现状是什么
- 真正的问题在哪里
- 不处理会有什么影响

## 核心指标
- 32% 转化率提升
- 4.8x 处理效率
- 12 周完成交付

## 推进流程
- 明确问题
- 形成方案
- 小步验证
- 交付复盘

## 方案对比
- 原方案：功能多但路径长
- 新方案：聚焦关键动作

## 结论与下一步
- 先解决真实问题，再增加功能
- 负责人和验证标准必须明确
- 两周后复盘结果`;

  let smartOverlay=null,smartComposeButton=null,smartPageButton=null,smartMobileButton=null;

  function installSmartStyles(){
    if(document.getElementById('minddeck-v99-smart-styles'))return;
    const style=document.createElement('style');style.id='minddeck-v99-smart-styles';style.textContent=`
      .v99-smart-entry{position:relative}.v99-smart-entry::after{content:'9.9';position:absolute;right:-4px;top:-7px;font-size:9px;font-weight:800;padding:1px 4px;border-radius:8px;background:var(--accent,#5b6cff);color:#fff}
      .v99-smart-overlay{position:fixed;inset:0;z-index:12000;background:rgba(11,16,28,.58);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:24px}
      .v99-smart-dialog{width:min(980px,96vw);max-height:min(820px,92vh);overflow:auto;background:var(--panel,#fff);color:var(--text,#1f2329);border:1px solid rgba(128,138,160,.24);border-radius:28px;box-shadow:0 30px 90px rgba(0,0,0,.28)}
      .v99-smart-head{display:flex;gap:16px;align-items:flex-start;padding:24px 26px 18px;border-bottom:1px solid rgba(128,138,160,.18)}
      .v99-smart-head h2{margin:0 0 5px;font-size:22px}.v99-smart-head p{margin:0;color:var(--muted,#737b8b);font-size:13px;line-height:1.6}.v99-smart-head .spacer{flex:1}
      .v99-smart-close{width:36px;height:36px;border-radius:12px;border:0;background:rgba(128,138,160,.12);color:inherit;cursor:pointer;font-size:20px}
      .v99-smart-body{padding:22px 26px 26px}.v99-smart-grid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(300px,.65fr);gap:20px}
      .v99-smart-card{border:1px solid rgba(128,138,160,.2);border-radius:20px;padding:18px;background:rgba(128,138,160,.045)}
      .v99-smart-card h3{font-size:14px;margin:0 0 12px}.v99-smart-card textarea{width:100%;height:370px;box-sizing:border-box;resize:vertical;border-radius:14px;border:1px solid rgba(128,138,160,.28);padding:14px 15px;background:var(--input,#fff);color:inherit;font:14px/1.65 ui-monospace,SFMono-Regular,Consolas,monospace;outline:none}
      .v99-smart-card textarea:focus,.v99-smart-card select:focus{border-color:#6374ff;box-shadow:0 0 0 3px rgba(99,116,255,.12)}
      .v99-smart-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}.v99-smart-field{margin-bottom:13px}.v99-smart-field label{display:block;font-size:12px;font-weight:700;margin:0 0 6px;color:var(--muted,#737b8b)}
      .v99-smart-field select{width:100%;height:40px;border-radius:11px;border:1px solid rgba(128,138,160,.25);background:var(--input,#fff);color:inherit;padding:0 10px}
      .v99-smart-preview{min-height:130px;border-radius:14px;padding:13px;background:rgba(99,116,255,.07);border:1px solid rgba(99,116,255,.15);font-size:12px;line-height:1.55}
      .v99-smart-preview b{display:block;font-size:14px;margin-bottom:6px}.v99-smart-tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}.v99-smart-tag{padding:4px 7px;border-radius:999px;background:rgba(128,138,160,.13);font-size:11px}
      .v99-smart-note{font-size:11px;line-height:1.55;color:var(--muted,#737b8b);margin-top:10px}.v99-smart-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:18px;flex-wrap:wrap}
      .v99-smart-actions button{min-height:40px;padding:0 16px;border-radius:12px;border:1px solid rgba(128,138,160,.25);background:transparent;color:inherit;font-weight:700;cursor:pointer}.v99-smart-actions .primary{background:#5b6cff;border-color:#5b6cff;color:#fff}
      .v99-smart-role-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.v99-smart-role{padding:11px;border-radius:12px;border:1px solid rgba(128,138,160,.2);background:rgba(128,138,160,.04);cursor:pointer;text-align:left;color:inherit}.v99-smart-role.active{border-color:#5b6cff;background:rgba(91,108,255,.12);box-shadow:inset 0 0 0 1px #5b6cff}.v99-smart-role b{display:block;font-size:13px}.v99-smart-role small{display:block;color:var(--muted,#737b8b);margin-top:3px}
      .v99-smart-mobile{display:none;position:fixed;right:16px;bottom:82px;z-index:3900;width:48px;height:48px;border:0;border-radius:50%;background:#5b6cff;color:white;box-shadow:0 10px 28px rgba(39,50,120,.35);font-weight:900}
      @media(max-width:820px){.v99-smart-overlay{padding:8px;align-items:flex-end}.v99-smart-dialog{width:100%;max-height:92vh;border-radius:24px 24px 0 0}.v99-smart-grid{grid-template-columns:1fr}.v99-smart-card textarea{height:260px}.v99-smart-row{grid-template-columns:1fr}.v99-smart-role-grid{grid-template-columns:repeat(2,1fr)}.v99-smart-mobile{display:block}.desktop-project-tools .v99-smart-entry{display:none}}
    `;document.head.appendChild(style);
  }

  function optionHtml(items,selected){return items.map(item=>`<option value="${esc(item.id)}" ${item.id===selected?'selected':''}>${esc(item.label)}</option>`).join('')}
  function densityOptions(selected='standard'){return [['compact','精简'],['standard','标准'],['rich','丰富']].map(([id,label])=>`<option value="${id}" ${id===selected?'selected':''}>${label}</option>`).join('')}
  function layoutOptions(selected='balanced'){return [['balanced','左右展开'],['right','向右展开'],['left','向左展开'],['down','向下树状'],['radial','自由放射']].map(([id,label])=>`<option value="${id}" ${id===selected?'selected':''}>${label}</option>`).join('')}

  function removeSmartOverlay(){smartOverlay?.remove();smartOverlay=null}
  function makeOverlay(title,subtitle){
    removeSmartOverlay();
    const overlay=document.createElement('div');overlay.className='v99-smart-overlay';
    const dialog=document.createElement('div');dialog.className='v99-smart-dialog';
    const head=document.createElement('div');head.className='v99-smart-head';
    const copy=document.createElement('div');copy.innerHTML=`<h2>${esc(title)}</h2><p>${esc(subtitle)}</p>`;
    const spacer=document.createElement('div');spacer.className='spacer';const close=document.createElement('button');close.className='v99-smart-close';close.type='button';close.textContent='×';close.onclick=removeSmartOverlay;
    head.append(copy,spacer,close);dialog.appendChild(head);overlay.appendChild(dialog);document.body.appendChild(overlay);overlay.addEventListener('pointerdown',event=>{if(event.target===overlay)removeSmartOverlay()});smartOverlay=overlay;return dialog;
  }

  function sourcePreview(source){try{return ComposerV99.parseOutline(source)}catch(err){return {title:'无法解析',subtitle:String(err?.message||err),pageCount:0,specs:[]}}}
  function collectPreviewRoles(parsed){const roles={cover:1};const visit=(spec,depth=1)=>{const pseudo={title:spec.title,text:spec.text,points:spec.points||[],children:spec.children||[]};const role=ComposerV99.inferRole(pseudo,{depth,root:false});roles[role]=(roles[role]||0)+1;(spec.children||[]).forEach(child=>visit(child,depth+1))};(parsed.specs||[]).forEach(spec=>visit(spec));return roles}
  function renderComposePreview(box,source){const parsed=sourcePreview(source),roles=collectPreviewRoles(parsed),roleLabels=Object.entries(roles).map(([role,count])=>`<span class="v99-smart-tag">${esc(ComposerV99.roleLabel(role))} × ${count}</span>`).join('');box.innerHTML=`<b>${esc(parsed.title||'未命名演示')}</b><div>${parsed.pageCount||0} 页 · 大纲自动映射为页面角色</div>${parsed.subtitle?`<div style="margin-top:4px">${esc(parsed.subtitle)}</div>`:''}<div class="v99-smart-tags">${roleLabels}</div>`}

  function openSmartComposer(){
    const dialog=makeOverlay('智能组稿','参考 DashiPPT 的“内容→页面角色→主题→可编辑结果”思路，但全部生成 MindDeck 原生节点和 slideElements。');
    const body=document.createElement('div');body.className='v99-smart-body';
    body.innerHTML=`<div class="v99-smart-grid"><div class="v99-smart-card"><h3>1. 粘贴 Markdown / 大纲</h3><textarea id="v99Outline" spellcheck="false"></textarea><div class="v99-smart-note">推荐写法：# 标题、## 章节、### 子页、- 要点。也支持普通缩进大纲。生成前会自动创建恢复备份，可随时撤销。</div></div><div class="v99-smart-card"><h3>2. 选择整套设计策略</h3><div class="v99-smart-field"><label>演示主题</label><select id="v99Theme">${optionHtml(ComposerV99.themes,data.deckTheme||'aurora')}</select></div><div class="v99-smart-row"><div class="v99-smart-field"><label>信息密度</label><select id="v99Density">${densityOptions(data.deckDensity||'standard')}</select></div><div class="v99-smart-field"><label>导图布局</label><select id="v99Layout">${layoutOptions(data.mapLayout||'balanced')}</select></div></div><div class="v99-smart-field"><label>生成预览</label><div class="v99-smart-preview" id="v99Preview"></div></div><div class="v99-smart-note">V9.9 不引入第二套播放器或导出器。生成后的页面仍使用现有自由画布、母版、演示顺序、融合 HTML 和 Portable Runtime。</div></div></div><div class="v99-smart-actions"><button type="button" id="v99SampleBtn">载入示例</button><button type="button" id="v99CancelBtn">取消</button><button type="button" class="primary" id="v99GenerateBtn">生成整套演示</button></div>`;
    dialog.appendChild(body);const source=body.querySelector('#v99Outline'),preview=body.querySelector('#v99Preview');source.value='';let previewTimer=null;const refresh=()=>{clearTimeout(previewTimer);previewTimer=setTimeout(()=>renderComposePreview(preview,source.value),80)};source.addEventListener('input',refresh);renderComposePreview(preview,'');
    body.querySelector('#v99SampleBtn').onclick=()=>{source.value=SMART_SAMPLE;renderComposePreview(preview,source.value)};body.querySelector('#v99CancelBtn').onclick=removeSmartOverlay;
    body.querySelector('#v99GenerateBtn').onclick=()=>{const raw=source.value.trim();if(!raw){toast('请先粘贴大纲，或载入示例');source.focus();return}const parsed=sourcePreview(raw);if(!parsed.pageCount){toast('大纲无法解析');return}if(!confirm(`将根据大纲生成 ${parsed.pageCount} 页，并替换当前项目。当前项目会先建立恢复备份，是否继续？`))return;checkpoint();createRecoveryBackup('before-v9.9-smart-compose');const next=ComposerV99.compose(raw,{theme:body.querySelector('#v99Theme').value,density:body.querySelector('#v99Density').value,mapLayout:body.querySelector('#v99Layout').value,uiTheme:data.uiTheme||'light'});data=next;normalize();selectedNodeId=data.id;applyUiTheme();syncMapLayoutControls();save();renderMap();renderOrderPanel();fitAll();updateMobileNodeContext();removeSmartOverlay();toast(`已生成 ${ComposerV99.describe(data).pages} 页智能演示`)};
  }

  function roleDescription(role){return ({cover:'适合标题、主题和章节入口',section:'章节过渡和内容分区',statement:'只强调一个核心观点',cards:'3–6 个并列要点',compare:'左右方案或观点对比',process:'步骤、方法、机制',metrics:'数字与 KPI',trend:'趋势或阶段性变化',timeline:'时间、路线图、里程碑',quote:'原话、主张、引用',image:'图片/视频 + 观点',conclusion:'结论、建议、下一步'})[role]||''}
  function openPageDesigner(){
    if(!editorOpen||editorMode!=='slide'){toast('请先进入某个页面的自由画布编辑');return}const node=findNode(editorNodeId);if(!node){toast('当前页面不存在');return}let selectedRole=node.deckRole||ComposerV99.inferRole(node,{root:node.id===data.id});
    const dialog=makeOverlay('页面方案','对当前页重新套用页面角色；或者整套切换主题。这里只改变页面数据，不引入新的渲染逻辑。'),body=document.createElement('div');body.className='v99-smart-body';
    body.innerHTML=`<div class="v99-smart-grid"><div class="v99-smart-card"><h3>页面角色</h3><div class="v99-smart-role-grid" id="v99RoleGrid"></div><div class="v99-smart-note">重新套版会覆盖当前页的 slideElements。手工排过的页面请先保存项目或直接使用撤销。</div></div><div class="v99-smart-card"><h3>主题与密度</h3><div class="v99-smart-field"><label>演示主题</label><select id="v99PageTheme">${optionHtml(ComposerV99.themes,node.deckTheme||data.deckTheme||'aurora')}</select></div><div class="v99-smart-field"><label>信息密度</label><select id="v99PageDensity">${densityOptions(node.deckDensity||data.deckDensity||'standard')}</select></div><div class="v99-smart-preview"><b>${esc(node.title)}</b><div>当前角色：${esc(ComposerV99.roleLabel(selectedRole))}</div><div style="margin-top:6px">整套换主题只重绘带 deckRole 的智能页面；普通手工页面不会被强制覆盖。</div></div></div></div><div class="v99-smart-actions"><button id="v99RethemeAll" type="button">整套换主题</button><button id="v99PageCancel" type="button">取消</button><button class="primary" id="v99RelayoutPage" type="button">重新套版当前页</button></div>`;
    dialog.appendChild(body);const grid=body.querySelector('#v99RoleGrid');for(const role of ComposerV99.roles){const button=document.createElement('button');button.type='button';button.className='v99-smart-role'+(role.id===selectedRole?' active':'');button.dataset.role=role.id;button.innerHTML=`<b>${esc(role.label)}</b><small>${esc(roleDescription(role.id))}</small>`;button.onclick=()=>{selectedRole=role.id;grid.querySelectorAll('.v99-smart-role').forEach(item=>item.classList.toggle('active',item.dataset.role===selectedRole))};grid.appendChild(button)}
    body.querySelector('#v99PageCancel').onclick=removeSmartOverlay;body.querySelector('#v99RelayoutPage').onclick=()=>{checkpoint();ComposerV99.relayoutNode(node,{role:selectedRole,theme:body.querySelector('#v99PageTheme').value,density:body.querySelector('#v99PageDensity').value});normalize();save();renderEditor();removeSmartOverlay();toast(`当前页已切换为“${ComposerV99.roleLabel(selectedRole)}”版式`)};
    body.querySelector('#v99RethemeAll').onclick=()=>{const theme=body.querySelector('#v99PageTheme').value;if(!confirm('整套切换主题会重绘所有由 V9.9 智能组稿生成的页面，普通手工页面保持不变。继续？'))return;checkpoint();ComposerV99.rethemeProject(data,theme,{regenerate:true});data.deckTheme=theme;normalize();save();renderEditor();renderMap();removeSmartOverlay();toast('整套智能页面主题已更新')};
  }

  function initSmartComposerV99(){if(!ComposerV99||document.getElementById('v99SmartComposeBtn'))return;installSmartStyles();const host=document.querySelector('.desktop-project-tools');if(host){smartComposeButton=document.createElement('button');smartComposeButton.id='v99SmartComposeBtn';smartComposeButton.className='btn primary v99-smart-entry';smartComposeButton.textContent='智能组稿';smartComposeButton.title='从 Markdown / 大纲生成整套可编辑演示';smartComposeButton.onclick=openSmartComposer;host.prepend(smartComposeButton)}const editorTools=document.querySelector('.editor-topbar .element-toolbar');if(editorTools){smartPageButton=document.createElement('button');smartPageButton.id='v99PageDesignerBtn';smartPageButton.className='btn';smartPageButton.textContent='页面方案';smartPageButton.title='切换页面角色、密度或整套主题';smartPageButton.onclick=openPageDesigner;editorTools.appendChild(smartPageButton)}smartMobileButton=document.createElement('button');smartMobileButton.className='v99-smart-mobile';smartMobileButton.id='v99SmartMobileBtn';smartMobileButton.textContent='组';smartMobileButton.title='智能组稿';smartMobileButton.onclick=openSmartComposer;document.body.appendChild(smartMobileButton)}

  setTimeout(initSmartComposerV99,0);
