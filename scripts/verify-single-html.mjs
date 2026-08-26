import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.ok(html.includes('<!DOCTYPE html')&&html.includes('</html>'),'standalone HTML structure incomplete');
assert.ok(!/<script[^>]+\bsrc\s*=/i.test(html),'standalone artifact depends on external script');
assert.ok(!/<link[^>]+rel=["']?stylesheet/i.test(html),'standalone artifact depends on external stylesheet');
assert.ok(!/\b(?:src|href)=["'](?:\.\.?\/)[^"']+\.(?:js|css)(?:[?#][^"']*)?["']/i.test(html),'standalone artifact has relative JS/CSS dependency');
assert.ok(!/__MINDDECK_[A-Z0-9_]+__/.test(html),'standalone artifact contains unresolved MindDeck build slots');
assert.ok(html.includes('id="minddeck-portable-shell"'),'standalone artifact does not embed the Portable shell');
const scripts=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)]
  .filter(m=>!/type=["']text\/plain["']/i.test(m[1]))
  .map(m=>m[2]);
assert.ok(scripts.length>=2,'standalone runtime/app scripts missing');
scripts.forEach((code,i)=>new vm.Script(code,{filename:'standalone-script-'+(i+1)+'.js'}));
console.log('Standalone single-HTML contract: OK (no external JS/CSS runtime dependency)');
