const clean=value=>String(value??'').replace(/\r\n?/g,'\n').trim();
const plain=value=>JSON.parse(JSON.stringify(value));
function sectionsFromMarkdown(raw){
  const lines=clean(raw).split('\n'),sections=[];let current={title:'',content:[]};
  const flush=()=>{const content=clean(current.content.join('\n'));if(current.title||content)sections.push({title:clean(current.title),content});current={title:'',content:[]}};
  for(const line of lines){const m=line.match(/^#{1,6}\s+(.+)$/);if(m){flush();current.title=clean(m[1])}else current.content.push(line)}flush();return sections;
}
function sectionsFromPlain(raw){
  const blocks=clean(raw).split(/\n\s*\n+/).map(clean).filter(Boolean);return blocks.map((content,index)=>({title:index===0?'':content.split('\n')[0].length<=72?content.split('\n')[0]:'',content}));
}
export function validateSourceDocument(input){
  const errors=[];if(!input||typeof input!=='object'||Array.isArray(input))errors.push({path:'$',code:'SOURCE_TYPE',message:'SourceDocument must be an object'});
  else{if(input.schemaVersion!==1)errors.push({path:'schemaVersion',code:'SOURCE_VERSION',message:'SourceDocument schemaVersion must be 1'});if(!['text','markdown','json'].includes(input.sourceType))errors.push({path:'sourceType',code:'SOURCE_KIND',message:'sourceType must be text, markdown or json'});if(!Array.isArray(input.sections))errors.push({path:'sections',code:'SOURCE_SECTIONS',message:'sections must be an array'});if(typeof input.rawContent!=='string')errors.push({path:'rawContent',code:'SOURCE_RAW',message:'rawContent must be a string'})}
  return {ok:errors.length===0,errors};
}
export function normalizeSourceDocument(input={},options={}){
  let sourceType=options.sourceType||input?.sourceType,raw='',title='',sections=[],metadata={};
  if(typeof input==='string'){sourceType=sourceType||(/(^|\n)#{1,6}\s+/.test(input)?'markdown':'text');raw=input}
  else if(input&&typeof input==='object'&&!Array.isArray(input)){
    sourceType=sourceType||('rawContent' in input||'content' in input?input.sourceType:'json')||'json';title=clean(input.title);metadata=input.metadata&&typeof input.metadata==='object'&&!Array.isArray(input.metadata)?plain(input.metadata):{};
    if(sourceType==='json'){const value=input.content??input.rawContent??input;raw=typeof value==='string'?value:JSON.stringify(value,null,2);sections=Array.isArray(input.sections)?input.sections.map((s,i)=>({title:clean(s?.title)||`Section ${i+1}`,content:clean(s?.content??s?.text??JSON.stringify(s??{}))})):[]}
    else raw=clean(input.rawContent??input.content);
  }else raw=clean(input);
  sourceType=['text','markdown','json'].includes(sourceType)?sourceType:'text';
  if(!sections.length)sections=sourceType==='markdown'?sectionsFromMarkdown(raw):sourceType==='json'?sectionsFromPlain(raw):sectionsFromPlain(raw);
  sections=sections.map((s,index)=>({id:`section-${index+1}`,title:clean(s.title),content:clean(s.content)})).filter(s=>s.title||s.content);
  if(!title)title=clean(sections.find(s=>s.title)?.title)||clean(raw.split('\n').find(Boolean))||options.title||'Untitled document';
  const result={schemaVersion:1,sourceType,title:clean(title),rawContent:clean(raw),sections,metadata};const check=validateSourceDocument(result);if(!check.ok){const err=new Error(check.errors.map(e=>`${e.path}: ${e.message}`).join('; '));err.code='SOURCE_DOCUMENT_INVALID';err.report=check;throw err}return result;
}
export const SourceDocument=Object.freeze({normalize:normalizeSourceDocument,validate:validateSourceDocument});
