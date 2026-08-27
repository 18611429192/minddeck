import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Core} from '../src/core/runtime.js';

const C=Core.Composer;
const fixture=JSON.parse(readFileSync(new URL('../examples/v10-professional-golden/professional-20-page.deck.json',import.meta.url),'utf8'));
const expandedRoles=['agenda','problem','solution','table','matrix','case','roadmap','architecture'];
const legacyTemplateIds=[
  'cover-focus-01','cover-grid-01','section-index-01','section-band-01','statement-panel-01','statement-split-01','cards-grid-01','cards-list-01',
  'compare-split-01','compare-table-01','process-line-01','process-steps-01','metrics-cards-01','metrics-hero-01','trend-bars-01','trend-steps-01',
  'timeline-line-01','timeline-vertical-01','quote-center-01','quote-side-01','image-left-01','image-right-01','conclusion-actions-01','conclusion-summary-01'
];

assert.equal(C.roles.length,20);
assert.equal(C.templates.length,72);
assert.equal(C.Library.professionalTemplates,48);
assert.equal(C.Library.professionalFamilies,24);
assert.equal(C.Library.professionalParametricTemplates,42);
assert.equal(C.Library.parametricTemplates,58);
assert.ok(Math.abs(C.Library.parametricRatio-58/72)<1e-12);
assert.equal(new Set(C.templates.map(item=>item.id)).size,72);
for(const id of legacyTemplateIds)assert.ok(C.TemplateRegistry.has(id),`legacy template missing: ${id}`);

const professional=C.templates.filter(template=>Array.isArray(template.traits)&&template.traits.length);
assert.equal(professional.length,48);
assert.equal(new Set(professional.map(template=>template.family)).size,24);
assert.ok(professional.every(template=>!/^template-\d+$/i.test(template.id)),'professional templates must use semantic IDs');
assert.ok(professional.every(template=>JSON.parse(JSON.stringify(template))),'Template Manifest must stay serializable pure data');

const catalog=C.Diversity.libraryCoverage(C.TemplateRegistry);
assert.equal(catalog.total,20);
assert.equal(catalog.covered,20);
assert.equal(catalog.coverage,1);
for(const role of C.roles)assert.ok(catalog.byRole[role.id]>=(role.id==='cover'?2:3),`${role.id} should have enough compatible templates`);
for(const role of expandedRoles){
  const candidates=C.recommendTemplates({role,content:fixture.slides.find(slide=>slide.role===role)?.content,limit:6});
  assert.ok(candidates.length>=4,`${role} professional role should have >=4 candidates`);
  assert.ok(candidates[0].traits.includes(role),`${role} top candidate should carry semantic role trait`);
}

const first=C.compileDeck(fixture,{mapLayout:'balanced',rootId:'v10-step5-root'}),second=C.compileDeck(fixture,{mapLayout:'balanced',rootId:'v10-step5-root'});
assert.equal(first.project.children.length,19);
assert.equal(first.assignments.length,20,'root cover + 19 explicit slides must form a 20-page deck');
assert.deepEqual(second.assignments,first.assignments,'professional allocation must be deterministic');
assert.equal(first.quality.ok,true,first.quality.errors?.map(item=>item.message).join('; '));

const d=first.diversity;
assert.equal(d.pages,20);
assert.equal(d.unsuitableAssignment,0);
assert.equal(d.capacityViolation,0);
assert.equal(d.roleCoverage,1);
assert.equal(d.catalogRoleCoverage,1);
assert.ok(d.uniqueTemplates>=18,`expected >=18 unique templates, got ${d.uniqueTemplates}`);
assert.ok(d.uniqueFamilies>=16,`expected >=16 unique families, got ${d.uniqueFamilies}`);
assert.ok(d.repeatedTemplateRate<=.10,`template repeat rate too high: ${d.repeatedTemplateRate}`);
assert.ok(d.repeatedFamilyRate<=.20,`family repeat rate too high: ${d.repeatedFamilyRate}`);
assert.ok(d.adjacentFamilyReuse<=1,`adjacent family reuse too high: ${d.adjacentFamilyReuse}`);
assert.ok(d.maxFamilyShare<=.15,`max family share too high: ${d.maxFamilyShare}`);

console.log('MindDeck V10 Step 5 professional template library: OK',JSON.stringify({
  roles:C.roles.length,templates:C.templates.length,professionalFamilies:C.Library.professionalFamilies,parametricRatio:Number(C.Library.parametricRatio.toFixed(4)),
  pages:d.pages,uniqueTemplates:d.uniqueTemplates,uniqueFamilies:d.uniqueFamilies,repeatedFamilyRate:Number(d.repeatedFamilyRate.toFixed(4)),
  adjacentFamilyReuse:d.adjacentFamilyReuse,unsuitableAssignment:d.unsuitableAssignment,capacityViolation:d.capacityViolation,roleCoverage:d.roleCoverage
}));
