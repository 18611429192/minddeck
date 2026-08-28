# V10 Regression Matrix

| Area | Coverage |
|---|---|
| Golden baseline | existing V10 golden suite remains in release check |
| Theme V2 | existing theme contract + golden coverage |
| Parametric templates | existing parametric tests |
| Chart | existing native chart tests + PPTX native-chart part validation |
| Table / Diagram | existing structured tests + PPTX mapping validation |
| Professional templates | existing template-library tests |
| DesignIntent | existing unit + browser tests; unit suite remains in release check |
| SourceDocument | text / Markdown / JSON normalize + validation + deterministic repeatability |
| Deterministic Planner | targetSlides, long source merge, DeckPlan -> DeckSpec -> Composer |
| AI Planner | mock valid JSON, malformed JSON retry, schema reject, failure/timeout fallback, key redaction |
| V10 golden | stable SourceDocument/DeckPlan role/title snapshot |
| Full-deck quality | representative 15-page compile, role/family diversity, finite element geometry |
| Performance smoke | 25-page SourceDocument -> Planner -> DeckSpec -> Composer bounded smoke check |
| PPTX | OOXML ZIP, slides, text, table text, image rel/media, shape XML, chart part |
| Architecture | legacy architecture audit + V10 Source/Planner/AI/PPTX red-line audit |
| Portable | existing portable contract and shared-runtime tests |
| Browser E2E | `npm run e2e` when Playwright browser is available |

Snapshot updates are not performed automatically. Any future snapshot change must be classified as expected change or regression before committing it.
