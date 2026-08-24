# MindDeck V9.7 application source

V9.7 separates **source organization** from **release shape**.

- `shell.html` owns static HTML structure and build slots.
- `app.manifest.json` defines ordered JS/CSS source fragments.
- `modules/` contains editor/map/presentation/export host logic.
- `styles/` contains UI styles split by responsibility.
- `../runtime/shared-core.js` remains the single business/runtime implementation.

The fragments deliberately compile into one browser closure so the refactor does not change runtime behavior. `npm run build` embeds all app CSS, shared CSS, shared runtime and app modules back into the repository-root `index.html`. The release artifact has **no external JS/CSS dependency** and can still be opened directly as one file.
