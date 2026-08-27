# MindDeck V10 Roadmap

## Purpose

V10 absorbs useful product ideas from DashiPPT without copying its source code, template assets, or architecture. The V9.9 Composer behavior is frozen as the starting point. V10 evolves capabilities around the existing shared runtime rather than creating parallel presentation models.

Target flow:

```text
SourceDocument / Prompt / Markdown
        ↓
Story Planner / AI
        ↓
DeckPlan
        ↓
DeckSpec
        ↓
Core.Composer
        ↓
MindDeck Project / slideElements
        ↓
Editor / Presentation / Portable
        ↓
optional PPTX Exporter
```

The invariant runtime boundary remains:

```text
Core.Composer
    ↓
MindDeck Project / slideElements
    ↓
Editor / Presentation / Portable
```

## Architecture boundaries

V10 must not introduce a second Composer, a second Runtime, or a second Project schema. UI code must not implement its own Matcher, Compiler, or Allocator. AI may produce planning/specification data, but it must not directly emit DOM nodes or `slideElements`. A future PPTX exporter must consume the native MindDeck Project and must not maintain an independent page model.

Golden data is test evidence only. The canonical snapshots under `tests/golden/` are stable projections of the native Project; they are not a new Project model and are never consumed by Editor, Presentation, Portable, or Composer at runtime.

## Step 0 — Golden Baseline / Regression Baseline

Status target: establish the frozen V9.9 behavior as the V10 starting line.

Deliverables:

- 8–12 representative DeckSpec samples covering all 12 V9.9 page roles.
- Machine-verifiable template assignments, template families, stable Project fields, slide-element summaries, Quality results, and stable Composer provenance metadata.
- Canonical normalization that excludes non-semantic random IDs and other unstable bytes.
- Automated deterministic golden regression integrated into `release:check`.
- No changes to Composer matching, allocation, compilation, templates, or default output behavior.

## Step 1 — Theme V2 / Visual Language

Create a richer visual-language system around the existing theme registry: typography scale, spacing rhythm, surfaces, accents, semantic tokens, and presentation-level consistency. Theme changes must continue to flow through `Core.Composer` and native `slideElements`.

## Step 2 — Parametric SlideTemplate / Template Family

Evolve the existing SlideTemplate registry from fixed variants toward bounded parameters and template-family policies. Parameters must remain compiler inputs, not a second rendering model. Capacity, Matcher, Allocator, Compiler, and provenance stay behind `Core.Composer`.

## Step 3 — Native Chart Element

Add chart semantics as a native MindDeck element capability with editor/presentation/portable support. Composer may choose and configure chart elements, but chart data must remain part of the native Project rather than a parallel chart-page schema.

## Step 4 — Table + Diagram

Introduce native table and diagram capabilities with editing, rendering, export, validation, and layout rules. They must participate in the same Project/slideElements lifecycle and Quality validation.

## Step 5 — Professional Template Library / Role Expansion

Expand professional template families and, where justified by real content semantics, page roles. New roles must be registered centrally and must use the existing capacity/matching/allocation/compiler pipeline.

## Step 6 — Slide Inspector / Design Intent

Expose the design intent already produced by Composer: role, selected template, alternatives, capacity facts, provenance, quality findings, and future template parameters. The inspector is a view/controller over `Core.Composer`; it must not become an independent composition engine.

## Step 7 — SourceDocument / DeckPlan

Add upstream planning contracts. `SourceDocument` represents normalized source material. `DeckPlan` represents narrative structure and intent before DeckSpec compilation. Neither is a replacement for MindDeck Project; both terminate at DeckSpec and then enter `Core.Composer`.

## Step 8 — AI Story Planner

Add an optional AI planning layer that converts SourceDocument/prompt context into DeckPlan and DeckSpec. AI output must be validated structured data. AI must not directly generate DOM, editor state, or `slideElements`.

## Step 9 — Editable PPTX Exporter

Add an optional exporter that translates the native MindDeck Project into editable PPTX objects where practical. The exporter is downstream-only and may not maintain a separate presentation/page model or bypass Composer.

## Step 10 — V10 Final Regression / Release

Run the complete V10 regression matrix across Composer, Project compatibility, Editor, Presentation, Portable, optional PPTX export, performance, recovery, architecture gates, and browser E2E. Update golden baselines only through explicit review of intentional behavior changes.

## Versioning and baseline policy

- `9.9.0` remains the frozen behavioral source for Step 0.
- Step 0 records behavior; it does not tune behavior.
- Later V10 steps may intentionally change snapshots only when the corresponding feature change is reviewed and documented.
- A changed golden snapshot is evidence of a behavior change, not an automatic fix.
- Completing an individual step does not imply the entire V10 roadmap is complete.
