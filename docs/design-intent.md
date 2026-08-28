# V10 Step 6 — Slide Inspector / Design Intent

## Scope

Step 6 adds a user-facing design intent layer to the existing single composition path:

`Slide Inspector -> Core.Composer DesignIntent -> Matcher -> Template + Params -> Compiler -> Project`

The Editor does not choose templates, calculate layout coordinates, or own matcher logic. The existing Template Picker remains available as a compatibility path.

## DesignIntent v1

DesignIntent is sparse: only fields explicitly chosen by the user are stored. Missing fields mean “automatic” and preserve the existing matcher defaults.

| Field | Type | Values / range | Meaning |
| --- | --- | --- | --- |
| `columns` | integer | 1–4 | Preferred content columns |
| `emphasisIndex` | integer | -1–11, also bounded by item count | Preferred emphasized item; -1 = automatic |
| `density` | enum | compact / standard / rich | Information density |
| `mediaRatio` | number | 0.30–0.70 | Media share on image/content slides |
| `alignment` | enum | left / center / right | Primary content alignment |
| `direction` | enum | horizontal / vertical / left / right | Structural direction |
| `titleWeight` | enum | quiet / balanced / strong | Title visual prominence |
| `visualWeight` | number | 0.80–1.20 | Overall visual weight |
| `contentBalance` | enum | text / balanced / visual | Text-vs-visual preference |
| `imageFocus` | enum | context / balanced / hero | Image importance |

Public protocol operations are `normalize`, `validate`, and `serialize`. Serialization uses stable field order and contains no runtime/UI state.

## Matcher and params

When DesignIntent is absent, Step 5 matching behavior is unchanged. When intent is present, the existing Matcher receives additional ranking signals and produces the normal `Template + Params` candidate. Directly supported template params are mapped through the existing Parametric Template validation path. Semantic preferences such as `contentBalance` and `imageFocus` are ranking signals; they do not create another layout engine.

The selected resolution is recorded under `node.composer.intentResolution` with the matcher identity, selected template, resolved params, and candidate count. The sparse user protocol is stored at `node.composer.designIntent`.

## Slide Inspector

The Editor adds a `设计意图` entry for slide editing. Controls are generated from the current role, content, and compatible template capabilities, so image controls are not shown on cards pages and item emphasis is not shown when no items exist.

The Inspector only calls Composer APIs. The existing `页面方案 A / B / C` Template Picker is retained and can still be opened from the Inspector.

## Dirty / provenance

`Core.Composer.applyDesignIntent()` rejects dirty slides with `COMPOSER_DIRTY` unless the caller explicitly passes `force: true`. The Inspector asks for explicit confirmation before force-recompiling a manually edited slide. Cancelling leaves `slideElements` untouched.

`Provenance.attach()` preserves DesignIntent metadata when a compatible template operation rebuilds generated elements, while slides without DesignIntent keep the previous metadata shape for Golden compatibility.

## Undo / redo and persistence

The Inspector calls the existing application `checkpoint()` immediately before a successful Composer mutation. It does not keep its own history. Existing project-level Undo/Redo therefore restores DesignIntent, selected template/params, and slide elements together.

DesignIntent is normal `node.composer` data, so existing save, JSON/.minddeck persistence, recovery, presentation, and portable export all use the same Project without a second model.

## Tests

Step 6 adds runtime coverage for protocol normalization/validation/serialization, capabilities, columns, emphasis, density, media ratio, matcher resolution, recompilation, dirty protection, and JSON reload. Playwright coverage exercises the real Inspector for columns, emphasis, density, media ratio, matcher metadata, Undo/Redo, reload, and dirty-confirm cancellation.

Existing Step 0 Golden and Step 5 template-library tests remain unchanged. GitHub workflow files are outside this step and are not modified.
