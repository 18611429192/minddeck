# V10 Step 4 — Native Table + Diagram

MindDeck V10 Step 4 adds `element.type = "table"` and `element.type = "diagram"` to the existing MindDeck Project element model. It does not introduce a second Project model, Composer, Editor renderer, Presentation renderer, or Portable runtime.

The path remains:

`DeckSpec / SlideContent → Core.Composer → MindDeck Project.slideElements → Slide → Element → Editor / Presentation / Portable`

## Table project contract

```json
{
  "id": "table_example",
  "type": "table",
  "x": 112,
  "y": 292,
  "w": 1280,
  "h": 470,
  "z": 1003,
  "columns": [
    {"id": "metric", "label": "指标", "width": 2, "align": "left"},
    {"id": "value", "label": "结果", "width": 1, "align": "right"}
  ],
  "header": {
    "visible": true,
    "height": 56,
    "cells": [
      {"text": "指标", "align": "left"},
      {"text": "结果", "align": "right"}
    ]
  },
  "rows": [
    {
      "id": "row-1",
      "height": 72,
      "cells": [
        {"text": "可用性", "align": "left"},
        {"text": "99.99%", "align": "right"}
      ]
    }
  ],
  "style": {},
  "animation": {"type": "inherit", "delay": 0.08, "duration": 0.55}
}
```

Table supports pure-JSON columns, header, body rows, per-column/per-cell alignment, column width weights, row heights, border/background treatment, move/resize, save/load, and generic editor operations.

## Diagram project contract

```json
{
  "id": "diagram_example",
  "type": "diagram",
  "x": 112,
  "y": 292,
  "w": 1280,
  "h": 470,
  "z": 1003,
  "subtype": "swot",
  "data": {
    "title": "产品 SWOT",
    "centerLabel": "",
    "items": [
      {"id": "item-1", "label": "优势", "detail": "统一 Runtime", "value": "", "group": "", "level": 0}
    ]
  },
  "layout": {"direction": "horizontal", "gap": 24, "columns": 2},
  "style": {},
  "animation": {"type": "inherit", "delay": 0.08, "duration": 0.55}
}
```

Supported subtypes in Step 4:

- `matrix`
- `pyramid`
- `cycle`
- `funnel`
- `roadmap`
- `swot`
- `pest`
- `porter`

`swot`, `pest`, and `porter` are semantic presets of the same Diagram Element. They share the same Project schema, normalization, renderer installation, editing behavior, Presentation path, and Portable path.

## Runtime ownership

Implementation lives in the existing runtime source graph:

- `src/runtime/modules/structured-data.js` — Table/Diagram schema, normalize, validation, Theme V2 style resolution
- `src/runtime/modules/structured-elements.js` — native Table DOM renderer, shared Diagram SVG renderer, installation into existing `Project.normalizeElement` / `Element.create`
- `src/runtime/modules/composer/structured.js` — SlideContent/DeckSpec binding, compile/relayout/retheme preservation, quality integration

`PresentationView` and `Portable` remain unchanged and continue to use `Slide.render()` and `Element.create()`.

## Composer binding

`Core.Composer.normalizeSlideContent()` and `normalizeDeckSpec()` preserve explicit `content.table` and `content.diagram` data. During compilation, the selected template still supplies the page header and provenance; the rich body is replaced by one native Table or Diagram element.

A single slide body may contain only one of `chart`, `table`, or `diagram`. The Composer rejects conflicting rich bodies instead of silently stacking competing renderers.

## Theme V2

Table consumes the existing `tableStyle` token group, including `variant`, `header`, and `rowDividers`.

Diagram consumes the existing `diagramStyle` token group, including `variant`, `connector`, and `node`.

These are resolved together with the shared palette, typography, radius, surface, border and semantic colors. No separate theme registry is introduced.

## Editor / Presentation / Portable

Table and Diagram remain ordinary Project elements, so generic editor behavior continues to provide:

- select
- move
- resize
- copy
- delete
- undo / redo checkpoints
- save / reload
- Presentation
- Portable export

Step 4 intentionally does not add a dedicated Table/Diagram inspector; the later Slide Inspector step can expose subtype/content/style editing without changing the runtime model.

## Regression strategy

The frozen Step 0 Golden baseline is not changed. Step 4 adds `examples/v10-table-diagram-golden/table-diagram.deck.json` and `tests/golden/table-diagram.snapshot.json` plus `tests/table-diagram.test.mjs` for schema, JSON serialization, normalization, native rendering, all eight Diagram subtypes, Composer, Theme V2, generic editing contracts, Portable preservation, deterministic output and project quality.
