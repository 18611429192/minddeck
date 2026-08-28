# Editable PPTX Export

## Architecture

```text
MindDeck Project -> PptxExporter -> .pptx
```

The exporter consumes the final Project only. It deliberately does not import DeckSpec, call `compileDeck`, select templates, match content or allocate layouts. Manual Editor changes therefore remain the source of truth for export.

## Library

- Package: `pptxgenjs ^4.0.1`
- License: MIT
- Purpose: create standards-compliant OOXML PowerPoint files with editable native objects.

## Mapping

| MindDeck | PowerPoint |
|---|---|
| text | editable text box |
| shape | editable native shape |
| image | image relationship/media |
| table | native editable table |
| bar | native chart |
| line | native chart |
| area | native chart |
| donut | native chart |
| other chart | warning + editable-shape fallback preserving labels/values |
| diagram | editable shapes + text |
| video | editable placeholder with source reference |
| unknown element | warning; never silently discarded |

The exporter preserves final canvas-relative x/y/w/h, rotation where present, source z order, font family/size/weight/color, fills, borders, opacity approximations, text alignment and background where the target OOXML/library supports the concept.

## Geometry

MindDeck uses a 1600 × 900 logical canvas. Export uses a 13.333333 × 7.5 inch 16:9 layout with 120 logical pixels per inch.

## Runtime note

The module is directly usable in Node/bundled ESM environments where `pptxgenjs` is resolvable. Vanilla browser hosts must provide/bundle the PptxGenJS browser build before invoking export. The rest of MindDeck remains usable without invoking PPTX export.

## Validation

`tests/pptx-exporter.test.mjs` generates an in-memory PPTX and verifies the ZIP signature, presentation/slide XML, slide count, text/table content, image relationship/media, chart parts and shape XML. This is more than a file-exists smoke test.
