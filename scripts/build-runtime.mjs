import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8').trimEnd();
const pkg=JSON.parse(read('package.json'));
const version=pkg.version.split('-')[0];

const modules=['src/runtime/modules/env.js','src/runtime/modules/chart-data.js','src/runtime/modules/chart-svg.js','src/runtime/modules/chart-special.js','src/runtime/modules/chart.js','src/runtime/modules/structured-data.js','src/runtime/modules/structured-elements.js','src/runtime/modules/model.js','src/runtime/modules/composer/themes.js','src/runtime/modules/composer/base.js','src/runtime/modules/composer/schema.js','src/runtime/modules/source-document.js','src/runtime/modules/planner.js','src/runtime/modules/composer/params.js','src/runtime/modules/composer/design-intent.js','src/runtime/modules/composer/outline.js','src/runtime/modules/composer/templates.js','src/runtime/modules/composer/professional-templates.js','src/runtime/modules/composer/professional-capacity.js','src/runtime/modules/composer/matcher.js','src/runtime/modules/composer/allocator.js','src/runtime/modules/composer/theme-style.js','src/runtime/modules/composer/compiler.js','src/runtime/modules/composer/provenance.js','src/runtime/modules/composer/quality.js','src/runtime/modules/composer/diversity.js','src/runtime/modules/composer/deck.js','src/runtime/modules/composer/chart-layout.js','src/runtime/modules/composer/chart.js','src/runtime/modules/composer/structured.js','src/runtime/modules/composer/rich-layout.js','src/runtime/modules/composer.js','src/runtime/modules/ai-provider.js','src/runtime/modules/pptx-exporter.js','src/runtime/modules/platform.js','src/runtime/modules/slide.js','src/runtime/modules/view.js','src/runtime/modules/portable.js','src/runtime/index.js'];
const moduleIndex=new Map(modules.map((file,index)=>[file,index]));

function resolveImport(file,specifier){
  if(!specifier.startsWith('.'))throw new Error(`unsupported external runtime import ${specifier} in ${file}`);
  return path.posix.normalize(path.posix.join(path.posix.dirname(file),specifier));
}
function parseNamedList(text,{forImport=false}={}){
  return text.split(',').map(part=>part.trim()).filter(Boolean).map(part=>{
    const match=part.match(/^([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/);
    if(!match)throw new Error(`unsupported named binding: ${part}`);
    const source=match[1],alias=match[2]||source;
    return forImport?(source===alias?source:`${source}:${alias}`):{source,alias};
  });
}

function exportedVariableNames(source,file){
  const names=[];
  const pattern=/\bexport\s+(?:const|let|var)\s+/g;
  for(const match of source.matchAll(pattern)){
    let i=match.index+match[0].length;
    let paren=0,bracket=0,brace=0,quote=null,escaped=false,expectName=true,closed=false;
    while(i<source.length){
      if(expectName){
        while(/\s/.test(source[i]||''))i++;
        const nameMatch=source.slice(i).match(/^([A-Za-z_$][\w$]*)/);
        if(!nameMatch)throw new Error(`unsupported exported variable declaration in ${file}`);
        names.push(nameMatch[1]);i+=nameMatch[1].length;expectName=false;continue;
      }
      const ch=source[i];
      if(quote){
        if(escaped){escaped=false;i++;continue}
        if(ch==='\\'){escaped=true;i++;continue}
        if(ch===quote)quote=null;
        i++;continue;
      }
      if(ch==="'"||ch==='"'||ch==='`'){quote=ch;i++;continue}
      if(ch==='(')paren++;
      else if(ch===')')paren=Math.max(0,paren-1);
      else if(ch==='[')bracket++;
      else if(ch===']')bracket=Math.max(0,bracket-1);
      else if(ch==='{')brace++;
      else if(ch==='}')brace=Math.max(0,brace-1);
      else if(ch===','&&paren===0&&bracket===0&&brace===0){expectName=true;i++;continue}
      else if(ch===';'&&paren===0&&bracket===0&&brace===0){closed=true;break}
      i++;
    }
    if(!closed)throw new Error(`unterminated exported variable declaration in ${file}`);
  }
  return names;
}

function transformModule(file){
  let code=read(file);
  const imports=[];
  code=code.replace(/^import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"];?\s*$/gm,(_,bindings,specifier)=>{
    const dep=resolveImport(file,specifier);
    const depIndex=moduleIndex.get(dep);
    if(depIndex===undefined)throw new Error(`runtime dependency ${dep} imported by ${file} is not bundled`);
    if(depIndex>=moduleIndex.get(file))throw new Error(`runtime dependency order invalid: ${file} imports ${dep}`);
    imports.push(`const {${parseNamedList(bindings,{forImport:true}).join(',')}}=__modules[${JSON.stringify(dep)}];`);
    return '';
  });
  if(/^\s*import\b/m.test(code))throw new Error(`unsupported import syntax remains in ${file}`);

  const exports=new Map();
  code=code.replace(/^export\s*\{([^}]+)\};?\s*$/gm,(_,bindings)=>{
    for(const item of parseNamedList(bindings))exports.set(item.alias,item.source);
    return '';
  });
  code=code.replace(/\bexport\s+(?=(?:(?:async\s+)?function|const|let|var|class)\b)/g,'');
  const declarationPattern=/\b(?:const|let|var|class)\s+([A-Za-z_$][\w$]*)|\b(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g;
  const original=read(file);
  const multiExportNames=exportedVariableNames(original,file);
  const exportDeclarationPattern=/\bexport\s+(?:(?:const|let|var|class)\s+([A-Za-z_$][\w$]*)|(?:async\s+)?function\s+([A-Za-z_$][\w$]*))/g;
  for(const match of original.matchAll(exportDeclarationPattern)){const name=match[1]||match[2];exports.set(name,name)}
  for(const name of multiExportNames)exports.set(name,name);
  if(/^\s*export\b/m.test(code))throw new Error(`unsupported export syntax remains in ${file}`);

  const declared=new Set();
  for(const match of code.matchAll(declarationPattern))declared.add(match[1]||match[2]);
  for(const name of multiExportNames)declared.add(name);
  for(const source of exports.values())if(!declared.has(source)&&!imports.some(line=>new RegExp(`\\b${source}\\b`).test(line)))throw new Error(`export ${source} in ${file} is not declared or imported`);

  const returned=[...exports.entries()].map(([alias,source])=>alias===source?alias:`${JSON.stringify(alias)}:${source}`).join(',');
  return `// ---- ${file} ----\n__modules[${JSON.stringify(file)}]=(()=>{\n${imports.join('\n')}\n${code.trim()}\nreturn {${returned}};\n})();`;
}

const body=modules.map(transformModule).join('\n\n');
const entry='src/runtime/index.js';
const out=`/* GENERATED FILE. Edit src/runtime/modules/* and src/runtime/index.js, then run npm run build:runtime. */\n(function(){\n'use strict';\nconst __modules=Object.create(null);\n${body}\nconst VERSION=${JSON.stringify(version)};\nconst {createMindDeckCore}=__modules[${JSON.stringify(entry)}];\nglobalThis.MindDeckCore=createMindDeckCore(VERSION);\n})();\n`;
try{new Function(out)}catch(err){throw new Error(`generated shared runtime is not valid JavaScript: ${err.message}`,{cause:err})}
fs.writeFileSync(path.join(root,'src/runtime/shared-core.js'),out);
console.log(`MindDeck Shared Runtime ${version} built from ${modules.length} scoped ES module sources`);
