const slot=(source,index)=>({id:`${source}-${index+1}`,kind:['items','media'].includes(source)?'collection':'text',source,required:source==='title'});
const slots=(...sources)=>sources.map(slot);
const cap=(title=60,summary=160,items=[0,6],numeric=[0,6],media=[0,2],idealItems=null)=>({
  titleChars:{max:title},summaryChars:{max:summary},items:{min:items[0],max:items[1]},numericItems:{min:numeric[0],max:numeric[1]},media:{min:media[0],max:media[1]},
  ...(idealItems===null?{}:{idealItems})
});
const pItemCount=max=>({type:'integer',default:0,min:0,max,readOnly:true,source:'content.items'});
const pColumns=(max=4,def=3)=>({type:'integer',default:def,min:1,max});
const pEmphasis=(def=-1,max=5)=>({type:'integer',default:def,min:-1,max});
const pAlignment=(def='left')=>({type:'enum',default:def,values:['left','center','right']});
const pDirection=(def='horizontal',values=['horizontal','vertical'])=>({type:'enum',default:def,values});
const pDensity=(def='standard')=>({type:'enum',default:def,values:['compact','standard','rich']});
const pMediaRatio=(def=.484375)=>({type:'number',default:def,min:.3,max:.7});
const pTitleMode=(def='standard')=>({type:'enum',default:def,values:['standard','compact','minimal']});
const pVisualWeight=(def=1)=>({type:'number',default:def,min:.8,max:1.2});
const params={
  statement:max=>({itemCount:pItemCount(max),alignment:pAlignment(),titleMode:pTitleMode(),visualWeight:pVisualWeight()}),
  cards:max=>({itemCount:pItemCount(max),columns:pColumns(4,3),emphasisIndex:pEmphasis(-1,max-1),alignment:pAlignment(),density:pDensity(),titleMode:pTitleMode(),visualWeight:pVisualWeight()}),
  compare:max=>({itemCount:pItemCount(max),emphasisIndex:pEmphasis(-1,max-1),alignment:pAlignment(),direction:pDirection(),titleMode:pTitleMode(),visualWeight:pVisualWeight()}),
  process:max=>({itemCount:pItemCount(max),emphasisIndex:pEmphasis(-1,max-1),alignment:pAlignment('center'),direction:pDirection(),titleMode:pTitleMode(),visualWeight:pVisualWeight()}),
  metrics:max=>({itemCount:pItemCount(max),columns:pColumns(4,4),emphasisIndex:pEmphasis(0,max-1),alignment:pAlignment('center'),titleMode:pTitleMode(),visualWeight:pVisualWeight()}),
  timeline:max=>({itemCount:pItemCount(max),alignment:pAlignment('center'),direction:pDirection(),titleMode:pTitleMode(),visualWeight:pVisualWeight()}),
  image:max=>({itemCount:pItemCount(max),alignment:pAlignment(),direction:pDirection('left',['left','right']),mediaRatio:pMediaRatio(),titleMode:pTitleMode(),visualWeight:pVisualWeight()}),
  conclusion:max=>({itemCount:pItemCount(max),emphasisIndex:pEmphasis(0,max-1),alignment:pAlignment('center'),titleMode:pTitleMode(),visualWeight:pVisualWeight()})
};
function manifest({id,label,family,roles,capacity,variant,priority=78,sources=['title','summary','items','media'],parametricFamily=null,paramSchema=null,traits=[]}){
  return Object.freeze({id,label,family,roles:Object.freeze([...roles]),priority,capacity,slots:slots(...sources),layout:{kind:family,variant,canvas:{width:1600,height:900}},traits:Object.freeze([...traits]),...(parametricFamily?{parametricFamily,paramSchema}:{})});
}
function pair({family,roles,entries,capacity,priority=78,sources,primitive,paramMax=6,traits=[]}){
  return entries.map((entry,index)=>manifest({
    id:entry.id,label:entry.label,family,roles,capacity:entry.capacity||capacity,variant:entry.variant,priority:(entry.priority??priority)-index,
    sources:entry.sources||sources,traits:[...traits,...(entry.traits||[])],
    ...(primitive?{parametricFamily:primitive,paramSchema:params[primitive](paramMax)}:{})
  }));
}

export const ProfessionalTemplateManifests=Object.freeze([
  ...pair({family:'cards-agenda-overview',roles:['agenda'],capacity:cap(54,110,[3,6],[0,6],[0,1],4),priority:94,primitive:'cards',paramMax:6,traits:['agenda','overview','balanced'],entries:[
    {id:'agenda-overview-grid',label:'议程总览卡片',variant:'grid'},
    {id:'agenda-overview-list',label:'议程纵向清单',variant:'list'}
  ]}),
  ...pair({family:'section-agenda-chapters',roles:['agenda','section'],capacity:cap(58,130,[2,4],[0,4],[0,1],3),priority:89,traits:['agenda','chapter','sparse'],entries:[
    {id:'agenda-chapters-index',label:'章节议程序号',variant:'index'},
    {id:'agenda-chapters-band',label:'章节议程横幅',variant:'band'}
  ]}),
  ...pair({family:'statement-problem-diagnosis',roles:['problem','statement'],capacity:cap(58,190,[0,3],[0,3],[0,1],1),priority:94,primitive:'statement',paramMax:3,traits:['problem','diagnosis','sparse'],entries:[
    {id:'problem-diagnosis-panel',label:'问题诊断重点',variant:'panel'},
    {id:'problem-diagnosis-split',label:'问题诊断分栏',variant:'split'}
  ]}),
  ...pair({family:'cards-problem-root-cause',roles:['problem','cards'],capacity:cap(54,120,[3,6],[0,6],[0,1],4),priority:91,primitive:'cards',paramMax:6,traits:['problem','root-cause','dense'],entries:[
    {id:'problem-root-cause-grid',label:'根因分析矩阵',variant:'grid'},
    {id:'problem-root-cause-list',label:'根因分析清单',variant:'list'}
  ]}),
  ...pair({family:'process-solution-framework',roles:['solution','process'],capacity:cap(54,120,[3,6],[0,6],[0,1],4),priority:94,primitive:'process',paramMax:6,traits:['solution','sequence','framework'],entries:[
    {id:'solution-framework-line',label:'方案框架路径',variant:'line'},
    {id:'solution-framework-steps',label:'方案框架步骤',variant:'steps'}
  ]}),
  ...pair({family:'compare-solution-options',roles:['solution','compare'],capacity:cap(54,130,[2,6],[0,6],[0,1],4),priority:89,primitive:'compare',paramMax:6,traits:['solution','comparison','decision'],entries:[
    {id:'solution-options-split',label:'方案选项对比',variant:'split'},
    {id:'solution-options-table',label:'方案选项条目',variant:'table'}
  ]}),
  ...pair({family:'image-case-story',roles:['case','image'],capacity:cap(56,170,[0,4],[0,4],[1,2],2),priority:94,primitive:'image',paramMax:4,traits:['case','media','story'],entries:[
    {id:'case-story-visual-left',label:'案例图文左证据',variant:'left'},
    {id:'case-story-visual-right',label:'案例图文右证据',variant:'right'}
  ]}),
  ...pair({family:'metrics-case-proof',roles:['case','metrics'],capacity:cap(52,120,[2,4],[1,4],[0,1],3),priority:90,primitive:'metrics',paramMax:4,traits:['case','numeric','proof'],entries:[
    {id:'case-proof-hero',label:'案例核心成效',variant:'hero'},
    {id:'case-proof-cards',label:'案例成效卡组',variant:'cards'}
  ]}),
  ...pair({family:'timeline-roadmap-horizon',roles:['roadmap','timeline'],capacity:cap(54,120,[3,6],[0,6],[0,1],4),priority:94,primitive:'timeline',paramMax:6,traits:['roadmap','sequence','horizon'],entries:[
    {id:'roadmap-horizon-horizontal',label:'路线图水平阶段',variant:'line'},
    {id:'roadmap-horizon-vertical',label:'路线图垂直阶段',variant:'vertical'}
  ]}),
  ...pair({family:'process-roadmap-milestones',roles:['roadmap','process'],capacity:cap(54,120,[3,6],[0,6],[0,1],4),priority:90,primitive:'process',paramMax:6,traits:['roadmap','milestone','sequence'],entries:[
    {id:'roadmap-milestones-line',label:'里程碑路线',variant:'line'},
    {id:'roadmap-milestones-steps',label:'里程碑阶梯',variant:'steps'}
  ]}),
  ...pair({family:'trend-chart-analysis',roles:['trend','metrics'],capacity:cap(52,100,[3,6],[2,6],[0,1],5),priority:88,traits:['data','numeric','chart'],entries:[
    {id:'chart-analysis-bars',label:'数据分析柱列',variant:'bars'},
    {id:'chart-analysis-steps',label:'数据分析阶梯',variant:'steps'}
  ]}),
  ...pair({family:'metrics-chart-story',roles:['metrics','trend'],capacity:cap(52,110,[2,4],[2,4],[0,1],4),priority:92,primitive:'metrics',paramMax:4,traits:['data','numeric','executive'],entries:[
    {id:'chart-story-dashboard',label:'数据故事仪表盘',variant:'cards'},
    {id:'chart-story-hero',label:'数据故事主指标',variant:'hero'}
  ]}),
  ...pair({family:'cards-table-report',roles:['table','cards'],capacity:cap(58,140,[2,12],[0,12],[0,1],6),priority:94,primitive:'cards',paramMax:12,traits:['table','dense','report'],entries:[
    {id:'table-report-grid',label:'表格报告摘要',variant:'grid'},
    {id:'table-report-list',label:'表格报告清单',variant:'list'}
  ]}),
  ...pair({family:'compare-table-comparison',roles:['table','compare'],capacity:cap(58,140,[2,12],[0,12],[0,1],6),priority:91,primitive:'compare',paramMax:12,traits:['table','comparison','dense'],entries:[
    {id:'table-comparison-rows',label:'表格对照条目',variant:'table'},
    {id:'table-comparison-split',label:'表格对照分栏',variant:'split'}
  ]}),
  ...pair({family:'cards-matrix-2x2',roles:['matrix','cards'],capacity:cap(54,120,[4,6],[0,6],[0,1],4),priority:94,primitive:'cards',paramMax:6,traits:['matrix','strategy','balanced'],entries:[
    {id:'matrix-2x2-grid',label:'二维矩阵卡片',variant:'grid'},
    {id:'matrix-2x2-list',label:'二维矩阵解释',variant:'list'}
  ]}),
  ...pair({family:'compare-matrix-strategy',roles:['matrix','compare'],capacity:cap(54,130,[4,6],[0,6],[0,1],4),priority:91,primitive:'compare',paramMax:6,traits:['matrix','swot','pest','porter'],entries:[
    {id:'matrix-strategy-split',label:'战略矩阵分区',variant:'split'},
    {id:'matrix-strategy-table',label:'战略矩阵条目',variant:'table'}
  ]}),
  ...pair({family:'compare-before-after',roles:['compare'],capacity:cap(52,120,[2,4],[0,4],[0,1],2),priority:94,primitive:'compare',paramMax:4,traits:['comparison','before-after','sparse'],entries:[
    {id:'before-after-split',label:'改造前后对比',variant:'split'},
    {id:'before-after-table',label:'改造前后条目',variant:'table'}
  ]}),
  ...pair({family:'compare-pros-cons',roles:['compare'],capacity:cap(52,130,[2,6],[0,6],[0,1],4),priority:91,primitive:'compare',paramMax:6,traits:['comparison','pros-cons','decision'],entries:[
    {id:'pros-cons-split',label:'优缺点双栏',variant:'split'},
    {id:'pros-cons-table',label:'优缺点清单',variant:'table'}
  ]}),
  ...pair({family:'metrics-kpi-dashboard',roles:['metrics'],capacity:cap(50,100,[3,4],[3,4],[0,1],4),priority:96,primitive:'metrics',paramMax:4,traits:['kpi','numeric','dashboard'],entries:[
    {id:'kpi-dashboard-cards',label:'KPI 仪表卡组',variant:'cards'},
    {id:'kpi-dashboard-hero',label:'KPI 主次指标',variant:'hero'}
  ]}),
  ...pair({family:'metrics-big-number',roles:['metrics','statement'],capacity:cap(48,110,[1,4],[1,4],[0,1],2),priority:93,primitive:'metrics',paramMax:4,traits:['big-number','numeric','executive'],entries:[
    {id:'big-number-hero',label:'大数字主视觉',variant:'hero'},
    {id:'big-number-cards',label:'大数字组合',variant:'cards'}
  ]}),
  ...pair({family:'cards-architecture-system',roles:['architecture','solution','cards'],capacity:cap(56,130,[3,6],[0,6],[0,1],5),priority:95,primitive:'cards',paramMax:6,traits:['architecture','technical','system'],entries:[
    {id:'architecture-system-grid',label:'系统架构分层',variant:'grid'},
    {id:'architecture-system-list',label:'系统架构模块',variant:'list'}
  ]}),
  ...pair({family:'process-architecture-flow',roles:['architecture','solution','process'],capacity:cap(56,130,[3,6],[0,6],[0,1],5),priority:93,primitive:'process',paramMax:6,traits:['architecture','technical','flow'],entries:[
    {id:'architecture-flow-line',label:'技术链路流程',variant:'line'},
    {id:'architecture-flow-steps',label:'技术链路步骤',variant:'steps'}
  ]}),
  ...pair({family:'quote-testimonial-proof',roles:['quote','case'],capacity:cap(50,210,[0,2],[0,2],[0,1],1),priority:90,traits:['testimonial','proof','sparse'],entries:[
    {id:'testimonial-proof-center',label:'客户证言中心',variant:'center',sources:['title','summary','takeaway']},
    {id:'testimonial-proof-side',label:'客户证言侧栏',variant:'side',sources:['title','summary','takeaway']}
  ]}),
  ...pair({family:'conclusion-summary-action',roles:['conclusion','solution'],capacity:cap(54,180,[1,4],[0,4],[0,1],3),priority:95,primitive:'conclusion',paramMax:4,traits:['summary','action','executive'],entries:[
    {id:'summary-action-close',label:'总结行动收束',variant:'actions'},
    {id:'summary-action-keypoint',label:'总结关键结论',variant:'summary'}
  ]})
]);
export const ProfessionalTemplateFamilies=Object.freeze([...new Set(ProfessionalTemplateManifests.map(item=>item.family))]);
export const ProfessionalTemplateStats=Object.freeze({
  templates:ProfessionalTemplateManifests.length,
  families:ProfessionalTemplateFamilies.length,
  parametric:ProfessionalTemplateManifests.filter(item=>item.parametricFamily).length
});
