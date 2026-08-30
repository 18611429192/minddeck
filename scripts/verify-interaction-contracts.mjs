import fs from 'node:fs';
import assert from 'node:assert/strict';

const root=new URL('../',import.meta.url);
const html=fs.readFileSync(new URL('index.html',root),'utf8');
const shell=fs.readFileSync(new URL('src/app/shell.html',root),'utf8');
const runtime=fs.readFileSync(new URL('src/runtime/shared-core.js',root),'utf8');
const manifest=JSON.parse(fs.readFileSync(new URL('src/app/app.manifest.json',root),'utf8'));
const pkg=JSON.parse(fs.readFileSync(new URL('package.json',root),'utf8'));
const appSource=manifest.scripts.map(path=>fs.readFileSync(new URL(`src/app/${path}`,root),'utf8')).join('\n');

for(const marker of [
  'const APP_COMMANDS={','function runAppCommand(name)','mobileMainFit','mobileMainAdd',
  'mobileMainPage','mobileMainPresent','runAppCommand("reflow")','runAppCommand("exportCurrent")',
  'runAppCommand("health")','runAppCommand("present")','presentationView?.handleKey(e)',
  'InputCore.mapKeyAction(e)','CommandsCore.applyMapAction(data,selectedNodeId,action'
]) assert.ok(html.includes(marker),`Interaction contract missing: ${marker}`);
assert.ok(!html.includes('data-mm="page">编辑当前页面'),'duplicate mobile page command returned');

const staticButtonIds=[...shell.matchAll(/<button\b[^>]*\bid="([^"]+)"[^>]*>/g)].map(match=>match[1]);
assert.ok(staticButtonIds.length>=45,`Unexpectedly small static button surface: ${staticButtonIds.length}`);
for(const id of staticButtonIds){
  const quotedDouble=`getElementById("${id}")`,quotedSingle=`getElementById('${id}')`;
  assert.ok(appSource.includes(quotedDouble)||appSource.includes(quotedSingle),`Static button has no app binding reference: #${id}`);
}

for(const [selector,label] of [
  ['[data-close-panel]','panel close buttons'],
  ['[data-theme-choice]','theme choice buttons'],
  ['[data-align]','desktop align buttons'],
  ['[data-mm]','mobile main command buttons'],
  ['[data-mi]','mobile insert buttons'],
  ['[data-ma]','mobile align buttons'],
  ['[data-ml]','mobile layer buttons']
]) assert.ok(appSource.includes(selector),`Generic binding missing for ${label}: ${selector}`);

const version=pkg.version.split('-')[0],versionBadge=version.split('.').slice(0,2).join('.');
assert.ok(html.includes(`content:'${versionBadge}'`),`Smart composer badge is stale; expected ${versionBadge}`);
assert.ok(!html.includes("content:'9.9';position:absolute"),`V9.9 smart composer badge leaked into ${version}`);
assert.ok(!html.includes('24 个结构模板由 Matcher + Diversity Allocator 自动分配'),'stale 24-template preview leaked into built app');
assert.ok(html.includes('${ComposerV99.templates.length} 个结构模板由 Matcher + Diversity Allocator 自动分配'),'smart composer preview must derive template count from runtime');

if(!runtime.includes('PresentationView.defaults'))throw new Error('Shared PresentationView defaults missing');
console.log(`Interaction contracts: OK (13 command checks + ${staticButtonIds.length} static buttons + dynamic button groups + V${version} UI freshness)`);
