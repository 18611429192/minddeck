import { composerClean } from './base.js';
import { normalizeSlideContent, inferSlideRole } from './schema.js';

function markdownInline(value){
  return composerClean(String(value??'')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g,'$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g,'$1')
    .replace(/(?:\*\*|__|~~|`)(.*?)(?:\*\*|__|~~|`)/g,'$1')
    .replace(/(^|\s)[*_]([^*_]+)[*_](?=\s|$)/g,'$1$2'));
}
function markdownTableCells(line){
  const text=String(line??'').trim();
  if(!/^\|.*\|$/.test(text))return null;
  return text.slice(1,-1).split('|').map(markdownInline);
}
function markdownTableSeparator(cells){return Array.isArray(cells)&&cells.length>0&&cells.every(cell=>/^:?-{3,}:?$/.test(String(cell).replace(/\s+/g,'')))}
function markdownTablePoint(cells){const [label,...rest]=cells||[];return composerClean([label,rest.filter(Boolean).join(' · ')].filter(Boolean).join('：'))}

export function parseComposerMarkdown(source){
  const lines=String(source??'').replace(/\r/g,'').split('\n');
  let title='',subtitle='',inFence=false;const fenceLines=[],specs=[],stack=[];let current=null,headingSeen=false;
  const pushNode=(level,value)=>{const item={title:markdownInline(value),text:'',points:[],children:[],level:Math.max(1,level)};while(stack.length&&stack.at(-1).level>=item.level)stack.pop();if(stack.length)stack.at(-1).children.push(item);else specs.push(item);stack.push(item);current=item;return item};
  const appendText=value=>{const text=markdownInline(value);if(!text)return;if(current)current.text=composerClean([current.text,text].filter(Boolean).join(' '));else subtitle=composerClean([subtitle,text].filter(Boolean).join(' '))};
  const flushFence=()=>{if(!fenceLines.length)return;appendText(fenceLines.join(' '));fenceLines.length=0};
  for(let index=0;index<lines.length;index++){
    const raw=lines[index],line=raw.trimEnd();
    const fence=line.match(/^\s*```/);
    if(fence){if(inFence){flushFence();inFence=false}else{inFence=true;fenceLines.length=0}continue}
    if(inFence){fenceLines.push(line.trim());continue}
    if(!line.trim())continue;
    const heading=line.match(/^\s*(#{1,6})\s+(.+)$/);
    if(heading){headingSeen=true;const level=heading[1].length,value=heading[2];if(level===1&&!title){title=markdownInline(value);current=null;stack.length=0}else pushNode(Math.max(1,level-1),value);continue}
    const tableCells=markdownTableCells(line);
    if(tableCells){
      const nextCells=markdownTableCells(lines[index+1]);
      if(nextCells&&markdownTableSeparator(nextCells)){index++;continue}
      if(markdownTableSeparator(tableCells))continue;
      if(!current)current=pushNode(1,'核心内容');
      const point=markdownTablePoint(tableCells);if(point)current.points.push(point);continue;
    }
    const quote=line.match(/^\s*>\s*(.+)$/);
    if(quote){appendText(quote[1]);continue}
    const bullet=line.match(/^\s*(?:[-*+•]|\d+[.)])\s+(.+)$/);
    if(bullet){if(!current)current=pushNode(1,'核心内容');current.points.push(markdownInline(bullet[1]));continue}
    if(!title&&!headingSeen){title=markdownInline(line);continue}
    appendText(line.trim());
  }
  if(inFence)flushFence();
  return {title:title||'未命名演示',subtitle,specs,headingSeen};
}
export function parseComposerIndented(source){const lines=String(source??'').replace(/\r/g,'').split('\n').filter(line=>line.trim());if(!lines.length)return {title:'未命名演示',subtitle:'',specs:[]};const first=markdownInline(lines.shift().replace(/^\s*(?:[-*+•]|\d+[.)])\s+/,'')),specs=[],stack=[];for(const raw of lines){const indent=(raw.match(/^\s*/)?.[0]||'').replace(/\t/g,'  ').length,level=Math.max(1,Math.floor(indent/2)+1),value=markdownInline(raw.replace(/^\s*(?:[-*+•]|\d+[.)])\s+/,''));if(!value)continue;const item={title:value,text:'',points:[],children:[],level};while(stack.length&&stack.at(-1).level>=level)stack.pop();if(stack.length)stack.at(-1).children.push(item);else specs.push(item);stack.push(item)}return {title:first||'未命名演示',subtitle:'',specs}}
export function parseComposerOutline(source){const markdown=parseComposerMarkdown(source);if(markdown.headingSeen||markdown.specs.length)return markdown;return parseComposerIndented(source)}
export function composerSpecContent(spec={}){return normalizeSlideContent({title:spec.title,summary:spec.text,items:(spec.points||[]).map(label=>({label}))})}
export function composerSpecRole(spec={},context={}){return inferSlideRole(composerSpecContent(spec),null,context)}
