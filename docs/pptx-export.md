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
| image | image relationship/media; `fit=contain/cover` maps to PptxGenJS sizing |
| image `crop:{x,y,w,h}` | editable image with crop sizing; crop coordinates use MindDeck logical pixels and are converted at 120 px/in |
| master `bgImage` + `bgFit` | full-slide image behind master/page elements; `contain/cover` is preserved |
| table | native editable table |
| bar | native chart |
| line | native chart |
| area | native chart |
| donut | native chart |
| other chart | warning + editable-shape fallback preserving labels/values |
| diagram | editable shapes + text; matrix/SWOT/PEST/roadmap/cycle/pyramid/funnel/porter use subtype-aware geometry |
| video | editable placeholder with source reference |
| unknown element | warning; never silently discarded |

The exporter preserves final canvas-relative x/y/w/h, rotation where present, source z order, font family/size/weight/color, fills, borders, opacity approximations, text alignment and background where the target OOXML/library supports the concept.

## Image fidelity contract

MindDeck uses browser-style `fit` values `contain` and `cover`. PPTX export maps both to PptxGenJS image sizing rather than stretching the bitmap to the element rectangle. `cover` therefore remains a center-cropped image instead of a distorted image.

For an explicit image crop, the supported Project contract is:

```json
{
  "type": "image",
  "x": 120,
  "y": 120,
  "w": 480,
  "h": 240,
  "crop": { "x": 24, "y": 12, "w": 240, "h": 120 }
}
```

All crop coordinates are MindDeck logical pixels and are converted to inches with the same 120 px/in scale as normal geometry. Incomplete/non-finite crop objects are ignored and normal `fit` behavior is used.

A master background image is exported as the first full-slide image on every slide. This intentionally keeps the background bitmap editable in PowerPoint while preserving the visual z-order used by MindDeck.

## Diagram fidelity contract

PPTX diagrams remain editable PowerPoint shapes. The exporter now uses normalized diagram subtype/layout data instead of forcing every diagram into a four-column grid:

- `matrix`: honors `layout.columns`.
- `swot` / `pest`: 2-column quadrant layout.
- `roadmap`: horizontal or vertical sequence according to `layout.direction`.
- `cycle`: radial node layout with editable connectors.
- `pyramid` / `funnel`: centered tier geometry.
- `porter`: radial forces around an editable center node.

The export is intentionally a semantic/editable approximation of the browser SVG renderer; exact SVG path identity is not part of the PPTX contract.

## Geometry

MindDeck uses a 1600 × 900 logical canvas. Export uses a 13.333333 × 7.5 inch 16:9 layout with 120 logical pixels per inch.

## Runtime note

The module is directly usable in Node/bundled ESM environments where `pptxgenjs` is resolvable. Vanilla browser hosts must provide/bundle the PptxGenJS browser build before invoking export. The rest of MindDeck remains usable without invoking PPTX export.

## Validation

`tests/pptx-exporter.test.mjs` generates an in-memory PPTX and verifies the ZIP signature, presentation/slide XML, slide count, text/table content, image relationship/media, background-image OOXML, crop/cover OOXML, chart parts and shape XML. A fake PptxGenJS adapter additionally verifies exact bgImage/fit/crop arguments and diagram grid geometry without relying on PowerPoint rendering.
