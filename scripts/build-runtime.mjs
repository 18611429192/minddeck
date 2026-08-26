import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8').trimEnd();
const pkg=JSON.parse(read('package.json'));
const version=pkg.version.split('-')[0];
const modules=[
  'src/runtime/modules/env.js',
  'src/runtime/modules/model.js',
  'src/runtime/modules/platform.js',
  'src/runtime/modules/slide.js',
  'src/runtime/modules/view.js',
  'src/runtime/modules/portable.js',
  'src/runtime/index.js'
];

function stripEsm(code,file){
  const withoutImports=code.replace(/^import\s+[^;]+;\s*$/gm,'');
  const withoutExports=withoutImports.replace(/\bexport\s+(?=(?:const|let|var|function|class)\b)/g,'');
  if(/^\s*(?:import|export)\b/m.test(withoutExports))throw new Error(`unsupported ESM syntax remains in ${file}`);
  return withoutExports.trim();
}

const body=modules.map(file=>`// ---- ${file} ----\n${stripEsm(read(file),file)}`).join('\n\n');
const out=`/* GENERATED FILE. Edit src/runtime/modules/* and src/runtime/index.js, then run npm run build:runtime. */\n(function(global){\n'use strict';\n${body}\n\nconst VERSION=${JSON.stringify(version)};\nglobal.MindDeckCore=createMindDeckCore(VERSION);\n})(typeof globalThis!=='undefined'?globalThis:window);\n`;
fs.writeFileSync(path.join(root,'src/runtime/shared-core.js'),out);
console.log(`MindDeck Shared Runtime ${version} built from ${modules.length} ES module sources`);
