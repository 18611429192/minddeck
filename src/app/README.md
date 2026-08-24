# MindDeck V9.7 application layer

This directory contains the modular application-layer source for the editor shell. The release build still emits a standalone `index.html`: source modules are concatenated/embedded at build time so the published artifact has no runtime dependency on external JS/CSS files.

V9.7 keeps `src/runtime/shared-core.js` as the single business/runtime implementation and moves host concerns into explicit modules under `src/app`.
