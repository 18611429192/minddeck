# V10 Architecture

## Canonical pipeline

```text
SourceDocument
  -> Planner / AI Story Planner
  -> DeckPlan
  -> DeckSpec
  -> Core.Composer
  -> MindDeck Project / slideElements
  -> Shared Runtime
       -> Editor
       -> Presentation
       -> Portable
       -> PptxExporter
```

## Ownership boundaries

- `SourceDocument` owns source normalization only. It contains no DOM, functions or slide elements.
- `Planner` owns narrative planning. It may infer roles/content intents but never layout geometry.
- `AIStoryPlanner` is an optional Planner implementation. It returns a validated DeckPlan or falls back to the deterministic Planner.
- `DeckPlan -> DeckSpec` is the only bridge into composition.
- `Core.Composer` remains the only matcher / allocator / compiler path and the only component that creates the generated Project slide content.
- `MindDeck Project` remains the single editable business model consumed by all output modes.
- `PptxExporter` maps final Project elements to OOXML/PowerPoint objects. It does not read DeckSpec or choose templates.

## Red lines

The V10 architecture audit rejects Planner imports of the Project model, AI imports of Composer/Project, and PPTX references to DeckSpec/compileDeck/matcher/allocator/compiler. Existing architecture checks continue to reject duplicated Composer/Renderer/PresentationView/Portable implementations and UI-side composition algorithms.

## Version

Stable package version is `10.0.0`. `scripts/build-single-html.mjs` derives the visible UI/runtime version from `package.json`, so generated UI version, package version and README release version have one source of truth.
