# V10 Release Checklist

## Version / architecture

- [x] package version set to `10.0.0`
- [x] README identifies V10.0.0
- [x] generated UI/runtime version derives from `package.json`
- [x] one Core.Composer / one Project / one Shared Runtime architecture retained
- [x] SourceDocument / DeckPlan added before Composer
- [x] AI remains a Planner implementation
- [x] PPTX accepts Project only
- [x] `.github/workflows/` unchanged

## Release-check coverage

`npm run release:check` now includes Step 7 source/planner tests, Step 8 mock AI tests, Step 9 PPTX tests, Step 10 final quality/golden/performance tests and the V10 architecture audit in addition to the existing regression suite.

## Commands required for an independent release acceptance

```bash
npm install
npm run release:check
npm run e2e
```

The implementation session that created this checklist could not execute those repository commands because its local execution environment could not resolve/download `github.com` and did not have a checked-out repository/dependencies. Therefore this document does **not** mark runtime test execution as passed. Independent acceptance must execute the commands above in a normal Node environment.

## Real AI provider

No real API key is committed or required for automated tests. Real-provider integration is optional and must be recorded separately; mock-provider coverage is the release gate.

## PPTX limitation review

- native charts: bar / line / area / donut;
- other chart types: editable-shape fallback;
- diagrams: shapes + text, not SmartArt;
- video: explicit placeholder fallback;
- vanilla-browser PPTX invocation requires the PptxGenJS browser build to be provided/bundled.

V10 is not considered frozen by this checklist; freeze/PASS is an independent acceptance decision.
