import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const write=(p,s)=>{const f=path.join(root,p);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,s.endsWith('\n')?s:s+'\n')};
const rm=p=>{const f=path.join(root,p);if(fs.existsSync(f))fs.rmSync(f,{recursive:true,force:true})};
const must=(cond,msg)=>{if(!cond)throw new Error(msg)};
const kebab=s=>s.replace(/([a-z0-9])([A-Z])/g,'$1-$2').toLowerCase();

// ---- package / version source -------------------------------------------------
const pkg=JSON.parse(read('package.json'));
pkg.version='9.8.0-rc.1';
pkg.description='Mind map structured presentation editor with freeform 16:9 slides and portable single-HTML export';
pkg.scripts={
  build:'node scripts/build-runtime.mjs && node scripts/build-single-html.mjs',
  'build:runtime':'node scripts/build-runtime.mjs',
  'build:single':'node scripts/build-single-html.mjs',
  test:'node scripts/release-check.mjs',
  check:'node scripts/release-check.mjs',
  'release:check':'node scripts/release-check.mjs',
  'audit:architecture':'node scripts/verify-architecture.mjs',
  e2e:'playwright test',
  serve:'python -m http.server 8080'
};
pkg.devDependencies={...(pkg.devDependencies||{}),esbuild:'^0.25.9','@playwright/test':'^1.55.0'};
write('package.json',JSON.stringify(pkg,null,2));

// ---- runtime: split the former monolith into real ES modules -----------------
const runtime=read('src/runtime/shared-core.js');
must(runtime.includes("const VERSION='9.7.0'"),'unexpected runtime version marker');
const body=runtime
  .replace(/^\(function\(global\)\{\r?\n\s*'use strict';\r?\n/,'')
  .replace(/\r?\n\s*global\.MindDeckCore=Object\.freeze\([\s\S]*?\);\r?\n\}\)\(typeof globalThis[^\n]+\);?\s*$/,'');
const first=body.search(/^  const Ids=/m);
must(first>=0,'runtime Ids block not found');
let preamble=body.slice(0,first).replace(/^  /gm,'');
preamble=preamble.replace("const VERSION='9.7.0';","export const VERSION=__MINDDECK_RUNTIME_VERSION__;");
preamble=preamble.replace(/^const /gm,'export const ');
const constantNames=['VERSION','LAYOUTS','THEMES','THEME_LABELS','ANIMATION_TYPES','ANIMATION_LABELS','MASTER_Z_MIN','MASTER_Z_MAX','SLIDE_Z_MIN','SLIDE_Z_MAX'];
write('src/runtime/modules/constants.js',preamble.trim());

const moduleText=body.slice(first);
const hits=[...moduleText.matchAll(/^  const ([A-Za-z_$][\w$]*)=/gm)];
must(hits.length>=15,'runtime module split found too few blocks');
const names=hits.map(m=>m[1]);
const files=new Map(names.map(n=>[n,kebab(n)+'.js']));
for(let i=0;i<hits.length;i++){
  const name=names[i],start=hits[i].index,end=i+1<hits.length?hits[i+1].index:moduleText.length;
  let block=moduleText.slice(start,end).replace(/^  /gm,'').trim();
  block=block.replace(new RegExp('^const '+name+'='),'export const '+name+'=');
  const deps=names.filter(other=>other!==name&&new RegExp('\\b'+other+'\\b').test(block));
  const constDeps=constantNames.filter(c=>new RegExp('\\b'+c+'\\b').test(block));
  const imports=[];
  if(constDeps.length)imports.push(`import { ${constDeps.join(', ')} } from './constants.js';`);
  for(const dep of deps)imports.push(`import { ${dep} } from './${files.get(dep)}';`);
  write('src/runtime/modules/'+files.get(name),imports.join('\n')+(imports.length?'\n\n':'')+block);
}
const imports=[`import { ${constantNames.join(', ')} } from './modules/constants.js';`];
for(const name of names)imports.push(`import { ${name} } from './modules/${files.get(name)}';`);
const coreObject=`Object.freeze({VERSION,LAYOUTS:Object.freeze(LAYOUTS.slice()),THEMES:Object.freeze(THEMES.slice()),RANGES:Object.freeze({MASTER_Z_MIN,MASTER_Z_MAX,SLIDE_Z_MIN,SLIDE_Z_MAX}),${names.join(',')}})`;
write('src/runtime/index.js',`${imports.join('\n')}\n\nexport const MindDeckCore=${coreObject};\nglobalThis.MindDeckCore=MindDeckCore;\nexport default MindDeckCore;`);
write('src/runtime/README.md',`# Shared Runtime\n\nV9.8 起，Shared Runtime 的源码位于 \`src/runtime/modules/\`，使用真正的 ES Modules 管理依赖。\n\n\`scripts/build-runtime.mjs\` 使用 esbuild 将 \`src/runtime/index.js\` 打包成 \`src/runtime/shared-core.js\`。后者是生成产物，用于浏览器单 HTML 和 Node 回归测试，不再手工维护。\n\n业务规则只允许在 Runtime modules 中实现；编辑器、Portable HTML、Pages Demo 都调用同一 Runtime。`);

write('scripts/build-runtime.mjs',`import fs from 'node:fs';\nimport { build } from 'esbuild';\nconst pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));\nconst version=pkg.version.split('-')[0];\nawait build({entryPoints:[new URL('../src/runtime/index.js',import.meta.url).pathname],bundle:true,format:'iife',platform:'browser',target:'es2020',outfile:new URL('../src/runtime/shared-core.js',import.meta.url).pathname,define:{__MINDDECK_RUNTIME_VERSION__:JSON.stringify(version)},banner:{js:'/* GENERATED FILE: edit src/runtime/modules, not this bundle. */'}});\nconsole.log('MindDeck shared runtime built from ES modules:',version);`);

// ---- app version placeholders + showcase mode --------------------------------
let boot=read('src/app/modules/00-bootstrap.js');
boot=boot.replace('const W=1600,H=900,APP_VERSION="9.7.0 RC",RUNTIME_VERSION="9.7.0",RELEASE_CHANNEL="rc";',
`const W=1600,H=900,APP_VERSION="__MINDDECK_APP_VERSION__",RUNTIME_VERSION="__MINDDECK_RUNTIME_VERSION__",RELEASE_CHANNEL="__MINDDECK_RELEASE_CHANNEL__";\n  const showcaseMode=new URLSearchParams(location.search).get("showcase")==="1";`);
boot=boot.replace('function persistProjectNow(reason="autosave"){\n    if(autosaveTimer)', 'function persistProjectNow(reason="autosave"){\n    if(showcaseMode){setSaveStatus("saved","Showcase");return true}\n    if(autosaveTimer)');
write('src/app/modules/00-bootstrap.js',boot);

let presentation=read('src/app/modules/30-presentation.js');
presentation=presentation.replace('async function enterPresentation(){','async function enterPresentation(options={}){');
presentation=presentation.replace('    if(!(await FullscreenCore.enter(workspace)))toast("浏览器未允许全屏，已进入窗口演示；按 Esc 退出");','    if(options.fullscreen===false)return;\n    if(!(await FullscreenCore.enter(workspace)))toast("浏览器未允许全屏，已进入窗口演示；按 Esc 退出");');
write('src/app/modules/30-presentation.js',presentation);

let bindings=read('src/app/modules/90-bindings-init.js');
const oldStartup='  normalize();applyUiTheme();syncMapLayoutControls();updateMasterPanel();renderExportSettings();lastSavedJson=JSON.stringify(data);saveNow("startup-migrate");updateRecoveryButton();setAppMode(appMode);renderOrderPanel();setTimeout(()=>{fitAll();if(startupRecovery)toast("已从自动恢复备份载入项目");setTimeout(()=>showWelcome(false),220)},60);';
must(bindings.includes(oldStartup),'startup block not found');
const newStartup=`  async function loadShowcase(){\n    if(!showcaseMode)return false;\n    try{\n      const response=await fetch('./examples/demo.json',{cache:'no-store'});\n      if(!response.ok)throw new Error('HTTP '+response.status);\n      data=clone(await response.json());normalize();selectedNodeId=data.id;appMode='presentation';\n      applyUiTheme();syncMapLayoutControls();updateMasterPanel();renderExportSettings();setAppMode(appMode);renderMap();renderOrderPanel();fitAll();\n      setTimeout(()=>enterPresentation({fullscreen:false}),80);return true;\n    }catch(err){console.error('MindDeck showcase load failed',err);toast('Showcase 加载失败，已打开默认示例');return false}\n  }\n\n  globalThis.MindDeckApp=Object.freeze({\n    version:APP_VERSION,runtimeVersion:RUNTIME_VERSION,\n    getProject:()=>clone(data),\n    loadProject(project){data=clone(project);normalize();selectedNodeId=data.id;applyUiTheme();syncMapLayoutControls();renderMap();renderOrderPanel();fitAll();return clone(data)},\n    openEditor:(mode='slide',nodeId=selectedNodeId)=>openEditor(mode,nodeId),\n    enterPresentation:(options={fullscreen:false})=>enterPresentation(options),\n    exportHtml(kind='presentation'){return kind==='mindmap'?buildStandaloneMindmapHtml():kind==='fusion'?buildStandaloneFusionHtml():buildStandaloneViewerHtml()}\n  });\n\n  normalize();applyUiTheme();syncMapLayoutControls();updateMasterPanel();renderExportSettings();lastSavedJson=JSON.stringify(data);saveNow("startup-migrate");updateRecoveryButton();setAppMode(appMode);renderOrderPanel();setTimeout(async()=>{fitAll();if(await loadShowcase())return;if(startupRecovery)toast("已从自动恢复备份载入项目");setTimeout(()=>showWelcome(false),220)},60);`;
bindings=bindings.replace(oldStartup,newStartup);
write('src/app/modules/90-bindings-init.js',bindings);

// ---- Demo: no second presentation implementation ------------------------------
write('site/demo.html',`<!doctype html>\n<html lang="zh-CN">\n<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>MindDeck Demo · __MINDDECK_VERSION__</title><style>html,body{height:100%;margin:0;font-family:system-ui,"PingFang SC","Microsoft YaHei",sans-serif;background:#10151d;color:#fff;display:grid;place-items:center}.card{text-align:center;padding:28px}.card b{display:block;font-size:22px;margin-bottom:8px}.card span{color:#aeb8c7}</style></head>\n<body><div class="card"><b>MindDeck Showcase</b><span>正在加载统一 Runtime Demo…</span></div><script>location.replace('app.html?showcase=1')</script></body>\n</html>`);

// ---- Portable shell: move markup/CSS out of JS string ------------------------
let portable=read('src/app/modules/40-portable-export.js');
const docMatch=portable.match(/    const doc=String\.raw`([\s\S]*?)`;\n    return doc\.replace\("__SCRIPT_END__","<\/scr"\+"ipt>"\);/);
must(docMatch,'portable document template not found');
let tpl=docMatch[1];
const styleMatch=tpl.match(/<style>\n([\s\S]*?)\n\$\{sharedStylesSource\}\n([\s\S]*?)\n<\/style>/);
must(styleMatch,'portable CSS block not found');
const portableCss=(styleMatch[1]+'\n'+styleMatch[2]).trim();
write('src/portable/portable.css',portableCss);
let shell=tpl.replace(/<style>\n[\s\S]*?\n<\/style>/,'<style>\n__PORTABLE_CSS__\n__PORTABLE_SHARED_STYLES__\n</style>');
shell=shell.replace(/<script>\n\$\{sharedRuntimeSource\}[\s\S]*?__SCRIPT_END__/,'__PORTABLE_BOOTSTRAP__');
shell=shell.replaceAll('${title}','__PORTABLE_TITLE__').replaceAll('${portableTheme}','__PORTABLE_THEME__').replaceAll('${RUNTIME_VERSION}','__PORTABLE_RUNTIME_VERSION__');
write('src/portable/shell.html',shell);
const replacement=`    const shellSource=document.getElementById("minddeck-portable-shell")?.textContent||"";\n    if(!shellSource)throw new Error("Portable shell missing");\n    const bootstrap='<scr'+'ipt>\\n'+sharedRuntimeSource+'\\nconst data='+payload+',KIND='+kindJson+',RUNTIME_VERSION='+JSON.stringify(RUNTIME_VERSION)+';\\n'+\n      'document.body.classList.add("kind-"+KIND);\\nif(!globalThis.MindDeckCore||globalThis.MindDeckCore.VERSION!==RUNTIME_VERSION)throw new Error("MindDeck Portable Runtime mismatch");\\n'+\n      'globalThis.MindDeckCore.Portable.mount({data,kind:KIND,width:1600,height:900,document,window});\\n</scr'+'ipt>';\n    return shellSource.replaceAll('__PORTABLE_TITLE__',title).replaceAll('__PORTABLE_THEME__',portableTheme).replaceAll('__PORTABLE_RUNTIME_VERSION__',RUNTIME_VERSION).replace('__PORTABLE_BOOTSTRAP__',bootstrap);`;
portable=portable.replace(docMatch[0],replacement);
write('src/app/modules/40-portable-export.js',portable);

// ---- app shell / build ---------------------------------------------------------
let appShell=read('src/app/shell.html');
appShell=appShell.replace('<title>MindDeck V9.7.0 RC - 发布候选版</title>','<title>MindDeck __MINDDECK_APP_VERSION__ - 发布候选版</title>');
appShell=appShell.replace('MindDeck V9.7.0 RC<small>发布候选 · 统一架构 · Runtime 9.6.6</small>','MindDeck __MINDDECK_APP_VERSION__<small>发布候选 · 统一架构 · Runtime __MINDDECK_RUNTIME_VERSION__</small>');
appShell=appShell.replace('MindDeck V9.7.0 RC</span><h2','MindDeck __MINDDECK_APP_VERSION__</span><h2');
appShell=appShell.replace('<!-- MINDDECK_SHARED_RUNTIME_START -->',`<script type="text/plain" id="minddeck-portable-shell">\n__MINDDECK_PORTABLE_SHELL__\n</script>\n\n<!-- MINDDECK_SHARED_RUNTIME_START -->`);
write('src/app/shell.html',appShell);

write('scripts/build-single-html.mjs',`import fs from 'node:fs';\nimport path from 'node:path';\nimport { fileURLToPath } from 'node:url';\nconst here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'..');\nconst read=p=>fs.readFileSync(path.join(root,p),'utf8').trimEnd();\nconst pkg=JSON.parse(read('package.json')),version=pkg.version.split('-')[0],isRc=/-rc(?:\\.|$)/.test(pkg.version),display='V'+version+(isRc?' RC':'');\nconst manifest=JSON.parse(read('src/app/app.manifest.json'));\nconst shell=read('src/app/shell.html');\nconst appStyles=manifest.styles.map(p=>read('src/app/'+p)).join('\\n\\n');\nlet appBundle=manifest.scripts.map(p=>read('src/app/'+p)).join('\\n\\n');\nappBundle=appBundle.replaceAll('__MINDDECK_APP_VERSION__',display).replaceAll('__MINDDECK_RUNTIME_VERSION__',version).replaceAll('__MINDDECK_RELEASE_CHANNEL__',isRc?'rc':'stable');\nconst sharedStyles=read('src/runtime/shared-styles.css'),sharedRuntime=read('src/runtime/shared-core.js');\nconst portableShell=read('src/portable/shell.html').replace('__PORTABLE_CSS__',read('src/portable/portable.css')).replace('__PORTABLE_SHARED_STYLES__',sharedStyles);\nconst slots={'__MINDDECK_APP_STYLES__':appStyles,'__MINDDECK_SHARED_STYLES__':sharedStyles,'__MINDDECK_SHARED_RUNTIME__':sharedRuntime,'__MINDDECK_APP_BUNDLE__':appBundle,'__MINDDECK_PORTABLE_SHELL__':portableShell};\nlet out=shell.replaceAll('__MINDDECK_APP_VERSION__',display).replaceAll('__MINDDECK_RUNTIME_VERSION__',version);\nfor(const [slot,value] of Object.entries(slots)){const count=out.split(slot).length-1;if(count!==1)throw new Error('build slot '+slot+' expected once, got '+count);out=out.replace(slot,value)}\nif(/__MINDDECK_(?:APP|SHARED|PORTABLE)_[A-Z0-9_]+__/.test(out))throw new Error('unresolved MindDeck build slot');\nfs.writeFileSync(path.join(root,'index.html'),out+'\\n');\nconsole.log('MindDeck',display,'standalone index.html built');`);

const manifest=JSON.parse(read('src/app/app.manifest.json'));
manifest.buildMode='application-closure';
manifest.description='UI responsibility slices are concatenated into one application closure; domain/runtime dependencies are real ES modules and bundled separately.';
write('src/app/app.manifest.json',JSON.stringify(manifest,null,2));

// ---- tests / architecture gates ------------------------------------------------
write('scripts/verify-architecture.mjs',`import fs from 'node:fs';\nimport assert from 'node:assert/strict';\nconst read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');\nconst runtimeIndex=read('src/runtime/index.js'),demo=read('site/demo.html'),portable=read('src/app/modules/40-portable-export.js');\nconst moduleDir=new URL('../src/runtime/modules/',import.meta.url);\nconst modules=fs.readdirSync(moduleDir).filter(x=>x.endsWith('.js'));\nassert.ok(modules.length>=20,'shared runtime was not split into ES modules');\nfor(const file of modules){const code=fs.readFileSync(new URL(file,moduleDir),'utf8');assert.match(code,/export const /,'runtime module lacks ESM export: '+file)}\nassert.match(runtimeIndex,/import \{ .* \} from '\.\/modules\//,'runtime index does not import modules');\nassert.match(runtimeIndex,/globalThis\.MindDeckCore=MindDeckCore/,'runtime bundle does not expose browser core');\nfor(const forbidden of [/const slides=/,/function visible\(/,/function renderToc\(/,/function step\(/,/toggleSecurity/])assert.ok(!forbidden.test(demo),'Pages demo reintroduced a second presentation implementation: '+forbidden);\nassert.ok(demo.includes('app.html?showcase=1'),'Pages demo does not route through the real app/runtime');\nassert.ok(portable.includes('minddeck-portable-shell'),'portable exporter does not consume shared shell source');\nassert.ok(!portable.includes('const doc=String.raw`<!DOCTYPE html>'),'portable HTML shell was copied back into JS');\nconst adapters=['src/core/ids.js','src/core/tree.js','src/core/layout.js','src/core/presentation.js','src/core/project.js','src/core/commands.js','src/core/recovery.js','src/core/diagnostics.js'];\nfor(const file of adapters){const code=read(file);assert.ok(code.includes("from './runtime.js'"),file+' is not a shared runtime adapter')}\nconsole.log('Architecture audit: OK (ES module runtime, unified Demo, shared Portable shell)');`);

let modular=read('scripts/verify-modular-build.mjs');
modular=modular.replace("const runtime=fs.readFileSync(new URL('../src/runtime/shared-core.js',import.meta.url),'utf8').trimEnd();", "const runtime=fs.readFileSync(new URL('../src/runtime/shared-core.js',import.meta.url),'utf8').trimEnd();\nconst portableShell=fs.readFileSync(new URL('../src/portable/shell.html',import.meta.url),'utf8').trimEnd();");
modular=modular.replace("for(const slot of ['__MINDDECK_APP_STYLES__','__MINDDECK_SHARED_STYLES__','__MINDDECK_SHARED_RUNTIME__','__MINDDECK_APP_BUNDLE__'])", "for(const slot of ['__MINDDECK_APP_STYLES__','__MINDDECK_SHARED_STYLES__','__MINDDECK_SHARED_RUNTIME__','__MINDDECK_APP_BUNDLE__','__MINDDECK_PORTABLE_SHELL__'])");
write('scripts/verify-modular-build.mjs',modular);

let release=read('scripts/release-check.mjs');
release=release.replace("const commands=[\n  ['node',['scripts/build-single-html.mjs']],", "const commands=[\n  ['node',['scripts/build-runtime.mjs']],\n  ['node',['scripts/build-single-html.mjs']],");
write('scripts/release-check.mjs',release);

write('playwright.config.mjs',`import { defineConfig, devices } from '@playwright/test';\nexport default defineConfig({testDir:'./tests/e2e',timeout:30000,use:{baseURL:'http://127.0.0.1:8080',trace:'retain-on-failure'},webServer:{command:'python -m http.server 8080',url:'http://127.0.0.1:8080',reuseExistingServer:true},projects:[{name:'chromium',use:{...devices['Desktop Chrome']}},{name:'mobile-chromium',use:{...devices['Pixel 7']}}]});`);
write('tests/e2e/minddeck.spec.mjs',`import { test, expect } from '@playwright/test';\n\ntest('app exposes one runtime and V9.8 application API',async({page})=>{await page.goto('/');await expect.poll(()=>page.evaluate(()=>globalThis.MindDeckCore?.VERSION)).toBe('9.8.0');await expect.poll(()=>page.evaluate(()=>globalThis.MindDeckApp?.runtimeVersion)).toBe('9.8.0')});\n\ntest('Pages showcase uses the real presentation view',async({page})=>{await page.goto('/?showcase=1');await expect(page.locator('#presentShell')).toHaveClass(/open/);await expect(page.locator('#tocTree')).toContainText('安全');await expect(page.locator('#presentStage')).not.toBeEmpty()});\n\ntest('folding a showcase branch changes the presentation sequence',async({page})=>{await page.goto('/?showcase=1');await expect(page.locator('#tocTree')).toContainText('权限');const security=page.locator('.toc-item').filter({hasText:'安全'}).first();await security.locator('.fold-mini').click();await expect(page.locator('#tocTree')).not.toContainText('权限')});\n\ntest('portable presentation generated by app boots the same runtime',async({page})=>{await page.goto('/');const html=await page.evaluate(()=>globalThis.MindDeckApp.exportHtml('presentation'));expect(html).toContain('Portable Runtime 9.8.0');expect(html).toContain('MindDeckCore.Portable.mount')});\n\ntest('master editor uses the same 1600x900 stage on mobile and desktop',async({page})=>{await page.goto('/');await page.evaluate(()=>globalThis.MindDeckApp.openEditor('master'));await expect(page.locator('#editorShell')).toHaveClass(/open/);await expect(page.locator('#editorStage')).toHaveCSS('width','1600px');await expect(page.locator('#editorStage')).toHaveCSS('height','900px')});`);

// ---- CI / Pages ---------------------------------------------------------------
write('.github/workflows/ci.yml',`name: MindDeck CI\n\non:\n  push:\n    branches: [main, refactor/v9.8-complete]\n  pull_request:\n\njobs:\n  release-check:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 22\n          cache: npm\n      - run: npm ci\n      - name: Run MindDeck release checks\n        run: npm run release:check\n  e2e:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 22\n          cache: npm\n      - run: npm ci\n      - run: npx playwright install --with-deps chromium\n      - run: npm run build\n      - name: Browser regression\n        run: npm run e2e\n`);
let pages=read('.github/workflows/pages.yml');
pages=pages.replace('      - name: Build standalone app\n        run: npm run build','      - name: Install dependencies\n        run: npm ci\n\n      - name: Build standalone app\n        run: npm run build');
write('.github/workflows/pages.yml',pages);

write('.github/workflows/release.yml',`name: Release MindDeck\n\non:\n  push:\n    tags: ['v*']\npermissions:\n  contents: write\njobs:\n  release:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 22\n          cache: npm\n      - run: npm ci\n      - run: npm run release:check\n      - name: Prepare assets\n        run: |\n          mkdir -p dist\n          cp index.html dist/minddeck-\${GITHUB_REF_NAME}.html\n          cp examples/demo.json dist/minddeck-demo.json\n          sha256sum dist/* > dist/SHA256SUMS.txt\n      - uses: softprops/action-gh-release@v2\n        with:\n          generate_release_notes: true\n          files: dist/*\n`);

// ---- public repository files --------------------------------------------------
write('LICENSE',`MIT License\n\nCopyright (c) 2026 18611429192\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`);
write('CONTRIBUTING.md',`# Contributing to MindDeck\n\n1. 从 \`main\` 创建功能分支。\n2. 修改业务规则时优先改 \`src/runtime/modules/\`；不要在 Demo、Portable 或编辑器里复制第二套布局/播放逻辑。\n3. 执行 \`npm ci && npm run release:check\`。涉及交互时再执行 \`npx playwright install chromium && npm run e2e\`。\n4. PR 请说明：用户行为变化、是否影响导出、是否影响移动端、测试覆盖。\n\n最终发布物必须继续保持单 HTML、离线可运行。`);
write('SECURITY.md',`# Security Policy\n\nMindDeck 是纯浏览器本地工具，不要求账号或后端服务。项目数据默认保存在浏览器本地存储中；只有用户主动导出文件或引用远程媒体 URL 时才会产生对应的数据流。\n\n发现安全问题请不要公开附带敏感样本，可通过仓库所有者可见的私密渠道联系维护者；普通功能缺陷请使用 GitHub Issues。`);
write('.github/pull_request_template.md',`## 变更\n\n- \n\n## 一致性检查\n\n- [ ] 编辑器 / 演示 / Portable 导出没有新增第二套业务实现\n- [ ] \`npm run release:check\` 通过\n- [ ] 涉及交互时 Playwright E2E 已覆盖\n- [ ] 移动端 / 16:9 缩放行为已检查\n`);
write('.github/ISSUE_TEMPLATE/bug_report.yml',`name: Bug report\ndescription: 报告 MindDeck 功能或导出不一致问题\ntitle: "[Bug] "\nbody:\n  - type: textarea\n    id: problem\n    attributes: {label: 问题, description: 请描述实际行为和期望行为}\n    validations: {required: true}\n  - type: dropdown\n    id: area\n    attributes: {label: 区域, options: [思维导图, 页面编辑, 母版, 演示, Portable 导出, 移动端, GitHub Pages]}\n  - type: textarea\n    id: repro\n    attributes: {label: 复现步骤}\n  - type: input\n    id: browser\n    attributes: {label: 浏览器 / 系统}\n`);

// archive construction notes from repository root
for(const name of fs.readdirSync(root)){
  if(/^V\d+.*\.md$/i.test(name)||['PROMOTION_UPDATE.md','PUBLISH_FIX.md'].includes(name)){
    const target='docs/releases/archive/'+name;write(target,read(name));rm(name);
  }
}

write('docs/architecture-v9.8.md',`# MindDeck V9.8 Architecture\n\n## 单一业务源\n\nTree、Project、Layout、Presentation、PresentationView、MapRenderer、Slide、Portable 等规则全部位于 \`src/runtime/modules/\`。这些文件是真正的 ES Modules，由 esbuild 生成 \`src/runtime/shared-core.js\`。\n\n编辑器、Portable HTML 与 Pages Showcase 都消费同一个 \`MindDeckCore\`。\n\n## Application UI\n\n\`src/app/modules/\` 是同一个编辑器应用闭包内的职责切片，负责 DOM 绑定和可变编辑状态，不再冒充独立业务模块。业务算法不得在这里复制。\n\n## Portable\n\nPortable 的 HTML 壳和 CSS 分别位于 \`src/portable/shell.html\`、\`src/portable/portable.css\`；运行行为由 Shared Runtime 的 \`Portable.mount\` 提供。\n\n## Demo\n\n\`site/demo.html\` 只跳转到 \`app.html?showcase=1\`。Showcase 从 \`examples/demo.json\` 加载，并进入编辑器本身的 PresentationView，因此 Demo 不再维护第二套 TOC / 播放顺序 / 折叠逻辑。\n\n## 质量门\n\nNode 回归检查业务规则与生成物一致性；Playwright 覆盖真实浏览器中的 Showcase、折叠序列、Portable 生成、母版和移动端舞台。`);

// README: product first, architecture linked
write('README.md',`# MindDeck\n\n**用思维导图保留整个演示结构，让每个节点又是一张真正可设计的 16:9 页面。**\n\n> 当前版本：**V9.8.0 RC** · 单 HTML · 本地优先 · Unified Runtime\n\n[在线体验](https://18611429192.github.io/minddeck/app.html) · [交互 Demo](https://18611429192.github.io/minddeck/demo.html) · [项目首页](https://18611429192.github.io/minddeck/)\n\n![MindDeck 动态演示](docs/assets/minddeck-demo.gif)\n\n普通 PPT 适合按页讲，但产品方案、技术架构、培训和评审往往本身是一棵树。MindDeck 保留这棵树：演示时收起一个分支，它的细节页会离开后续播放序列；重新展开，又可以继续深入。\n\n## 核心能力\n\n- **结构**：左右、单侧、向下、放射布局；曲线连线；拖动；展开 / 折叠；按当前可见节点重排。\n- **页面**：每个节点一张 1600 × 900 页面，支持文字、图片、视频、形状、母版、多选、对齐、图层和轻量动画。\n- **演示**：目录跳转、目录显隐、键盘 / 滚轮 / 触摸翻页，展开状态实时决定播放序列。\n- **导出**：JSON、.minddeck、独立思维导图 HTML、独立演示 HTML、融合 HTML。Portable HTML 仍保留交互能力。\n- **本地优先**：无需注册、无需后端。项目默认只保存在浏览器本地；你主动引用远程媒体 URL 时除外。\n\n## 两分钟开始\n\n直接打开 [在线编辑器](https://18611429192.github.io/minddeck/app.html)，或下载仓库根目录的 \`index.html\` 离线双击运行。\n\n本地开发：\n\n\`\`\`bash\nnpm ci\nnpm run build\nnpm run serve\n\`\`\`\n\n浏览器打开 \`http://localhost:8080\`。\n\n完整检查：\n\n\`\`\`bash\nnpm run release:check\nnpx playwright install chromium\nnpm run e2e\n\`\`\`\n\n## V9.8 架构\n\nV9.8 把 Shared Runtime 从一个大文件继续拆成真正的 ES Modules；构建时再打包成浏览器可内嵌的单文件 Runtime。Pages Demo 也不再维护独立的 slides / TOC / 翻页逻辑，而是加载 \`examples/demo.json\` 后直接进入正式 PresentationView。Portable 的 HTML / CSS 壳也已经从导出 JS 中抽离。\n\n最终发布优势没有改变：**根目录 \`index.html\` 仍是完整单文件，离线可运行。**\n\n详见 [V9.8 Architecture](docs/architecture-v9.8.md) 和 [Architecture Audit](ARCHITECTURE_AUDIT.md)。\n\n## 浏览器支持\n\n主要面向当前版本 Chrome / Edge / Safari / Firefox。移动端支持触摸浏览和页面编辑；不同浏览器的全屏、媒体自动播放和本地存储配额可能不同。\n\n## 当前限制\n\n- 不是 PowerPoint 的完整替代品；复杂图表、Office 原生格式和高级时间轴动画不是当前重点。\n- 大量 Base64 图片 / 视频会显著增大项目和单 HTML 文件，建议大项目保留独立媒体或及时导出备份。\n- 浏览器 localStorage 容量有限，重要项目请同时保存 \`.minddeck\` 或 JSON。\n\n## 项目结构\n\n\`\`\`text\nsrc/runtime/modules/   业务与运行时 ES Modules\nsrc/app/               编辑器 UI 与应用状态\nsrc/portable/          Portable HTML / CSS 壳\nexamples/              Showcase 项目数据\ntests/                 Node + Playwright 回归\nsite/                  GitHub Pages 首页和入口\n\`\`\`\n\n## 贡献与反馈\n\n最有价值的问题是：哪一步让你不敢在正式会议里用？编辑、演示和导出有没有行为不一致？\n\n贡献前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。安全说明见 [SECURITY.md](SECURITY.md)。\n\n## License\n\nMIT License。\n`);

// Improve Pages metadata without duplicating product behavior.
let siteIndex=read('site/index.html');
siteIndex=siteIndex.replace('<meta name="description" content="MindDeck：用思维导图组织演示结构，每个节点都是一张真正的 16:9 页面。">',`<meta name="description" content="MindDeck：用思维导图组织演示结构，每个节点都是一张真正的 16:9 页面。">\n<meta property="og:title" content="MindDeck · 先看清整件事，再讲清每一页">\n<meta property="og:description" content="思维导图结构 + 自由 16:9 页面 + 可折叠现场演示。">\n<meta property="og:type" content="website">\n<meta property="og:url" content="https://18611429192.github.io/minddeck/">\n<meta property="og:image" content="https://18611429192.github.io/minddeck/assets/minddeck-demo.gif">\n<meta name="twitter:card" content="summary_large_image">`);
siteIndex=siteIndex.replace('V9.6 已完成统一业务框架。','V9.8 已完成统一 Runtime 与 Demo 收口。');
siteIndex=siteIndex.replace('V9.6.6 连演示视图层也完成统一，编辑器内演示与导出演示共用 PresentationView。','V9.8 中编辑器、Portable 导出和 Pages Showcase 都使用同一 Shared Runtime / PresentationView。');
write('site/index.html',siteIndex);

console.log('V9.8 repository migration completed');
