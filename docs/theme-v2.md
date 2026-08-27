# V10 Step 1 — Theme V2

Theme V2 upgrades MindDeck deck themes from palette-only presets into serializable visual-language manifests. The architecture remains unchanged: DeckSpec enters `Core.Composer`, the compiler produces native `slideElements`, and Editor / Presentation / Portable continue to use the shared runtime.

## Compatibility

The V9.9 theme ids remain unchanged: `aurora`, `cobalt`, `forest`, `ember`, `plum`, `slate`, `sand`, `ink`, `ocean`, `mint`, `rose`, and `mono`. Legacy top-level palette fields (`bg`, `surface`, `surface2`, `text`, `muted`, `accent`, `accent2`, `line`, `danger`, `success`) remain available, so existing projects and UI code keep working.

Unknown string ids fall back to `aurora` by default. `ThemeRegistry.resolve(input, fallback)` can select another registered fallback. `ThemeRegistry.normalize(input, fallback)` normalizes a registered id or a partial pure-data override without allowing functions or DOM-like nodes into the normalized manifest.

## Theme V2 manifest

Every registered manifest has `schemaVersion: 2` and pure-data fields for:

- `colors`
- `typography`
- `spacing`
- `radius`
- `border`
- `shadow`
- `titleTreatment`
- `subtitleTreatment`
- `numberTreatment`
- `cardTreatment`
- `imageTreatment`
- `decoration`
- reserved `chartStyle`, `diagramStyle`, and `tableStyle`

The manifest contains no renderer, HTML, DOM nodes, or executable functions and is JSON serializable.

## Runtime consumption

`src/runtime/modules/composer/compiler.js` remains the only slide compiler. After the existing template structure is produced, `applyThemeVisualLanguage()` applies Theme V2 intent to the native elements. It changes typography hierarchy, number emphasis, line-height rhythm, card radius/borders/shadows, image fit/radius/borders/shadows, and decorative accent treatment.

`src/runtime/modules/slide.js` remains the only element renderer. It now renders the additional native style data (`fontFamily`, `letterSpacing`, `lineHeight`, `opacity`, `shadow`, and image/video border radius/border) used by Theme V2. Portable presentation inherits the same renderer through the shared runtime; there is no portable-specific theme implementation.

Reserved chart/diagram/table tokens are data contracts only in Step 1. They are intentionally not a second rendering system and will be consumed by future native element capabilities in their corresponding V10 steps.
