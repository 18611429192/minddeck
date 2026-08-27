import { DECK_THEMES, ComposerThemeMap, composerThemeOf } from './themes.js';
export { DECK_THEMES, ComposerThemeMap, composerThemeOf };

export const PAGE_ROLES=Object.freeze([
  ['cover','封面'],['section','章节'],['statement','观点'],['cards','卡片'],['compare','对比'],['process','流程'],
  ['metrics','指标'],['trend','趋势'],['timeline','时间轴'],['quote','引用'],['image','图文'],['conclusion','结论']
].map(([id,label])=>Object.freeze({id,label})));

export const ComposerRoleSet=new Set(PAGE_ROLES.map(role=>role.id));
export const ComposerDensities=new Set(['compact','standard','rich']);
export function composerClean(value){return String(value??'').replace(/\s+/g,' ').trim()}
export function composerTruncate(value,max=120){const text=composerClean(value);return text.length>max?text.slice(0,Math.max(1,max-1))+'…':text}
export function composerUnique(values){const seen=new Set();return (values||[]).filter(value=>{const key=composerClean(typeof value==='object'?JSON.stringify(value):value);if(!key||seen.has(key))return false;seen.add(key);return true})}
export function composerDensityOf(value){return ComposerDensities.has(value)?value:'standard'}
export function composerRoleOf(value){return ComposerRoleSet.has(value)?value:'statement'}
export function composerRoleLabel(role){return PAGE_ROLES.find(item=>item.id===role)?.label||role}
export function composerNumericPart(value){const match=String(value??'').match(/[-+]?\d+(?:\.\d+)?\s*(?:%|倍|万|亿|k|K|m|M|x|X)?/);return match?.[0]||''}
export function composerWithoutNumericPrefix(value){const number=composerNumericPart(value);return number?composerClean(String(value).replace(number,''))||composerClean(value):composerClean(value)}
export function composerStableStringify(value){
  if(value===null||typeof value!=='object')return JSON.stringify(value);
  if(Array.isArray(value))return '['+value.map(composerStableStringify).join(',')+']';
  return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+composerStableStringify(value[key])).join(',')+'}';
}
export function composerHashString(value){let hash=2166136261;const text=String(value);for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619)}return (hash>>>0).toString(36)}
export function composerUidFactory(seed='slide',prefix='e_'){let index=0;return ()=>prefix+composerHashString(`${seed}:${index++}`).padStart(7,'0').slice(0,10)}
