import { composerHashString } from './base.js';
export function createAllocationState(){return {templateUsage:new Map(),familyUsage:new Map(),parametricUsage:new Map(),roleFamilyUsage:new Map(),recentFamilies:[],previousFamily:null,previousTemplate:null}}
function composerTie(seed,slideId,templateId){return parseInt(composerHashString(`${seed}:${slideId}:${templateId}`),36)%1000/100000}
function roleFamilyKey(role,family){return `${role||'statement'}:${family||''}`}
export function allocateTemplates(slides,candidateMatrix,options={}){
  const state=createAllocationState(),seed=options.seed||'minddeck',maxReuse=options.maxTemplateReuse??2,
    adjacentFamilyPenalty=options.adjacentFamilyPenalty??40,recentFamilyPenalty=options.recentFamilyPenalty??22,recentWindow=Math.max(1,options.recentWindow??3),
    templateReusePenalty=options.templateReusePenalty??30,familyReusePenalty=options.familyReusePenalty??12,parametricReusePenalty=options.parametricReusePenalty??5,
    roleFamilyReusePenalty=options.roleFamilyReusePenalty??14,assignments=[];
  for(let index=0;index<(slides||[]).length;index++){
    const slide=slides[index]||{},candidates=(candidateMatrix?.[index]||[]).map(candidate=>({...candidate}));
    if(!candidates.length){assignments.push({slideId:slide.id,templateId:null,family:null,parametricFamily:null,params:{},score:-Infinity,alternatives:[],alternativeCandidates:[],reason:'NO_TEMPLATE_CANDIDATE'});continue}
    const scored=candidates.map(candidate=>{
      const templateUses=state.templateUsage.get(candidate.templateId)||0,familyUses=state.familyUsage.get(candidate.family)||0,
        parametricUses=candidate.parametricFamily?(state.parametricUsage.get(candidate.parametricFamily)||0):0,
        roleFamilyUses=state.roleFamilyUsage.get(roleFamilyKey(slide.role,candidate.family))||0,professional=Array.isArray(candidate.traits)&&candidate.traits.length>0;
      let score=Number(candidate.score)||0;
      if(candidate.templateId===state.previousTemplate)score-=templateReusePenalty+20;
      if(candidate.family===state.previousFamily)score-=adjacentFamilyPenalty;
      score-=templateUses*templateReusePenalty+familyUses*familyReusePenalty;
      if(professional){
        const recentDistance=state.recentFamilies.lastIndexOf(candidate.family);
        if(recentDistance>=0)score-=recentFamilyPenalty*(recentDistance===state.recentFamilies.length-1?1.5:1);
        score-=parametricUses*parametricReusePenalty+roleFamilyUses*roleFamilyReusePenalty;
      }
      if(templateUses>=maxReuse)score-=120*(templateUses-maxReuse+1);
      score+=composerTie(seed,slide.id||index,candidate.templateId);
      return {...candidate,allocationScore:score}
    }).sort((a,b)=>b.allocationScore-a.allocationScore||a.templateId.localeCompare(b.templateId)),picked=scored[0];
    state.templateUsage.set(picked.templateId,(state.templateUsage.get(picked.templateId)||0)+1);
    state.familyUsage.set(picked.family,(state.familyUsage.get(picked.family)||0)+1);
    if(picked.parametricFamily)state.parametricUsage.set(picked.parametricFamily,(state.parametricUsage.get(picked.parametricFamily)||0)+1);
    const rf=roleFamilyKey(slide.role,picked.family);state.roleFamilyUsage.set(rf,(state.roleFamilyUsage.get(rf)||0)+1);
    state.previousTemplate=picked.templateId;state.previousFamily=picked.family;
    state.recentFamilies.push(picked.family);if(state.recentFamilies.length>recentWindow)state.recentFamilies.shift();
    assignments.push({slideId:slide.id,templateId:picked.templateId,family:picked.family,parametricFamily:picked.parametricFamily||null,params:{...(picked.params||{})},score:picked.allocationScore,alternatives:scored.slice(1,4).map(item=>item.templateId),alternativeCandidates:scored.slice(1,4).map(item=>({templateId:item.templateId,params:{...(item.params||{})}})),reason:'ALLOCATED'})
  }
  return assignments
}
