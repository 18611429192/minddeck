const sourceClean=value=>String(value??'').replace(/\r\n?/g,'\n').trim();
const plain=value=>JSON.parse(JSON.stringify(value));
const SOURCE_TYPES=Object.freeze(['text','markdown','json']);
const SourceTypeSet=new Set(SOURCE_TYPES);
function sectionsFromMarkdown(raw){
  const lines=sourceClean(raw).split('\n'),sections=[];let current={title:'',content:[]};
  const flush=()=>{const content=sourceClean(current.content.join('\n'));if(current.title||content)sections.push({title:sourceClean(current.title),content});current={title:'',content:[]}};
  for(const line of lines){const m=line.match(/^#{1,6}\s+(.+)$/);if(m){flush();current.title=sourceClean(m[1])}else current.content.push(line)}flush();return sections;
}
function sectionsFromPlain(raw){
  const blocks=sourceClean(raw).split(/\n\s*\n+/).map(sourceClean).filter(Boolean);return blocks.map((content,index)=>({title:index===0?'':content.split('\n')[0].length<=72?content.split('\n')[0]:'',content}));
}
export function validateSourceDocument(input){
  const errors=[];if(!input||typeof input!=='object'||Array.isArray(input))errors.push({path:'$',code:'SOURCE_TYPE',message:'SourceDocument must be an object'});
  else{if(input.schemaVersion!==1)errors.push({path:'schemaVersion',code:'SOURCE_VERSION',message:'SourceDocument schemaVersion must be 1'});if(!SourceTypeSet.has(input.sourceType))errors.push({path:'sourceType',code:'SOURCE_KIND',message:'sourceType must be text, markdown or json'});if(!Array.isArray(input.sections))errors.push({path:'sections',code:'SOURCE_SECTIONS',message:'sections must be an array'});if(typeof input.rawContent!=='string')errors.push({path:'rawContent',code:'SOURCE_RAW',message:'rawContent must be a string'})}
  return {ok:errors.length===0,errors};
}
function invalidSourceType(sourceType){const report={ok:false,errors:[{path:'sourceType',code:'SOURCE_KIND',message:`sourceType must be text, markdown or json; received ${sourceClean(sourceType)||'(empty)'}`} ]};const err=new Error(report.errors[0].message);err.code='SOURCE_DOCUMENT_INVALID';err.report=report;return err}
export function normalizeSourceDocument(input={},options={}){
  let sourceType=options.sourceType||input?.sourceType,raw='',title='',sections=[],metadata={};
  if(typeof input==='string'){sourceType=sourceType||(/(^|\n)#{1,6}\s+/.test(input)?'markdown':'text');raw=input}
  else if(input&&typeof input==='object'&&!Array.isArray(input)){
    sourceType=sourceType||('rawContent' in input||'content' in input?input.sourceType:'json')||'json';title=sourceClean(input.title);metadata=input.metadata&&typeof input.metadata==='object'&&!Array.isArray(input.metadata)?plain(input.metadata):{};
    if(sourceType==='json'){const value=input.content??input.rawContent??input;raw=typeof value==='string'?value:JSON.stringify(value,null,2);sections=Array.isArray(input.sections)?input.sections.map((s,i)=>({title:sourceClean(s?.title)||`Section ${i+1}`,content:sourceClean(s?.content??s?.text??JSON.stringify(s??{}))})):[]}
    else raw=sourceClean(input.rawContent??input.content);
  }else raw=sourceClean(input);
  if(sourceType&&!SourceTypeSet.has(sourceType))throw invalidSourceType(sourceType);
  sourceType=SourceTypeSet.has(sourceType)?sourceType:'text';
  if(!sections.length)sections=sourceType==='markdown'?sectionsFromMarkdown(raw):sourceType==='json'?sectionsFromPlain(raw):sectionsFromPlain(raw);
  sections=sections.map((s,index)=>({id:`section-${index+1}`,title:sourceClean(s.title),content:sourceClean(s.content)})).filter(s=>s.title||s.content);
  if(!title)title=sourceClean(sections.find(s=>s.title)?.title)||sourceClean(raw.split('\n').find(Boolean))||options.title||'Untitled document';
  const result={schemaVersion:1,sourceType,title:sourceClean(title),rawContent:sourceClean(raw),sections,metadata};const check=validateSourceDocument(result);if(!check.ok){const err=new Error(check.errors.map(e=>`${e.path}: ${e.message}`).join('; '));err.code='SOURCE_DOCUMENT_INVALID';err.report=check;throw err}return result;
}
export const SourceDocument=Object.freeze({normalize:normalizeSourceDocument,validate:validateSourceDocument,sourceTypes:SOURCE_TYPES});
