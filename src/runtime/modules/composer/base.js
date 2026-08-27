function freezeTheme(theme){
  Object.freeze(theme.colors);Object.freeze(theme.typography);Object.values(theme.typography).forEach(Object.freeze);Object.freeze(theme.shape);Object.freeze(theme.spacing);return Object.freeze(theme);
}
function makeTheme(id,label,palette,visual={}){
  const typography=visual.typography||{
    display:{fontSize:84,fontWeight:880},title:{fontSize:58,fontWeight:840},heading:{fontSize:38,fontWeight:760},
    body:{fontSize:25,fontWeight:600},caption:{fontSize:19,fontWeight:700},metric:{fontSize:64,fontWeight:900}
  };
  const shape=visual.shape||{radiusSm:12,radiusMd:22,radiusLg:34,borderWidth:1};
  const spacing=visual.spacing||{xs:8,sm:14,md:24,lg:34,xl:48};
  const colors={
    background:palette.bg,surface:palette.surface,surface2:palette.surface2,primary:palette.accent,secondary:palette.accent2,
    text:palette.text,muted:palette.muted,border:palette.line,positive:palette.success,negative:palette.danger
  };
  return freezeTheme({id,label,colors,typography,shape,spacing,
    bg:colors.background,surface:colors.surface,surface2:colors.surface2,text:colors.text,muted:colors.muted,
    accent:colors.primary,accent2:colors.secondary,line:colors.border,danger:colors.negative,success:colors.positive
  });
}
const palettes=[
 ['aurora','晨光',{bg:'#F7F8FC',surface:'#FFFFFF',surface2:'#EEF2FF',text:'#172033',muted:'#667085',accent:'#5B6CFF',accent2:'#00A8A8',line:'#D9DEEA',danger:'#D1495B',success:'#0E9F6E'}],
 ['cobalt','深海蓝',{bg:'#081426',surface:'#10233E',surface2:'#153052',text:'#F3F7FF',muted:'#A9B7CC',accent:'#4DA3FF',accent2:'#5DE0E6',line:'#29486D',danger:'#FF7B88',success:'#4ED7A8'}],
 ['forest','森林',{bg:'#F5F8F4',surface:'#FFFFFF',surface2:'#E7F0E8',text:'#183126',muted:'#687A70',accent:'#2F7D4A',accent2:'#7E9F35',line:'#D4E0D7',danger:'#B65050',success:'#2F7D4A'}],
 ['ember','暖焰',{bg:'#FFF8F1',surface:'#FFFFFF',surface2:'#FFF0E2',text:'#39251B',muted:'#7D6A60',accent:'#E66A35',accent2:'#D9A441',line:'#EAD8CA',danger:'#C94B4B',success:'#3C8C63'}],
 ['plum','紫曜',{bg:'#F8F5FB',surface:'#FFFFFF',surface2:'#F0E7F7',text:'#2E2037',muted:'#796C81',accent:'#8A4FFF',accent2:'#D65DB1',line:'#E3D7EA',danger:'#C84F69',success:'#4A9A78'}],
 ['slate','岩灰',{bg:'#F4F5F7',surface:'#FFFFFF',surface2:'#E9EBEF',text:'#20242B',muted:'#6B7280',accent:'#3C4657',accent2:'#7A8699',line:'#D7DAE0',danger:'#B84A55',success:'#34805A'}],
 ['sand','沙金',{bg:'#FBF7EF',surface:'#FFFDF8',surface2:'#F4EAD7',text:'#352D22',muted:'#756B5D',accent:'#A8782A',accent2:'#D5A84D',line:'#E5D9C3',danger:'#B35245',success:'#4F8060'}],
 ['ink','墨黑',{bg:'#0B0D10',surface:'#171A1F',surface2:'#22262D',text:'#F7F7F5',muted:'#A3A8B2',accent:'#F2C94C',accent2:'#7AD7F0',line:'#343A44',danger:'#FF7575',success:'#54D6A0'}],
 ['ocean','海盐',{bg:'#F3FAFC',surface:'#FFFFFF',surface2:'#E2F3F7',text:'#153039',muted:'#64808A',accent:'#157C8C',accent2:'#3AAED8',line:'#CCE4E9',danger:'#C24F63',success:'#2B8D71'}],
 ['mint','薄荷',{bg:'#F4FBF8',surface:'#FFFFFF',surface2:'#E1F5ED',text:'#17352A',muted:'#678176',accent:'#19A974',accent2:'#75C9A9',line:'#CCE8DC',danger:'#C64D5F',success:'#178F65'}],
 ['rose','玫瑰',{bg:'#FFF6F7',surface:'#FFFFFF',surface2:'#FCE7EA',text:'#3B252B',muted:'#826C72',accent:'#D65C7A',accent2:'#EE9B9B',line:'#EFD7DD',danger:'#B8455D',success:'#4B8A70'}],
 ['mono','黑白',{bg:'#FFFFFF',surface:'#FFFFFF',surface2:'#F3F3F3',text:'#111111',muted:'#686868',accent:'#111111',accent2:'#858585',line:'#D9D9D9',danger:'#8F2E2E',success:'#336B4A'}]
];
export const DECK_THEMES=Object.freeze(palettes.map(([id,label,palette])=>makeTheme(id,label,palette)));

export const PAGE_ROLES=Object.freeze([
  ['cover','封面'],['section','章节'],['statement','观点'],['cards','卡片'],['compare','对比'],['process','流程'],
  ['metrics','指标'],['trend','趋势'],['timeline','时间轴'],['quote','引用'],['image','图文'],['conclusion','结论']
].map(([id,label])=>Object.freeze({id,label})));

export const ComposerThemeMap=Object.freeze(Object.fromEntries(DECK_THEMES.map(theme=>[theme.id,theme])));
export const ComposerRoleSet=new Set(PAGE_ROLES.map(role=>role.id));
export const ComposerDensities=new Set(['compact','standard','rich']);
export function composerClean(value){return String(value??'').replace(/\s+/g,' ').trim()}
export function composerTruncate(value,max=120){const text=composerClean(value);return text.length>max?text.slice(0,Math.max(1,max-1))+'…':text}
export function composerUnique(values){const seen=new Set();return (values||[]).filter(value=>{const key=composerClean(typeof value==='object'?JSON.stringify(value):value);if(!key||seen.has(key))return false;seen.add(key);return true})}
export function composerThemeOf(value){return ComposerThemeMap[value]||ComposerThemeMap.aurora}
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
