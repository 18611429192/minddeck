# V10 Step 2 — Parametric SlideTemplate

MindDeck Step 2 adds **Template Family + Parameters** to the existing `Core.Composer` pipeline. It does not add a renderer, runtime, project model, or UI layout engine.

The compile path remains:

`SlideContent + Template Manifest + Params + Theme → Core.Composer.compileSlide() → native slideElements`

## Compatibility

All 24 V9.9 template IDs remain registered and keep their existing `family`, roles, capacity, variant, priority, and slots. Calling `compileSlide({ template: "cards-grid-01" })` is still supported. Parameter defaults are derived to reproduce the legacy layout, so Step 0 golden snapshots do not need to be rewritten merely to enable Step 2.

The compiler additionally accepts a candidate object:

```js
Core.Composer.compileSlide({
  content,
  template: {
    templateId: 'cards-grid-01',
    params: { columns: 3, emphasisIndex: 1 }
  },
  theme: 'aurora'
});
```

`params` may also be supplied as a top-level compile option. Invalid values fall back to manifest/content-derived defaults and produce warnings; `strictParams: true` rejects invalid values.

## Manifest contract

Parameterized manifests declare `parametricFamily` and a pure-data `paramSchema`. Schemas use integer, number, enum, or boolean rules with defaults and optional min/max or enum values. `itemCount` is read-only and derived from `SlideContent.items`.

Step 2 uses the parameter vocabulary only where it has layout meaning: `itemCount`, `columns`, `emphasisIndex`, `alignment`, `direction`, `density`, `mediaRatio`, `titleMode`, and `visualWeight`.

## Migrated families

16 existing template IDs across 8 families are parameterized:

- statement: `statement-panel-01`, `statement-split-01`
- cards: `cards-grid-01`, `cards-list-01`
- compare: `compare-split-01`, `compare-table-01`
- process: `process-line-01`, `process-steps-01`
- metrics: `metrics-cards-01`, `metrics-hero-01`
- timeline: `timeline-line-01`, `timeline-vertical-01`
- image: `image-left-01`, `image-right-01`
- conclusion: `conclusion-actions-01`, `conclusion-summary-01`

Cover, section, trend, and quote templates remain non-parametric in this step rather than carrying meaningless parameters.

## Matcher and Allocator

`recommendTemplates()` / `matchTemplates()` now return `Template + Params`: each candidate includes its legacy `templateId` plus normalized `params` and optional `parametricFamily`. For example, three card items derive `columns: 3`.

The Allocator still owns full-deck diversity and continues to score template/family reuse exactly as before. It carries the selected params through the assignment but does not invent or recompute layout parameters.

## Runtime ownership

Only `src/runtime/modules/composer/compiler.js` converts parameters into native elements. `Editor`, `Presentation`, and `Portable` consume the resulting MindDeck Project / `slideElements`; they do not recalculate parametric layout.
