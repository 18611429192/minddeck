import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Core} from '../src/core/runtime.js';

const C=Core.Composer;
const fixture=JSON.parse(readFileSync(new URL('../examples/v10-design-intent/design-intent.deck.json',import.meta.url),'utf8'));
const inspectorSource=readFileSync(new URL('../src/app/modules/27-slide-inspector.js',import.meta.url),'utf8');
const appManifest=JSON.parse(readFileSync(new URL('../src/app/app.manifest.json',import.meta.url),'utf8'));
assert.ok(appManifest.scripts.includes('modules/27-slide-inspector.js'));
assert.ok(inspectorSource.includes('ComposerV10Inspector.applyDesignIntent('));
assert.ok(inspectorSource.includes('ComposerV10Inspector.resolveDesignIntent('));
assert.ok(inspectorSource.includes('ComposerV10Inspector.designIntentCapabilities('));
assert.ok(inspectorSource.includes('checkpoint();'),'Inspector must use existing application history');
assert.ok(!inspectorSource.includes('TemplateRegistry'),'Inspector must not select templates directly');
assert.ok(!/\bmatchTemplates\s*\(/.test(inspectorSource),'Inspector must not implement matcher');
assert.ok(!/\bcompileSlide\s*\(/.test(inspectorSource),'Inspector must not compile layouts directly');
const expectedFields=['columns','emphasisIndex','density','mediaRatio','alignment','direction','titleWeight','visualWeight','contentBalance','imageFocus'];
assert.deepEqual(C.DesignIntent.fields,expectedFields);
assert.equal(C.DesignIntent.version,1);

const normalized=C.normalizeDesignIntent({columns:'2',emphasisIndex:'1',density:'compact',mediaRatio:'0.62',visualWeight:'1.1',direction:'LEFT'});
assert.deepEqual(normalized,{columns:2,emphasisIndex:1,density:'compact',mediaRatio:.62,direction:'left',visualWeight:1.1});
assert.equal(C.validateDesignIntent({columns:0}).ok,false);
assert.equal(C.validateDesignIntent({direction:'diagonal'}).ok,false);
assert.equal(C.validateDesignIntent({invented:true}).errors[0].code,'UNSUPPORTED_DESIGN_INTENT');
assert.equal(C.validateDesignIntent({emphasisIndex:3},{content:{items:[{label:'A'},{label:'B'}]}}).ok,false);
const serialized=C.serializeDesignIntent({visualWeight:1.1,columns:2,density:'rich'});
assert.equal(serialized,'{"columns":2,"density":"rich","visualWeight":1.1}');
assert.deepEqual(JSON.parse(serialized),{columns:2,density:'rich',visualWeight:1.1});

const compiled=C.compileDeck(fixture,{rootId:'v10-step6-root',mapLayout:'balanced'}),project=compiled.project;
assert.equal(compiled.quality.ok,true,compiled.quality.errors?.map(item=>item.message).join('; '));
const cards=project.children.find(node=>node.id==='intent-cards'),compare=project.children.find(node=>node.id==='intent-compare'),image=project.children.find(node=>node.id==='intent-image');
assert.ok(cards&&compare&&image);

const cardsCapabilities=C.designIntentCapabilities(cards).map(item=>item.field);
assert.ok(cardsCapabilities.includes('columns'));
assert.ok(cardsCapabilities.includes('emphasisIndex'));
assert.ok(cardsCapabilities.includes('density'));
assert.ok(!cardsCapabilities.includes('mediaRatio'));
const imageCapabilities=C.designIntentCapabilities(image).map(item=>item.field);
assert.ok(imageCapabilities.includes('mediaRatio'));
assert.ok(imageCapabilities.includes('direction'));
assert.ok(imageCapabilities.includes('imageFocus'));

const beforeCardsHash=cards.composer.generatedHash,beforeCardsTemplate=cards.composer.selectedTemplateId;
const columnsResult=C.applyDesignIntent({node:cards,intent:{columns:2}});
assert.equal(columnsResult.resolution.matcher,'Core.Composer.matchTemplates');
assert.equal(cards.composer.intentResolution.matcher,'Core.Composer.matchTemplates');
assert.equal(cards.composer.designIntent.columns,2);
assert.equal(cards.composer.selectedTemplateParams.columns,2);
assert.equal(C.Provenance.isDirty(cards),false);
assert.notEqual(cards.composer.generatedHash,beforeCardsHash,'columns change must recompile the slide');
assert.ok(cards.composer.selectedTemplateId,'Matcher must select a template');
assert.ok(columnsResult.resolution.candidates.length>0);
assert.equal(columnsResult.resolution.templateId,cards.composer.selectedTemplateId);
assert.ok(beforeCardsTemplate||cards.composer.selectedTemplateId);

C.applyDesignIntent({node:cards,intent:{columns:2,emphasisIndex:1}});
assert.equal(cards.composer.designIntent.emphasisIndex,1);
assert.equal(cards.composer.selectedTemplateParams.emphasisIndex,1);
assert.equal(C.Provenance.isDirty(cards),false);

C.applyDesignIntent({node:cards,intent:{columns:2,emphasisIndex:1,density:'compact'}});
assert.equal(cards.deckDensity,'compact');
assert.equal(cards.composer.designIntent.density,'compact');
if(Object.prototype.hasOwnProperty.call(cards.composer.selectedTemplateParams,'density'))assert.equal(cards.composer.selectedTemplateParams.density,'compact');

const beforeImageHash=image.composer.generatedHash;
C.applyDesignIntent({node:image,intent:{mediaRatio:.62,direction:'right',contentBalance:'visual',imageFocus:'hero'}});
assert.equal(image.composer.designIntent.mediaRatio,.62);
assert.equal(image.composer.designIntent.direction,'right');
assert.equal(image.composer.selectedTemplateParams.mediaRatio,.62);
assert.equal(image.composer.selectedTemplateParams.direction,'right');
assert.notEqual(image.composer.generatedHash,beforeImageHash,'media ratio change must recompile image geometry');
assert.equal(C.Provenance.isDirty(image),false);

const compareBefore=JSON.stringify(compare.slideElements);compare.slideElements[0].x=(Number(compare.slideElements[0].x)||0)+13;const dirtyBefore=JSON.stringify(compare.slideElements);
assert.equal(C.Provenance.isDirty(compare),true);
assert.throws(()=>C.applyDesignIntent({node:compare,intent:{direction:'vertical'}}),err=>err.code==='COMPOSER_DIRTY');
assert.equal(JSON.stringify(compare.slideElements),dirtyBefore,'dirty protection must leave manual elements untouched');
assert.notEqual(dirtyBefore,compareBefore);

const reloaded=JSON.parse(JSON.stringify(project)),reloadedImage=reloaded.children.find(node=>node.id==='intent-image');
assert.deepEqual(reloadedImage.composer.designIntent,{mediaRatio:.62,direction:'right',contentBalance:'visual',imageFocus:'hero'});
assert.equal(reloadedImage.composer.intentResolution.matcher,'Core.Composer.matchTemplates');
assert.equal(C.Provenance.isDirty(reloadedImage),false,'serialized clean slide must remain provenance-clean after reload');
assert.equal(typeof C.applyTemplate,'function','legacy Template Picker API must remain available');

console.log('MindDeck V10 Step 6 DesignIntent: OK',JSON.stringify({fields:C.DesignIntent.fields.length,cardsTemplate:cards.composer.selectedTemplateId,imageTemplate:image.composer.selectedTemplateId,matcher:cards.composer.intentResolution.matcher,dirtyProtected:true,saveReload:true}));
