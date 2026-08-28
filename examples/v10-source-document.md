# V10 SourceDocument Example

## Markdown input

```md
# Product Growth Review

## Background
The market is expanding while acquisition cost rises.

## Metrics
Revenue grew 18%. Active users reached 1,200.

## Problem
Conversion remains below target.

## Plan
First simplify onboarding. Then automate follow-up. Finally review outcomes.
```

## Programmatic pipeline

```js
const source = Core.SourceDocument.normalize(markdown);
const plan = Core.Planner.deterministicPlan(source, { targetSlides: 6 });
const spec = Core.Planner.toDeckSpec(plan, { theme: 'aurora' });
const { project } = Core.Composer.compileDeck(spec);

// Optional AI enhancement replaces only the Planner step:
const result = await Core.AIStoryPlanner.plan(source, { provider, targetSlides: 6 });
const aiSpec = Core.Planner.toDeckSpec(result.plan);
const { project: aiProject } = Core.Composer.compileDeck(aiSpec);

// PPTX always consumes final Project, including manual Editor changes:
const pptx = await Core.PptxExporter.exportProject(aiProject);
```
