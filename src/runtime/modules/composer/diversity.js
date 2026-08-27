import { PAGE_ROLES } from './base.js';
import { TemplateRegistry, capacityFits } from './templates.js';

function counts(values){const out={};for(const value of values)if(value)out[value]=(out[value]||0)+1;return out}
function repeatRate(values){if(!values.length)return 0;return Math.max(0,values.length-new Set(values).size)/values.length}
export function analyzeTemplateDiversity(spec={},assignments=[],registry=TemplateRegistry){
  const used=(assignments||[]).filter(item=>item?.templateId),templates=used.map(item=>item.templateId),families=used.map(item=>item.family).filter(Boolean),
    parametricFamilies=used.map(item=>item.parametricFamily).filter(Boolean),slideMap=new Map((spec?.slides||[]).map(slide=>[slide.id,slide]));
  let unsuitableAssignment=0,capacityViolation=0,validRoleAssignments=0;
  const expectedRoles=new Set((spec?.slides||[]).map(slide=>slide.role).filter(Boolean)),validRoles=new Set();
  for(const assignment of used){
    const slide=slideMap.get(assignment.slideId);if(!slide)continue;
    const template=registry.get(assignment.templateId);
    if(!template||!template.roles.includes(slide.role)){unsuitableAssignment++;continue}
    validRoleAssignments++;validRoles.add(slide.role);
    if(!capacityFits(slide.content,template.capacity).ok)capacityViolation++;
  }
  let adjacentFamilyReuse=0;for(let i=1;i<families.length;i++)if(families[i]===families[i-1])adjacentFamilyReuse++;
  const familyCounts=counts(families),templateCounts=counts(templates),maxFamily=Math.max(0,...Object.values(familyCounts));
  const catalog=libraryRoleCoverage(registry);
  return Object.freeze({
    pages:used.length,uniqueTemplates:new Set(templates).size,uniqueFamilies:new Set(families).size,uniqueParametricFamilies:new Set(parametricFamilies).size,
    repeatedTemplateRate:repeatRate(templates),repeatedFamilyRate:repeatRate(families),adjacentFamilyReuse,maxFamilyShare:families.length?maxFamily/families.length:0,
    unsuitableAssignment,capacityViolation,roleCoverage:expectedRoles.size?validRoles.size/expectedRoles.size:1,validRoleAssignments,
    catalogRoleCoverage:catalog.coverage,coveredRoles:catalog.covered,totalRoles:catalog.total,familyCounts,templateCounts
  });
}
export function libraryRoleCoverage(registry=TemplateRegistry){
  const byRole={};let covered=0;
  for(const role of PAGE_ROLES){const count=registry.list({role:role.id}).length;byRole[role.id]=count;if(count>0)covered++}
  return Object.freeze({covered,total:PAGE_ROLES.length,coverage:PAGE_ROLES.length?covered/PAGE_ROLES.length:1,byRole:Object.freeze(byRole)});
}
export const Diversity=Object.freeze({analyze:analyzeTemplateDiversity,libraryCoverage:libraryRoleCoverage});
