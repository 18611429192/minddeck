function clamp01(value){return Math.max(0,Math.min(1,Number(value)||0))}
function headroom(value,max){if(max===undefined||max===null||Number(max)<=0)return 1;const ratio=Math.max(0,Number(value)||0)/Number(max);return clamp01(1-Math.max(0,ratio-.45)/.55)}
function itemFit(count,rule={},ideal=null){
  const min=Number.isFinite(Number(rule.min))?Number(rule.min):0,max=Number.isFinite(Number(rule.max))?Number(rule.max):Math.max(1,count);
  const target=Number.isFinite(Number(ideal))?Number(ideal):(min+max)/2,span=Math.max(1,max-min);
  return clamp01(1-Math.abs(Number(count)||0-target)/span);
}
export function capacityFitness(facts={},capacity={}){
  const itemScore=itemFit(facts.itemCount,capacity.items,capacity.idealItems);
  const titleScore=headroom(facts.titleChars,capacity.titleChars?.max);
  const summaryScore=headroom(facts.summaryChars,capacity.summaryChars?.max);
  const mediaRule=capacity.media||{},mediaMax=Number(mediaRule.max??Math.max(1,facts.mediaCount||0)),mediaScore=facts.mediaCount?clamp01(1-Math.max(0,facts.mediaCount-mediaMax)/Math.max(1,mediaMax)):1;
  const score=clamp01(itemScore*.52+titleScore*.20+summaryScore*.18+mediaScore*.10);
  return Object.freeze({score,itemScore,titleScore,summaryScore,mediaScore,idealItems:capacity.idealItems??null});
}
export const CapacityTuning=Object.freeze({fitness:capacityFitness});
